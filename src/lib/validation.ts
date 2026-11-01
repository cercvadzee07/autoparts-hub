import { z } from "zod";
import { locales } from "@/i18n/config";
import { ORDER_STATUSES, PRODUCT_CONDITIONS, PRODUCT_STATUSES, VIN_STATUSES } from "@/lib/types";

/**
 * Server-side validation. Error messages are keys into `dict.validation`
 * so the client can show them in the active language.
 */

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, { error: min <= 1 ? "required" : "tooShort" })
    .max(max, { error: "tooLong" });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** Accepts "555 12 34 56", "+995 555-12-34-56", "0322 00 00 00"… → E.164-ish. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()\-.]/g, ""))
  .refine((v) => /^\+?\d{9,15}$/.test(v), { error: "phone" })
  .transform((v) => (v.startsWith("+") ? v : v.length === 9 ? `+995${v}` : v.startsWith("995") ? `+${v}` : v));

export const vinSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
  .refine((v) => /^[A-HJ-NPR-Z0-9]{11,17}$/.test(v), { error: "vin" });

export const checkoutSchema = z.object({
  customerName: text(2, 100),
  phone: phoneSchema,
  address: text(3, 300),
  notes: optionalText(1000),
  locale: z.enum(locales),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.coerce.number().int().min(1).max(99),
      }),
    )
    .min(1, { error: "required" })
    .max(50),
});

export const vinRequestSchema = z.object({
  vin: vinSchema,
  vehicleModel: text(2, 120),
  partDescription: text(2, 1000),
  phone: phoneSchema,
  customerName: optionalText(100),
});

const money = z.coerce
  .number({ error: "price" })
  .min(0, { error: "price" })
  .max(1_000_000, { error: "price" })
  .transform((v) => Math.round(v * 100) / 100);

const year = z.coerce.number({ error: "number" }).int({ error: "number" }).min(1950, { error: "number" }).max(2100, { error: "number" });

export const productSchema = z
  .object({
    id: z.uuid().optional(),
    titleKa: text(2, 200),
    titleEn: z.string().trim().max(200, { error: "tooLong" }),
    titleRu: z.string().trim().max(200, { error: "tooLong" }),
    descriptionKa: z.string().trim().max(5000, { error: "tooLong" }),
    descriptionEn: z.string().trim().max(5000, { error: "tooLong" }),
    descriptionRu: z.string().trim().max(5000, { error: "tooLong" }),
    categoryId: z.string().min(1, { error: "required" }),
    condition: z.enum(PRODUCT_CONDITIONS),
    status: z.enum(PRODUCT_STATUSES),
    price: money,
    quantity: z.coerce.number({ error: "number" }).int({ error: "number" }).min(0, { error: "number" }).max(9999, { error: "number" }),
    oemNumber: optionalText(60),
    featured: z.boolean(),
    compatibility: z
      .array(z.object({ generationId: z.string().min(1), yearFrom: year, yearTo: year }))
      .max(20)
      .refine((rows) => rows.every((r) => r.yearTo >= r.yearFrom), { error: "number" })
      .refine((rows) => new Set(rows.map((r) => r.generationId)).size === rows.length, { error: "number" }),
  })
  .transform((v) => ({
    id: v.id,
    title: { ka: v.titleKa, en: v.titleEn, ru: v.titleRu },
    description: { ka: v.descriptionKa, en: v.descriptionEn, ru: v.descriptionRu },
    categoryId: v.categoryId,
    condition: v.condition,
    status: v.status,
    price: v.price,
    quantity: v.quantity,
    oemNumber: v.oemNumber ? v.oemNumber.toUpperCase() : null,
    featured: v.featured,
    compatibility: v.compatibility,
  }));

export const orderStatusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});

export const orderNoteSchema = z.object({
  orderId: z.uuid(),
  body: text(1, 2000),
});

export const vinUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(VIN_STATUSES),
  adminNotes: optionalText(2000),
});

export const loginSchema = z.object({
  email: z.email({ error: "email" }).max(200),
  password: z.string().min(1, { error: "required" }).max(200),
});

/** Flattens zod issues into { field: messageKey } (first issue per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message in VALIDATION_KEYS ? issue.message : "required";
  }
  return out;
}

const VALIDATION_KEYS: Record<string, true> = {
  required: true,
  tooShort: true,
  tooLong: true,
  phone: true,
  vin: true,
  price: true,
  number: true,
  email: true,
  imageType: true,
  imageSize: true,
};

export type FormState = {
  ok: boolean;
  errors?: Record<string, string>;
  /** Key into dict.errors / dict.validation, or a literal message. */
  message?: string;
  data?: Record<string, string>;
};
