"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { filesFrom, readImageFile } from "@/lib/files";
import { rateLimit } from "@/lib/rate-limit";
import { DomainError } from "@/lib/types";
import { checkoutSchema, fieldErrors, vinRequestSchema, type FormState } from "@/lib/validation";

/** Echoed back so a form keeps what the customer typed after an error. */
function echo(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "").slice(0, 2000)]));
}

function parseItems(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
}

/** Current price/stock for cart lines, so the cart can flag stale items. */
export async function checkCartAction(
  ids: string[],
): Promise<Record<string, { available: boolean; price: number; quantity: number }>> {
  const safe = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50);
  const products = await getRepository().getProductsByIds(safe);
  const out: Record<string, { available: boolean; price: number; quantity: number }> = {};
  for (const id of safe) {
    const p = products.find((x) => x.id === id);
    out[id] = { available: p?.status === "available", price: p?.price ?? 0, quantity: p?.quantity ?? 0 };
  }
  return out;
}

export async function placeOrderAction(_prev: FormState, form: FormData): Promise<FormState> {
  const data = echo(form, ["customerName", "phone", "address", "notes"]);
  // Honeypot: real users never fill this hidden field.
  if (form.get("website")) return { ok: false, message: "generic", data };
  if (!(await rateLimit("order", 5, 10 * 60_000))) return { ok: false, message: "rateLimited", data };

  const parsed = checkoutSchema.safeParse({
    ...data,
    locale: form.get("locale") ?? "ka",
    items: parseItems(form.get("items")),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "fixErrors", data };

  // Merge duplicate lines so stock checks are exact.
  const merged = new Map<string, number>();
  for (const item of parsed.data.items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);

  try {
    const numbers = await getRepository().placeOrder({
      ...parsed.data,
      items: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { orderNumber: numbers.join(", ") } };
  } catch (err) {
    if (err instanceof DomainError && ["PRODUCT_UNAVAILABLE", "INSUFFICIENT_STOCK", "EMPTY_ORDER"].includes(err.code)) {
      return { ok: false, message: err.code, data };
    }
    console.error("placeOrder failed", err);
    return { ok: false, message: "generic", data };
  }
}

export async function submitVinRequestAction(_prev: FormState, form: FormData): Promise<FormState> {
  const data = echo(form, ["vin", "vehicleModel", "partDescription", "phone", "customerName"]);
  if (form.get("website")) return { ok: false, message: "generic", data };
  if (!(await rateLimit("vin", 5, 10 * 60_000))) return { ok: false, message: "rateLimited", data };

  const parsed = vinRequestSchema.safeParse(data);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "fixErrors", data };

  let image = null;
  const [file] = filesFrom(form, "image");
  if (file) {
    try {
      image = await readImageFile(file);
    } catch (err) {
      const key = err instanceof DomainError && err.message === "too_large" ? "imageSize" : "imageType";
      return { ok: false, errors: { image: key }, message: "fixErrors", data };
    }
  }

  try {
    await getRepository().createVinRequest(parsed.data, image);
    return { ok: true };
  } catch (err) {
    console.error("createVinRequest failed", err);
    return { ok: false, message: "generic", data };
  }
}
