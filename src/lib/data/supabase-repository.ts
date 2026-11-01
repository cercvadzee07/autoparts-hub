import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extensionFor } from "@/lib/files";
import { productSlug } from "@/lib/utils";
import {
  DomainError,
  type ActivityItem,
  type Category,
  type DashboardStats,
  type InventoryEvent,
  type Order,
  type OrderStatus,
  type PlaceOrderInput,
  type Product,
  type ProductFilters,
  type ProductInput,
  type ProductStatus,
  type Store,
  type UploadedFile,
  type VehicleMake,
  type VinRequest,
  type VinRequestInput,
  type VinStatus,
  PENDING_ORDER_STATUSES,
} from "@/lib/types";
import type { Locale } from "@/i18n/config";
import type { Actor, Repository } from "./repository";
import { normalizeQuery, pageParams, paginate, PUBLIC_STATUSES, VISIBLE_STATUSES } from "./shared";

// ── Row shapes returned by PostgREST ──────────────────────────────
interface CategoryRow {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  name_ru: string;
  icon: string;
  sort_order: number;
}
interface ProductRow {
  id: string;
  store_id: string;
  inventory_code: string;
  slug: string;
  title_ka: string;
  title_en: string;
  title_ru: string;
  description_ka: string;
  description_en: string;
  description_ru: string;
  category_id: string;
  condition: Product["condition"];
  status: ProductStatus;
  price: number | string;
  quantity: number;
  oem_number: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  category: CategoryRow | null;
  images: { id: string; url: string; storage_path: string | null; sort_order: number }[];
  compatibility: {
    generation_id: string;
    year_from: number;
    year_to: number;
    generation: {
      slug: string;
      name: string;
      code: string;
      model: { slug: string; name: string; make: { name: string } | null } | null;
    } | null;
  }[];
}
interface OrderRow {
  id: string;
  order_number: string;
  store_id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  address: string;
  customer_notes: string | null;
  locale: Locale;
  status: OrderStatus;
  total: number | string;
  created_at: string;
  updated_at: string;
  items?: {
    id: string;
    product_id: string | null;
    product_slug: string | null;
    title: string;
    inventory_code: string;
    unit_price: number | string;
    quantity: number;
  }[];
  notes?: { id: string; body: string; author_name: string | null; created_at: string }[];
  history?: {
    id: string;
    from_status: OrderStatus | null;
    to_status: OrderStatus;
    note: string | null;
    author_name: string | null;
    created_at: string;
  }[];
}
interface VinRow {
  id: string;
  store_id: string;
  vin: string;
  vehicle_model: string;
  part_description: string;
  phone: string;
  customer_name: string | null;
  image_path: string | null;
  status: VinStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const PRODUCT_SELECT = `
  *,
  category:categories(*),
  images:product_images(id, url, storage_path, sort_order),
  compatibility:product_compatibility(
    generation_id, year_from, year_to,
    generation:vehicle_generations(slug, name, code, model:vehicle_models(slug, name, make:vehicle_makes(name)))
  )`;

const ORDER_SELECT = `
  *,
  items:order_items(*),
  notes:order_notes(id, body, author_name, created_at),
  history:order_status_history(id, from_status, to_status, note, author_name, created_at)`;

const PRODUCT_BUCKET = "product-images";
const VIN_BUCKET = "vin-attachments";

const mapCategory = (c: CategoryRow): Category => ({
  id: c.id,
  slug: c.slug,
  name: { ka: c.name_ka, en: c.name_en, ru: c.name_ru },
  icon: c.icon,
  sortOrder: c.sort_order,
});

function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    storeId: r.store_id,
    inventoryCode: r.inventory_code,
    slug: r.slug,
    title: { ka: r.title_ka, en: r.title_en, ru: r.title_ru },
    description: { ka: r.description_ka, en: r.description_en, ru: r.description_ru },
    categoryId: r.category_id,
    category: r.category ? mapCategory(r.category) : null,
    condition: r.condition,
    status: r.status,
    price: Number(r.price),
    quantity: r.quantity,
    oemNumber: r.oem_number,
    featured: r.featured,
    images: [...(r.images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, url: i.url, path: i.storage_path, sortOrder: i.sort_order })),
    compatibility: (r.compatibility ?? []).flatMap((c) =>
      c.generation?.model
        ? [
            {
              generationId: c.generation_id,
              yearFrom: c.year_from,
              yearTo: c.year_to,
              makeName: c.generation.model.make?.name ?? "",
              modelName: c.generation.model.name,
              modelSlug: c.generation.model.slug,
              generationName: c.generation.name,
              generationCode: c.generation.code,
              generationSlug: c.generation.slug,
            },
          ]
        : [],
    ),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapOrder(r: OrderRow): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    storeId: r.store_id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    phone: r.phone,
    address: r.address,
    customerNotes: r.customer_notes,
    locale: r.locale,
    status: r.status,
    total: Number(r.total),
    items: (r.items ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      productSlug: i.product_slug,
      title: i.title,
      inventoryCode: i.inventory_code,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
    })),
    notes: (r.notes ?? [])
      .map((n) => ({ id: n.id, body: n.body, author: n.author_name, createdAt: n.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    history: (r.history ?? [])
      .map((h) => ({
        id: h.id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        note: h.note,
        author: h.author_name,
        createdAt: h.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function fail(error: { message: string } | null, context: string): never {
  const msg = error?.message ?? "unknown";
  for (const code of ["PRODUCT_UNAVAILABLE", "INSUFFICIENT_STOCK", "EMPTY_ORDER", "NOT_FOUND", "FORBIDDEN"] as const) {
    if (msg.includes(code)) throw new DomainError(code, msg);
  }
  console.error(`[supabase] ${context}:`, msg);
  throw new DomainError("UNKNOWN", `${context}: ${msg}`);
}

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;

  private db(): Promise<SupabaseClient> {
    return createSupabaseServerClient();
  }

  private async productsByIds(ids: string[], statuses?: ProductStatus[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const db = await this.db();
    let query = db.from("products").select(PRODUCT_SELECT).in("id", ids);
    if (statuses) query = query.in("status", statuses);
    const { data, error } = await query;
    if (error) fail(error, "productsByIds");
    const map = new Map((data as unknown as ProductRow[]).map((r) => [r.id, mapProduct(r)]));
    return ids.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  }

  async getDefaultStore(): Promise<Store> {
    const db = await this.db();
    const { data, error } = await db
      .from("stores")
      .select("id, slug, name, phone, city")
      .eq("status", "active")
      .order("created_at")
      .limit(1)
      .single();
    if (error) fail(error, "getDefaultStore");
    return data as Store;
  }

  async getCategories() {
    const db = await this.db();
    const { data, error } = await db.from("categories").select("*").order("sort_order");
    if (error) fail(error, "getCategories");
    return (data as CategoryRow[]).map(mapCategory);
  }

  async getVehicleTree(): Promise<VehicleMake[]> {
    const db = await this.db();
    const { data, error } = await db
      .from("vehicle_makes")
      .select("id, slug, name, models:vehicle_models(id, make_id, slug, name, generations:vehicle_generations(*))")
      .order("name");
    if (error) fail(error, "getVehicleTree");
    type Row = {
      id: string;
      slug: string;
      name: string;
      models: {
        id: string;
        make_id: string;
        slug: string;
        name: string;
        generations: { id: string; model_id: string; slug: string; name: string; code: string; year_from: number; year_to: number | null }[];
      }[];
    };
    return (data as unknown as Row[]).map((make) => ({
      id: make.id,
      slug: make.slug,
      name: make.name,
      models: make.models.map((m) => ({
        id: m.id,
        makeId: m.make_id,
        slug: m.slug,
        name: m.name,
        generations: m.generations
          .map((g) => ({
            id: g.id,
            modelId: g.model_id,
            slug: g.slug,
            name: g.name,
            code: g.code,
            yearFrom: g.year_from,
            yearTo: g.year_to,
          }))
          .sort((a, b) => b.yearFrom - a.yearFrom),
      })),
    }));
  }

  async searchProducts(filters: ProductFilters) {
    const db = await this.db();
    const { page, pageSize, offset } = pageParams(filters);
    const { data, error } = await db.rpc("search_products", {
      p_q: normalizeQuery(filters.q) || null,
      p_model: filters.model ?? null,
      p_generation: filters.generation ?? null,
      p_year: filters.year ?? null,
      p_category: filters.category ?? null,
      p_condition: filters.condition ?? null,
      p_min_price: filters.minPrice ?? null,
      p_max_price: filters.maxPrice ?? null,
      p_statuses: filters.statuses ?? PUBLIC_STATUSES,
      p_featured: filters.featured ?? null,
      p_store: filters.storeId ?? null,
      p_sort: filters.sort ?? "newest",
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) fail(error, "searchProducts");
    const rows = (data ?? []) as { id: string; total_count: number }[];
    const items = await this.productsByIds(rows.map((r) => r.id));
    return paginate(items, Number(rows[0]?.total_count ?? 0), page, pageSize);
  }

  async getProductBySlug(slug: string) {
    const db = await this.db();
    const { data, error } = await db
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .in("status", VISIBLE_STATUSES)
      .maybeSingle();
    if (error) fail(error, "getProductBySlug");
    return data ? mapProduct(data as unknown as ProductRow) : null;
  }

  async getProductsByIds(ids: string[]) {
    return this.productsByIds(ids, VISIBLE_STATUSES);
  }

  async getRelatedProducts(product: Product, limit: number) {
    const db = await this.db();
    const gens = product.compatibility.map((c) => c.generationId);
    const ids = new Set<string>();
    if (gens.length) {
      const { data } = await db
        .from("product_compatibility")
        .select("product_id, products!inner(status, created_at)")
        .in("generation_id", gens)
        .eq("products.status", "available")
        .neq("product_id", product.id)
        .limit(limit * 3);
      (data ?? []).forEach((r: { product_id: string }) => ids.add(r.product_id));
    }
    if (ids.size < limit) {
      const { data } = await db
        .from("products")
        .select("id")
        .eq("category_id", product.categoryId)
        .eq("status", "available")
        .neq("id", product.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      (data ?? []).forEach((r: { id: string }) => ids.add(r.id));
    }
    const products = await this.productsByIds([...ids], ["available"]);
    const score = (p: Product) =>
      (p.compatibility.some((c) => gens.includes(c.generationId)) ? 2 : 0) + (p.categoryId === product.categoryId ? 1 : 0);
    return products.sort((a, b) => score(b) - score(a)).slice(0, limit);
  }

  async getSitemapEntries() {
    const db = await this.db();
    const { data, error } = await db
      .from("products")
      .select("slug, updated_at")
      .in("status", VISIBLE_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) fail(error, "getSitemapEntries");
    return (data as { slug: string; updated_at: string }[]).map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  }

  async getCategoryCounts() {
    const db = await this.db();
    const { data, error } = await db.from("products").select("category:categories(slug)").eq("status", "available");
    if (error) fail(error, "getCategoryCounts");
    const counts: Record<string, number> = {};
    for (const r of data as unknown as { category: { slug: string } | null }[]) {
      if (r.category) counts[r.category.slug] = (counts[r.category.slug] ?? 0) + 1;
    }
    return counts;
  }

  async placeOrder(input: PlaceOrderInput) {
    const db = await this.db();
    const { data, error } = await db.rpc("place_order", {
      p_customer_name: input.customerName,
      p_phone: input.phone,
      p_address: input.address,
      p_notes: input.notes ?? "",
      p_locale: input.locale,
      p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    });
    if (error) fail(error, "placeOrder");
    return data as string[];
  }

  async createVinRequest(input: VinRequestInput, image: UploadedFile | null) {
    const db = await this.db();
    const store = await this.getDefaultStore();
    let imagePath: string | null = null;
    if (image) {
      imagePath = `${store.id}/${randomUUID()}.${extensionFor(image.type)}`;
      const { error } = await db.storage
        .from(VIN_BUCKET)
        .upload(imagePath, image.bytes, { contentType: image.type, upsert: false });
      if (error) fail(error, "createVinRequest.upload");
    }
    const id = randomUUID();
    const { error } = await db.from("vin_requests").insert({
      id,
      store_id: store.id,
      vin: input.vin,
      vehicle_model: input.vehicleModel,
      part_description: input.partDescription,
      phone: input.phone,
      customer_name: input.customerName,
      image_path: imagePath,
    });
    if (error) fail(error, "createVinRequest");
    return id;
  }

  // ── Admin: products ─────────────────────────────────────────

  async getProductById(id: string) {
    return (await this.productsByIds([id]))[0] ?? null;
  }

  private async logInventory(db: SupabaseClient, p: { id: string; storeId: string; label: string }, action: string, actor: Actor, note: string | null = null) {
    await db.from("inventory_history").insert({
      store_id: p.storeId,
      product_id: p.id,
      product_label: p.label,
      action,
      note,
      user_id: actor.userId,
      author_name: actor.name,
    });
  }

  async saveProduct(storeId: string, input: ProductInput, actor: Actor) {
    const db = await this.db();
    const fields = {
      title_ka: input.title.ka,
      title_en: input.title.en,
      title_ru: input.title.ru,
      description_ka: input.description.ka,
      description_en: input.description.en,
      description_ru: input.description.ru,
      category_id: input.categoryId,
      condition: input.condition,
      status: input.status,
      price: input.price,
      quantity: input.quantity,
      oem_number: input.oemNumber,
      featured: input.featured,
    };

    let id = input.id;
    if (id) {
      const before = await this.getProductById(id);
      if (!before || before.storeId !== storeId) throw new DomainError("NOT_FOUND");
      const { error } = await db.from("products").update(fields).eq("id", id);
      if (error) fail(error, "saveProduct.update");
      const ref = { id, storeId, label: input.title.ka };
      await this.logInventory(db, ref, "product_updated", actor);
      if (before.status !== input.status) await this.logInventory(db, ref, `status_${input.status}`, actor);
      if (before.price !== input.price) await this.logInventory(db, ref, "price_changed", actor, String(input.price));
    } else {
      const { data, error } = await db
        .from("products")
        .insert({ ...fields, store_id: storeId, slug: `tmp-${randomUUID()}` })
        .select("id, inventory_code")
        .single();
      if (error) fail(error, "saveProduct.insert");
      id = data.id as string;
      const slug = productSlug(input.title, data.inventory_code as string);
      const upd = await db.from("products").update({ slug }).eq("id", id);
      if (upd.error) fail(upd.error, "saveProduct.slug");
      await this.logInventory(db, { id, storeId, label: input.title.ka }, "product_created", actor);
    }

    const del = await db.from("product_compatibility").delete().eq("product_id", id);
    if (del.error) fail(del.error, "saveProduct.compat.delete");
    if (input.compatibility.length) {
      const ins = await db.from("product_compatibility").insert(
        input.compatibility.map((c) => ({
          product_id: id,
          generation_id: c.generationId,
          year_from: c.yearFrom,
          year_to: c.yearTo,
        })),
      );
      if (ins.error) fail(ins.error, "saveProduct.compat.insert");
    }
    return (await this.getProductById(id!))!;
  }

  async deleteProduct(id: string, actor: Actor) {
    const db = await this.db();
    const product = await this.getProductById(id);
    if (!product) throw new DomainError("NOT_FOUND");
    const paths = product.images.flatMap((i) => (i.path ? [i.path] : []));
    if (paths.length) await db.storage.from(PRODUCT_BUCKET).remove(paths);
    await this.logInventory(db, { id, storeId: product.storeId, label: product.title.ka }, "product_deleted", actor);
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) fail(error, "deleteProduct");
  }

  async setProductStatus(id: string, status: ProductStatus, actor: Actor) {
    const db = await this.db();
    const product = await this.getProductById(id);
    if (!product) throw new DomainError("NOT_FOUND");
    const quantity = status === "sold" ? 0 : status === "available" && product.quantity === 0 ? 1 : product.quantity;
    const { error } = await db.from("products").update({ status, quantity }).eq("id", id);
    if (error) fail(error, "setProductStatus");
    await this.logInventory(db, { id, storeId: product.storeId, label: product.title.ka }, `status_${status}`, actor);
  }

  async addProductImages(productId: string, files: UploadedFile[]) {
    const db = await this.db();
    const product = await this.getProductById(productId);
    if (!product) throw new DomainError("NOT_FOUND");
    // Remove seed placeholders (no storage path) once real photos arrive.
    const placeholders = product.images.filter((i) => !i.path).map((i) => i.id);
    if (placeholders.length) await db.from("product_images").delete().in("id", placeholders);
    let order = product.images.length - placeholders.length;
    for (const file of files) {
      const path = `${product.storeId}/${productId}/${randomUUID()}.${extensionFor(file.type)}`;
      const up = await db.storage.from(PRODUCT_BUCKET).upload(path, file.bytes, { contentType: file.type, cacheControl: "31536000" });
      if (up.error) fail(up.error, "addProductImages.upload");
      const { data } = db.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
      const ins = await db.from("product_images").insert({ product_id: productId, storage_path: path, url: data.publicUrl, sort_order: order++ });
      if (ins.error) fail(ins.error, "addProductImages.insert");
    }
  }

  async removeProductImage(imageId: string) {
    const db = await this.db();
    const { data, error } = await db.from("product_images").select("storage_path").eq("id", imageId).maybeSingle();
    if (error) fail(error, "removeProductImage");
    if (!data) throw new DomainError("NOT_FOUND");
    if (data.storage_path) await db.storage.from(PRODUCT_BUCKET).remove([data.storage_path as string]);
    const del = await db.from("product_images").delete().eq("id", imageId);
    if (del.error) fail(del.error, "removeProductImage.delete");
  }

  async setCoverImage(imageId: string) {
    const db = await this.db();
    const { data, error } = await db.from("product_images").select("product_id").eq("id", imageId).single();
    if (error) fail(error, "setCoverImage");
    const { data: all } = await db
      .from("product_images")
      .select("id")
      .eq("product_id", data.product_id)
      .order("sort_order");
    const ids = [imageId, ...((all ?? []) as { id: string }[]).map((r) => r.id).filter((x) => x !== imageId)];
    for (const [i, id] of ids.entries()) {
      await db.from("product_images").update({ sort_order: i }).eq("id", id);
    }
  }

  async getInventoryHistory(productId: string): Promise<InventoryEvent[]> {
    const db = await this.db();
    const { data, error } = await db
      .from("inventory_history")
      .select("id, product_id, action, note, author_name, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) fail(error, "getInventoryHistory");
    return (data as { id: string; product_id: string; action: string; note: string | null; author_name: string | null; created_at: string }[]).map(
      (r) => ({ id: r.id, productId: r.product_id, action: r.action, note: r.note, author: r.author_name, createdAt: r.created_at }),
    );
  }

  // ── Admin: orders ───────────────────────────────────────────

  async listOrders(storeId: string, opts: { status?: OrderStatus; q?: string; page?: number; pageSize?: number }) {
    const db = await this.db();
    const { page, pageSize, offset } = pageParams(opts);
    let query = db
      .from("orders")
      .select("*, items:order_items(*)", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (opts.status) query = query.eq("status", opts.status);
    const q = normalizeQuery(opts.q).replace(/[,()%*]/g, "");
    if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data, error, count } = await query;
    if (error) fail(error, "listOrders");
    return paginate((data as unknown as OrderRow[]).map(mapOrder), count ?? 0, page, pageSize);
  }

  async getOrder(id: string) {
    const db = await this.db();
    const { data, error } = await db.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
    if (error) fail(error, "getOrder");
    return data ? mapOrder(data as unknown as OrderRow) : null;
  }

  async updateOrderStatus(id: string, status: OrderStatus, note: string | null, actor: Actor) {
    const db = await this.db();
    const { error } = await db.rpc("admin_update_order_status", {
      p_order_id: id,
      p_status: status,
      p_note: note ?? "",
      p_author: actor.name,
    });
    if (error) fail(error, "updateOrderStatus");
  }

  async addOrderNote(id: string, body: string, actor: Actor) {
    const db = await this.db();
    const { error } = await db
      .from("order_notes")
      .insert({ order_id: id, body, author_id: actor.userId, author_name: actor.name });
    if (error) fail(error, "addOrderNote");
  }

  // ── Admin: VIN requests ─────────────────────────────────────

  /** `sign` creates a 1-hour signed URL for the private attachment. */
  private async mapVin(db: SupabaseClient, r: VinRow, sign: boolean): Promise<VinRequest> {
    let imageUrl: string | null = r.image_path ? "attached" : null;
    if (r.image_path && sign) {
      const { data } = await db.storage.from(VIN_BUCKET).createSignedUrl(r.image_path, 3600);
      imageUrl = data?.signedUrl ?? null;
    }
    return {
      id: r.id,
      storeId: r.store_id,
      vin: r.vin,
      vehicleModel: r.vehicle_model,
      partDescription: r.part_description,
      phone: r.phone,
      customerName: r.customer_name,
      imageUrl,
      status: r.status,
      adminNotes: r.admin_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async listVinRequests(storeId: string, opts: { status?: VinStatus; page?: number; pageSize?: number }) {
    const db = await this.db();
    const { page, pageSize, offset } = pageParams(opts);
    let query = db
      .from("vin_requests")
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (opts.status) query = query.eq("status", opts.status);
    const { data, error, count } = await query;
    if (error) fail(error, "listVinRequests");
    const items = await Promise.all((data as VinRow[]).map((r) => this.mapVin(db, r, false)));
    return paginate(items, count ?? 0, page, pageSize);
  }

  async getVinRequest(id: string) {
    const db = await this.db();
    const { data, error } = await db.from("vin_requests").select("*").eq("id", id).maybeSingle();
    if (error) fail(error, "getVinRequest");
    return data ? this.mapVin(db, data as VinRow, true) : null;
  }

  async updateVinRequest(id: string, patch: { status: VinStatus; adminNotes: string | null }) {
    const db = await this.db();
    const { error } = await db
      .from("vin_requests")
      .update({ status: patch.status, admin_notes: patch.adminNotes })
      .eq("id", id);
    if (error) fail(error, "updateVinRequest");
  }

  // ── Admin: dashboard ────────────────────────────────────────

  async getDashboardStats(storeId: string): Promise<DashboardStats> {
    const db = await this.db();
    const head = (table: string) =>
      db.from(table).select("id", { count: "exact", head: true }).eq("store_id", storeId);
    const [total, available, sold, reserved, fresh, pending, vins, revenue] = await Promise.all([
      head("products").neq("status", "archived"),
      head("products").eq("status", "available"),
      head("products").eq("status", "sold"),
      head("products").eq("status", "reserved"),
      head("orders").eq("status", "new"),
      head("orders").in("status", PENDING_ORDER_STATUSES),
      head("vin_requests").eq("status", "new"),
      db.from("orders").select("total").eq("store_id", storeId).eq("status", "completed"),
    ]);
    const n = (r: { count: number | null }) => r.count ?? 0;
    return {
      totalProducts: n(total),
      availableProducts: n(available),
      soldProducts: n(sold),
      reservedProducts: n(reserved),
      newOrders: n(fresh),
      pendingOrders: n(pending),
      newVinRequests: n(vins),
      completedRevenue: ((revenue.data ?? []) as { total: number | string }[]).reduce((s, r) => s + Number(r.total), 0),
    };
  }

  async getRecentActivity(storeId: string, limit: number): Promise<ActivityItem[]> {
    const db = await this.db();
    const [history, vins, inventory] = await Promise.all([
      db
        .from("order_status_history")
        .select("id, from_status, to_status, created_at, order:orders!inner(id, order_number, customer_name, store_id)")
        .eq("order.store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(limit),
      db
        .from("vin_requests")
        .select("id, vehicle_model, part_description, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(limit),
      db
        .from("inventory_history")
        .select("id, product_id, product_label, action, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);
    type H = { id: string; from_status: string | null; to_status: string; created_at: string; order: { id: string; order_number: string; customer_name: string } };
    const items: ActivityItem[] = [
      ...((history.data ?? []) as unknown as H[]).map((h) => ({
        id: h.id,
        kind: "order" as const,
        action: h.from_status === null ? "order_created" : `order_${h.to_status}`,
        label: `${h.order.order_number} · ${h.order.customer_name}`,
        href: `/admin/orders/${h.order.id}`,
        createdAt: h.created_at,
      })),
      ...((vins.data ?? []) as { id: string; vehicle_model: string; part_description: string; created_at: string }[]).map((v) => ({
        id: v.id,
        kind: "vin" as const,
        action: "vin_created",
        label: `${v.vehicle_model} · ${v.part_description}`.slice(0, 80),
        href: `/admin/vin-requests/${v.id}`,
        createdAt: v.created_at,
      })),
      ...((inventory.data ?? []) as { id: string; product_id: string | null; product_label: string; action: string; created_at: string }[]).map((h) => ({
        id: h.id,
        kind: "inventory" as const,
        action: h.action,
        label: h.product_label,
        href: h.product_id ? `/admin/products/${h.product_id}` : null,
        createdAt: h.created_at,
      })),
    ];
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
}
