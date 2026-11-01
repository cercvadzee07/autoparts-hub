import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { brand } from "@/config/brand";
import { productSlug } from "@/lib/utils";
import {
  DomainError,
  type ActivityItem,
  type Category,
  type Compatibility,
  type DashboardStats,
  type InventoryEvent,
  type Order,
  type OrderStatus,
  type PlaceOrderInput,
  type Product,
  type ProductFilters,
  type ProductImage,
  type ProductInput,
  type ProductStatus,
  type Store,
  type UploadedFile,
  type VehicleGeneration,
  type VehicleMake,
  type VinRequest,
  type VinRequestInput,
  type VinStatus,
} from "@/lib/types";
import { extensionFor } from "@/lib/files";
import type { Actor, Repository } from "./repository";
import {
  canTransition,
  normalizeQuery,
  pageParams,
  paginate,
  PUBLIC_STATUSES,
  VISIBLE_STATUSES,
} from "./shared";
import {
  SEED_CATEGORIES,
  SEED_GENERATIONS,
  SEED_MAKES,
  SEED_MODELS,
  SEED_PRODUCTS,
  SEED_STORE,
} from "./seed";

/**
 * Local development database: a single JSON file in `.data/`.
 * Not for production — it does not survive serverless deploys.
 */

type ProductRow = Omit<Product, "category" | "compatibility"> & {
  compatibility: { generationId: string; yearFrom: number; yearTo: number }[];
};
type VinRow = Omit<VinRequest, "imageUrl"> & { imagePath: string | null };

interface DemoDB {
  version: 1;
  orderSeq: number;
  inventorySeq: number;
  stores: Store[];
  categories: Category[];
  makes: { id: string; slug: string; name: string }[];
  models: { id: string; makeId: string; slug: string; name: string }[];
  generations: VehicleGeneration[];
  products: ProductRow[];
  customers: { id: string; storeId: string; name: string; phone: string; address: string; createdAt: string }[];
  orders: Order[];
  vinRequests: VinRow[];
  inventoryHistory: (InventoryEvent & { storeId: string; label: string })[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "demo-db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function seedDB(): DemoDB {
  return {
    version: 1,
    orderSeq: 1000,
    inventorySeq: SEED_PRODUCTS.length,
    stores: [SEED_STORE],
    categories: SEED_CATEGORIES,
    makes: SEED_MAKES,
    models: SEED_MODELS,
    generations: SEED_GENERATIONS,
    products: SEED_PRODUCTS.map((p) => ({
      id: p.id,
      storeId: p.storeId,
      inventoryCode: p.inventoryCode,
      slug: p.slug,
      title: p.title,
      description: p.description,
      categoryId: p.categoryId,
      condition: p.condition,
      status: p.status,
      price: p.price,
      quantity: p.quantity,
      oemNumber: p.oemNumber,
      featured: p.featured,
      images: [{ id: `${p.id}-img`, url: p.image, path: null, sortOrder: 0 }],
      compatibility: p.compatibility,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    })),
    customers: [],
    orders: [],
    vinRequests: [],
    inventoryHistory: [],
  };
}

// Kept on globalThis so dev-server hot reloads share one instance.
const g = globalThis as unknown as { __demoDb?: Promise<DemoDB>; __demoLock?: Promise<unknown> };

function load(): Promise<DemoDB> {
  // Memoize the promise so concurrent first requests share a single load.
  g.__demoDb ??= (async () => {
    try {
      return JSON.parse(await fs.readFile(DB_FILE, "utf8")) as DemoDB;
    } catch {
      const db = seedDB();
      await persist(db);
      return db;
    }
  })();
  return g.__demoDb;
}

async function persist(db: DemoDB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Serializes writes so concurrent requests cannot interleave. */
async function mutate<T>(fn: (db: DemoDB) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  };
  const next = (g.__demoLock ?? Promise.resolve()).then(run, run);
  g.__demoLock = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();

function hydrate(db: DemoDB, row: ProductRow): Product {
  const compatibility: Compatibility[] = row.compatibility.flatMap((c) => {
    const gen = db.generations.find((x) => x.id === c.generationId);
    const model = gen && db.models.find((m) => m.id === gen.modelId);
    const make = model && db.makes.find((m) => m.id === model.makeId);
    if (!gen || !model || !make) return [];
    return [
      {
        ...c,
        makeName: make.name,
        modelName: model.name,
        modelSlug: model.slug,
        generationName: gen.name,
        generationCode: gen.code,
        generationSlug: gen.slug,
      },
    ];
  });
  return {
    ...row,
    images: [...row.images].sort((a, b) => a.sortOrder - b.sortOrder),
    category: db.categories.find((c) => c.id === row.categoryId) ?? null,
    compatibility,
  };
}

function matches(db: DemoDB, p: ProductRow, f: ProductFilters): boolean {
  const statuses = f.statuses ?? PUBLIC_STATUSES;
  if (!statuses.includes(p.status)) return false;
  if (f.storeId && p.storeId !== f.storeId) return false;
  if (f.featured && !p.featured) return false;
  if (f.condition && p.condition !== f.condition) return false;
  if (f.minPrice != null && p.price < f.minPrice) return false;
  if (f.maxPrice != null && p.price > f.maxPrice) return false;
  if (f.category) {
    const c = db.categories.find((x) => x.slug === f.category);
    if (!c || p.categoryId !== c.id) return false;
  }
  if (f.model || f.generation || f.year) {
    const ok = p.compatibility.some((c) => {
      const gen = db.generations.find((x) => x.id === c.generationId);
      if (!gen) return false;
      if (f.generation && gen.slug !== f.generation) return false;
      if (f.model) {
        const model = db.models.find((m) => m.id === gen.modelId);
        if (model?.slug !== f.model) return false;
      }
      if (f.year && (f.year < c.yearFrom || f.year > c.yearTo)) return false;
      return true;
    });
    if (!ok) return false;
  }
  const q = normalizeQuery(f.q);
  if (q) {
    const hay = [p.title.ka, p.title.en, p.title.ru, p.oemNumber ?? "", p.inventoryCode]
      .join(" ")
      .toLowerCase();
    if (!q.split(/\s+/).every((token) => hay.includes(token))) return false;
  }
  return true;
}

function addHistory(
  db: DemoDB,
  product: ProductRow,
  action: string,
  actor: Actor | null,
  note: string | null = null,
) {
  db.inventoryHistory.push({
    id: randomUUID(),
    productId: product.id,
    storeId: product.storeId,
    label: product.title.ka,
    action,
    note,
    author: actor?.name ?? null,
    createdAt: now(),
  });
}

async function saveUpload(folder: string, file: UploadedFile): Promise<string> {
  const rel = `${folder}/${randomUUID()}.${extensionFor(file.type)}`;
  const abs = path.join(UPLOAD_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, file.bytes);
  return rel;
}

const uploadUrl = (rel: string) => `/api/uploads/${rel}`;

export class DemoRepository implements Repository {
  readonly mode = "demo" as const;

  async getDefaultStore() {
    return (await load()).stores[0];
  }

  async getCategories() {
    return [...(await load()).categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getVehicleTree(): Promise<VehicleMake[]> {
    const db = await load();
    return db.makes.map((make) => ({
      ...make,
      models: db.models
        .filter((m) => m.makeId === make.id)
        .map((m) => ({
          ...m,
          generations: db.generations
            .filter((x) => x.modelId === m.id)
            .sort((a, b) => b.yearFrom - a.yearFrom),
        })),
    }));
  }

  async searchProducts(filters: ProductFilters) {
    const db = await load();
    const { page, pageSize, offset } = pageParams(filters);
    const rows = db.products.filter((p) => matches(db, p, filters));
    const sort = filters.sort ?? "newest";
    rows.sort((a, b) =>
      sort === "price_asc"
        ? a.price - b.price
        : sort === "price_desc"
          ? b.price - a.price
          : b.createdAt.localeCompare(a.createdAt),
    );
    const items = rows.slice(offset, offset + pageSize).map((r) => hydrate(db, r));
    return paginate(items, rows.length, page, pageSize);
  }

  async getProductBySlug(slug: string) {
    const db = await load();
    const row = db.products.find((p) => p.slug === slug && VISIBLE_STATUSES.includes(p.status));
    return row ? hydrate(db, row) : null;
  }

  async getProductsByIds(ids: string[]) {
    const db = await load();
    return db.products
      .filter((p) => ids.includes(p.id) && VISIBLE_STATUSES.includes(p.status))
      .map((r) => hydrate(db, r));
  }

  async getRelatedProducts(product: Product, limit: number) {
    const db = await load();
    const gens = new Set(product.compatibility.map((c) => c.generationId));
    const score = (p: ProductRow) =>
      (p.compatibility.some((c) => gens.has(c.generationId)) ? 2 : 0) +
      (p.categoryId === product.categoryId ? 1 : 0);
    return db.products
      .filter((p) => p.id !== product.id && p.status === "available" && score(p) > 0)
      .sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((r) => hydrate(db, r));
  }

  async getSitemapEntries() {
    const db = await load();
    return db.products
      .filter((p) => VISIBLE_STATUSES.includes(p.status))
      .map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
  }

  async getCategoryCounts() {
    const db = await load();
    const counts: Record<string, number> = {};
    for (const p of db.products) {
      if (p.status !== "available") continue;
      const slug = db.categories.find((c) => c.id === p.categoryId)?.slug;
      if (slug) counts[slug] = (counts[slug] ?? 0) + 1;
    }
    return counts;
  }

  async placeOrder(input: PlaceOrderInput) {
    return mutate((db) => {
      if (input.items.length === 0) throw new DomainError("EMPTY_ORDER");
      const lines = input.items.map((item) => {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product || product.status !== "available") {
          throw new DomainError("PRODUCT_UNAVAILABLE", item.productId);
        }
        if (product.quantity < item.quantity) throw new DomainError("INSUFFICIENT_STOCK", item.productId);
        return { product, quantity: item.quantity };
      });

      const byStore = new Map<string, typeof lines>();
      for (const line of lines) {
        byStore.set(line.product.storeId, [...(byStore.get(line.product.storeId) ?? []), line]);
      }

      const numbers: string[] = [];
      for (const [storeId, storeLines] of byStore) {
        let customer = db.customers.find((c) => c.storeId === storeId && c.phone === input.phone);
        if (!customer) {
          customer = { id: randomUUID(), storeId, name: input.customerName, phone: input.phone, address: input.address, createdAt: now() };
          db.customers.push(customer);
        } else {
          customer.name = input.customerName;
          customer.address = input.address;
        }
        db.orderSeq += 1;
        const orderNumber = `${brand.orderPrefix}-${db.orderSeq}`;
        const order: Order = {
          id: randomUUID(),
          orderNumber,
          storeId,
          customerId: customer.id,
          customerName: input.customerName,
          phone: input.phone,
          address: input.address,
          customerNotes: input.notes,
          locale: input.locale,
          status: "new",
          total: storeLines.reduce((s, l) => s + l.product.price * l.quantity, 0),
          items: storeLines.map((l) => ({
            id: randomUUID(),
            productId: l.product.id,
            productSlug: l.product.slug,
            title: l.product.title.ka,
            inventoryCode: l.product.inventoryCode,
            unitPrice: l.product.price,
            quantity: l.quantity,
          })),
          notes: [],
          history: [{ id: randomUUID(), fromStatus: null, toStatus: "new", note: null, author: null, createdAt: now() }],
          createdAt: now(),
          updatedAt: now(),
        };
        for (const l of storeLines) {
          l.product.quantity -= l.quantity;
          if (l.product.quantity <= 0) {
            l.product.quantity = 0;
            l.product.status = "reserved";
          }
          l.product.updatedAt = now();
          addHistory(db, l.product, "reserved_by_order", null, orderNumber);
        }
        db.orders.push(order);
        numbers.push(orderNumber);
      }
      return numbers;
    });
  }

  async createVinRequest(input: VinRequestInput, image: UploadedFile | null) {
    const imagePath = image ? await saveUpload("vin", image) : null;
    return mutate((db) => {
      const id = randomUUID();
      db.vinRequests.push({
        id,
        storeId: db.stores[0].id,
        ...input,
        imagePath,
        status: "new",
        adminNotes: null,
        createdAt: now(),
        updatedAt: now(),
      });
      return id;
    });
  }

  // ── Admin: products ─────────────────────────────────────────

  async getProductById(id: string) {
    const db = await load();
    const row = db.products.find((p) => p.id === id);
    return row ? hydrate(db, row) : null;
  }

  async saveProduct(storeId: string, input: ProductInput, actor: Actor) {
    return mutate((db) => {
      if (input.id) {
        const row = db.products.find((p) => p.id === input.id && p.storeId === storeId);
        if (!row) throw new DomainError("NOT_FOUND");
        const statusChanged = row.status !== input.status;
        const priceChanged = row.price !== input.price;
        Object.assign(row, {
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          condition: input.condition,
          status: input.status,
          price: input.price,
          quantity: input.quantity,
          oemNumber: input.oemNumber,
          featured: input.featured,
          compatibility: input.compatibility,
          updatedAt: now(),
        });
        addHistory(db, row, "product_updated", actor);
        if (statusChanged) addHistory(db, row, `status_${input.status}`, actor);
        if (priceChanged) addHistory(db, row, "price_changed", actor, String(input.price));
        return hydrate(db, row);
      }
      db.inventorySeq += 1;
      const inventoryCode = `${brand.inventoryPrefix}-${String(db.inventorySeq).padStart(5, "0")}`;
      const row: ProductRow = {
        id: randomUUID(),
        storeId,
        inventoryCode,
        slug: productSlug(input.title, inventoryCode),
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        condition: input.condition,
        status: input.status,
        price: input.price,
        quantity: input.quantity,
        oemNumber: input.oemNumber,
        featured: input.featured,
        images: [],
        compatibility: input.compatibility,
        createdAt: now(),
        updatedAt: now(),
      };
      db.products.push(row);
      addHistory(db, row, "product_created", actor);
      return hydrate(db, row);
    });
  }

  async deleteProduct(id: string, actor: Actor) {
    const removed = await mutate((db) => {
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx < 0) throw new DomainError("NOT_FOUND");
      const [row] = db.products.splice(idx, 1);
      addHistory(db, row, "product_deleted", actor);
      return row;
    });
    await Promise.all(
      removed.images.filter((i) => i.path).map((i) => fs.rm(path.join(UPLOAD_DIR, i.path!), { force: true })),
    );
  }

  async setProductStatus(id: string, status: ProductStatus, actor: Actor) {
    await mutate((db) => {
      const row = db.products.find((p) => p.id === id);
      if (!row) throw new DomainError("NOT_FOUND");
      row.status = status;
      if (status === "sold") row.quantity = 0;
      if (status === "available" && row.quantity === 0) row.quantity = 1;
      row.updatedAt = now();
      addHistory(db, row, `status_${status}`, actor);
    });
  }

  async addProductImages(productId: string, files: UploadedFile[]) {
    const db0 = await load();
    const row0 = db0.products.find((p) => p.id === productId);
    if (!row0) throw new DomainError("NOT_FOUND");
    const paths = await Promise.all(files.map((f) => saveUpload(`products/${row0.storeId}/${productId}`, f)));
    await mutate((db) => {
      const row = db.products.find((p) => p.id === productId);
      if (!row) throw new DomainError("NOT_FOUND");
      // Drop the seed placeholder once real photos exist.
      row.images = row.images.filter((i) => i.path !== null);
      const start = row.images.length;
      const added: ProductImage[] = paths.map((p, i) => ({
        id: randomUUID(),
        url: uploadUrl(p),
        path: p,
        sortOrder: start + i,
      }));
      row.images.push(...added);
      row.updatedAt = now();
    });
  }

  async removeProductImage(imageId: string) {
    const removed = await mutate((db) => {
      for (const p of db.products) {
        const idx = p.images.findIndex((i) => i.id === imageId);
        if (idx >= 0) {
          const [img] = p.images.splice(idx, 1);
          p.images.forEach((im, i) => (im.sortOrder = i));
          return img;
        }
      }
      throw new DomainError("NOT_FOUND");
    });
    if (removed.path) await fs.rm(path.join(UPLOAD_DIR, removed.path), { force: true });
  }

  async setCoverImage(imageId: string) {
    await mutate((db) => {
      const p = db.products.find((x) => x.images.some((i) => i.id === imageId));
      if (!p) throw new DomainError("NOT_FOUND");
      const img = p.images.find((i) => i.id === imageId)!;
      p.images = [img, ...p.images.filter((i) => i.id !== imageId)];
      p.images.forEach((im, i) => (im.sortOrder = i));
    });
  }

  async getInventoryHistory(productId: string) {
    const db = await load();
    return db.inventoryHistory
      .filter((h) => h.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ── Admin: orders ───────────────────────────────────────────

  async listOrders(storeId: string, opts: { status?: OrderStatus; q?: string; page?: number; pageSize?: number }) {
    const db = await load();
    const { page, pageSize, offset } = pageParams(opts);
    const q = normalizeQuery(opts.q);
    const rows = db.orders
      .filter((o) => o.storeId === storeId)
      .filter((o) => !opts.status || o.status === opts.status)
      .filter(
        (o) =>
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows.slice(offset, offset + pageSize), rows.length, page, pageSize);
  }

  async getOrder(id: string) {
    return (await load()).orders.find((o) => o.id === id) ?? null;
  }

  async updateOrderStatus(id: string, status: OrderStatus, note: string | null, actor: Actor) {
    await mutate((db) => {
      const order = db.orders.find((o) => o.id === id);
      if (!order) throw new DomainError("NOT_FOUND");
      if (!canTransition(order.status, status)) throw new DomainError("FORBIDDEN", "transition");
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product) continue;
        if (status === "cancelled") {
          product.quantity += item.quantity;
          if (product.status === "reserved") product.status = "available";
          addHistory(db, product, "released_by_order", actor, order.orderNumber);
        } else if (status === "completed" && product.quantity === 0) {
          product.status = "sold";
          addHistory(db, product, "sold_by_order", actor, order.orderNumber);
        }
        product.updatedAt = now();
      }
      order.history.push({
        id: randomUUID(),
        fromStatus: order.status,
        toStatus: status,
        note,
        author: actor.name,
        createdAt: now(),
      });
      order.status = status;
      order.updatedAt = now();
    });
  }

  async addOrderNote(id: string, body: string, actor: Actor) {
    await mutate((db) => {
      const order = db.orders.find((o) => o.id === id);
      if (!order) throw new DomainError("NOT_FOUND");
      order.notes.push({ id: randomUUID(), body, author: actor.name, createdAt: now() });
      order.updatedAt = now();
    });
  }

  // ── Admin: VIN requests ─────────────────────────────────────

  private vinOut(row: VinRow): VinRequest {
    const { imagePath, ...rest } = row;
    return { ...rest, imageUrl: imagePath ? uploadUrl(imagePath) : null };
  }

  async listVinRequests(storeId: string, opts: { status?: VinStatus; page?: number; pageSize?: number }) {
    const db = await load();
    const { page, pageSize, offset } = pageParams(opts);
    const rows = db.vinRequests
      .filter((v) => v.storeId === storeId && (!opts.status || v.status === opts.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows.slice(offset, offset + pageSize).map((r) => this.vinOut(r)), rows.length, page, pageSize);
  }

  async getVinRequest(id: string) {
    const row = (await load()).vinRequests.find((v) => v.id === id);
    return row ? this.vinOut(row) : null;
  }

  async updateVinRequest(id: string, patch: { status: VinStatus; adminNotes: string | null }) {
    await mutate((db) => {
      const row = db.vinRequests.find((v) => v.id === id);
      if (!row) throw new DomainError("NOT_FOUND");
      row.status = patch.status;
      row.adminNotes = patch.adminNotes;
      row.updatedAt = now();
    });
  }

  // ── Admin: dashboard ────────────────────────────────────────

  async getDashboardStats(storeId: string): Promise<DashboardStats> {
    const db = await load();
    const products = db.products.filter((p) => p.storeId === storeId);
    const orders = db.orders.filter((o) => o.storeId === storeId);
    return {
      totalProducts: products.filter((p) => p.status !== "archived").length,
      availableProducts: products.filter((p) => p.status === "available").length,
      soldProducts: products.filter((p) => p.status === "sold").length,
      reservedProducts: products.filter((p) => p.status === "reserved").length,
      newOrders: orders.filter((o) => o.status === "new").length,
      pendingOrders: orders.filter((o) => ["awaiting_confirmation", "confirmed", "processing"].includes(o.status)).length,
      newVinRequests: db.vinRequests.filter((v) => v.storeId === storeId && v.status === "new").length,
      completedRevenue: orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0),
    };
  }

  async getRecentActivity(storeId: string, limit: number): Promise<ActivityItem[]> {
    const db = await load();
    const items: ActivityItem[] = [
      ...db.orders
        .filter((o) => o.storeId === storeId)
        .flatMap((o) =>
          o.history.map((h) => ({
            id: h.id,
            kind: "order" as const,
            action: h.fromStatus === null ? "order_created" : `order_${h.toStatus}`,
            label: `${o.orderNumber} · ${o.customerName}`,
            href: `/admin/orders/${o.id}`,
            createdAt: h.createdAt,
          })),
        ),
      ...db.vinRequests
        .filter((v) => v.storeId === storeId)
        .map((v) => ({
          id: v.id,
          kind: "vin" as const,
          action: "vin_created",
          label: `${v.vehicleModel} · ${v.partDescription}`.slice(0, 80),
          href: `/admin/vin-requests/${v.id}`,
          createdAt: v.createdAt,
        })),
      ...db.inventoryHistory
        .filter((h) => h.storeId === storeId)
        .map((h) => ({
          id: h.id,
          kind: "inventory" as const,
          action: h.action,
          label: h.label,
          href: db.products.some((p) => p.id === h.productId) ? `/admin/products/${h.productId}` : null,
          createdAt: h.createdAt,
        })),
    ];
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
}
