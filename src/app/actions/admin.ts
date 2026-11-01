"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { actorOf, assertAdmin, signIn, signOut } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { filesFrom, MAX_IMAGES_PER_PRODUCT, readImageFile } from "@/lib/files";
import { rateLimit } from "@/lib/rate-limit";
import { DomainError, PRODUCT_STATUSES, type AdminSession, type ProductStatus, type UploadedFile } from "@/lib/types";
import {
  fieldErrors,
  loginSchema,
  orderNoteSchema,
  orderStatusSchema,
  productSchema,
  vinUpdateSchema,
  type FormState,
} from "@/lib/validation";

function localeOf(form: FormData): Locale {
  const l = String(form.get("locale") ?? "");
  return isLocale(l) ? l : "ka";
}

function refreshCatalog() {
  revalidatePath("/", "layout");
}

async function ownProduct(session: AdminSession, id: string) {
  const product = await getRepository().getProductById(id);
  if (!product || (product.storeId !== session.storeId && session.role !== "platform_admin")) {
    throw new DomainError("NOT_FOUND");
  }
  return product;
}

async function ownOrder(session: AdminSession, id: string) {
  const order = await getRepository().getOrder(id);
  if (!order || (order.storeId !== session.storeId && session.role !== "platform_admin")) {
    throw new DomainError("NOT_FOUND");
  }
  return order;
}

// ── Auth ──────────────────────────────────────────────────────────

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form);
  if (!(await rateLimit("login", 10, 10 * 60_000))) return { ok: false, message: "rateLimited" };
  const parsed = loginSchema.safeParse({ email: form.get("email") ?? "", password: form.get("password") ?? "" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, message: result.reason === "not_staff" ? "notStaff" : "invalid" };
  redirect(`/${locale}/admin`);
}

export async function logoutAction(form: FormData) {
  await signOut();
  redirect(`/${localeOf(form)}/admin/login`);
}

// ── Products ──────────────────────────────────────────────────────

async function readImages(form: FormData, existing: number): Promise<UploadedFile[] | { error: string }> {
  const files = filesFrom(form, "images");
  if (existing + files.length > MAX_IMAGES_PER_PRODUCT) return { error: "tooLong" };
  const out: UploadedFile[] = [];
  for (const f of files) {
    try {
      out.push(await readImageFile(f));
    } catch (err) {
      return { error: err instanceof DomainError && err.message === "too_large" ? "imageSize" : "imageType" };
    }
  }
  return out;
}

export async function saveProductAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await assertAdmin();
  const locale = localeOf(form);
  let compatibility: unknown = [];
  try {
    compatibility = JSON.parse(String(form.get("compatibility") ?? "[]"));
  } catch {
    /* validated below */
  }
  const id = String(form.get("id") ?? "") || undefined;
  const parsed = productSchema.safeParse({
    id,
    titleKa: form.get("titleKa") ?? "",
    titleEn: form.get("titleEn") ?? "",
    titleRu: form.get("titleRu") ?? "",
    descriptionKa: form.get("descriptionKa") ?? "",
    descriptionEn: form.get("descriptionEn") ?? "",
    descriptionRu: form.get("descriptionRu") ?? "",
    categoryId: form.get("categoryId") ?? "",
    condition: form.get("condition") ?? "used",
    status: form.get("status") ?? "available",
    price: form.get("price") ?? "",
    quantity: form.get("quantity") ?? "1",
    oemNumber: form.get("oemNumber") ?? "",
    featured: form.get("featured") === "on",
    compatibility,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "fixErrors" };

  const repo = getRepository();
  let productId: string;
  try {
    const existing = id ? await ownProduct(session, id) : null;
    const images = await readImages(form, existing?.images.filter((i) => i.path).length ?? 0);
    if ("error" in images) return { ok: false, errors: { images: images.error }, message: "fixErrors" };

    const product = await repo.saveProduct(session.storeId, parsed.data, actorOf(session));
    if (images.length) await repo.addProductImages(product.id, images);
    productId = product.id;
  } catch (err) {
    console.error("saveProduct failed", err);
    return { ok: false, message: "error" };
  }
  refreshCatalog();
  if (!id) redirect(`/${locale}/admin/products/${productId}?created=1`);
  // savedAt re-keys the photo picker so already-uploaded files are cleared.
  return { ok: true, message: "saved", data: { savedAt: String(Date.now()) } };
}

export async function deleteProductAction(form: FormData) {
  const session = await assertAdmin();
  const id = String(form.get("id") ?? "");
  await ownProduct(session, id);
  await getRepository().deleteProduct(id, actorOf(session));
  refreshCatalog();
  redirect(`/${localeOf(form)}/admin/products?deleted=1`);
}

export async function setProductStatusAction(form: FormData) {
  const session = await assertAdmin();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as ProductStatus;
  if (!PRODUCT_STATUSES.includes(status)) throw new Error("Invalid status");
  await ownProduct(session, id);
  await getRepository().setProductStatus(id, status, actorOf(session));
  refreshCatalog();
}

export async function removeProductImageAction(form: FormData) {
  const session = await assertAdmin();
  const productId = String(form.get("productId") ?? "");
  const imageId = String(form.get("imageId") ?? "");
  const product = await ownProduct(session, productId);
  if (!product.images.some((i) => i.id === imageId)) throw new DomainError("NOT_FOUND");
  await getRepository().removeProductImage(imageId);
  refreshCatalog();
}

export async function setCoverImageAction(form: FormData) {
  const session = await assertAdmin();
  const productId = String(form.get("productId") ?? "");
  const imageId = String(form.get("imageId") ?? "");
  const product = await ownProduct(session, productId);
  if (!product.images.some((i) => i.id === imageId)) throw new DomainError("NOT_FOUND");
  await getRepository().setCoverImage(imageId);
  refreshCatalog();
}

// ── Orders ────────────────────────────────────────────────────────

export async function updateOrderStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await assertAdmin();
  const parsed = orderStatusSchema.safeParse({
    orderId: form.get("orderId"),
    status: form.get("status"),
    note: form.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  try {
    await ownOrder(session, parsed.data.orderId);
    await getRepository().updateOrderStatus(parsed.data.orderId, parsed.data.status, parsed.data.note, actorOf(session));
    refreshCatalog();
    return { ok: true, message: "saved" };
  } catch (err) {
    console.error("updateOrderStatus failed", err);
    return { ok: false, message: "error" };
  }
}

export async function addOrderNoteAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await assertAdmin();
  const parsed = orderNoteSchema.safeParse({ orderId: form.get("orderId"), body: form.get("body") ?? "" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  try {
    await ownOrder(session, parsed.data.orderId);
    await getRepository().addOrderNote(parsed.data.orderId, parsed.data.body, actorOf(session));
    revalidatePath("/", "layout");
    return { ok: true, message: "saved" };
  } catch (err) {
    console.error("addOrderNote failed", err);
    return { ok: false, message: "error" };
  }
}

// ── VIN requests ──────────────────────────────────────────────────

export async function updateVinRequestAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await assertAdmin();
  const parsed = vinUpdateSchema.safeParse({
    id: form.get("id"),
    status: form.get("status"),
    adminNotes: form.get("adminNotes") ?? "",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  try {
    const repo = getRepository();
    const vin = await repo.getVinRequest(parsed.data.id);
    if (!vin || (vin.storeId !== session.storeId && session.role !== "platform_admin")) throw new DomainError("NOT_FOUND");
    await repo.updateVinRequest(parsed.data.id, { status: parsed.data.status, adminNotes: parsed.data.adminNotes });
    revalidatePath("/", "layout");
    return { ok: true, message: "saved" };
  } catch (err) {
    console.error("updateVinRequest failed", err);
    return { ok: false, message: "error" };
  }
}
