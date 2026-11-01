export const locales = ["ka", "en", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ka";

export const localeNames: Record<Locale, string> = {
  ka: "ქართული",
  en: "English",
  ru: "Русский",
};

/** BCP-47 tags for <html lang>, Open Graph and hreflang. */
export const localeTags: Record<Locale, string> = {
  ka: "ka-GE",
  en: "en-US",
  ru: "ru-RU",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
