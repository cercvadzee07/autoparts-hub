import { clsx, type ClassValue } from "clsx";
import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import type { LocalizedText, Product } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Pick the requested language, falling back to Georgian, then English. */
export function localized(text: LocalizedText | null | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale]?.trim() || text.ka?.trim() || text.en?.trim() || text.ru?.trim() || "";
}

export function formatPrice(value: number, locale: Locale): string {
  const n = new Intl.NumberFormat(localeTags[locale], {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${n} ₾`;
}

export function formatDate(iso: string, locale: Locale, withTime = false): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Tbilisi",
  }).format(new Date(iso));
}

const GEORGIAN: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t", ი: "i", კ: "k", ლ: "l",
  მ: "m", ნ: "n", ო: "o", პ: "p", ჟ: "zh", რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "p", ქ: "k",
  ღ: "gh", ყ: "q", შ: "sh", ჩ: "ch", ც: "ts", ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh", ჯ: "j", ჰ: "h",
};
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => GEORGIAN[ch] ?? CYRILLIC[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function productSlug(title: LocalizedText, inventoryCode: string): string {
  const base = slugify(title.en || title.ka || title.ru || "part");
  return `${base}-${slugify(inventoryCode)}`.replace(/^-/, "");
}

export function primaryImage(product: Product): string {
  return product.images[0]?.url ?? "/parts/generic.svg";
}

/** Short "Toyota Camry XV70 (2018–2024)" style label. */
export function fitmentLabel(product: Product): string | null {
  const c = product.compatibility[0];
  if (!c) return null;
  return `${c.makeName} ${c.modelName} ${c.generationCode} (${c.yearFrom}–${c.yearTo})`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
