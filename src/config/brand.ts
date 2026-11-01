/**
 * Branding — change the name, contacts and visuals of the store here.
 * Colors live in src/app/globals.css (the `--brand-*` tokens).
 * The logo mark is src/components/brand/logo.tsx.
 */
export const brand = {
  name: "AutoParts Hub",
  shortName: "AutoParts",
  /** Two-letter monogram used in the logo mark and favicon. */
  monogram: "AP",
  /** Prefix for order numbers, e.g. AP-1001. */
  orderPrefix: "AP",
  /** Prefix for inventory codes, e.g. AP-00042. */
  inventoryPrefix: "AP",
  contact: {
    /** Display form and E.164 form (for tel: and WhatsApp links). */
    phoneDisplay: "+995 555 00 00 00",
    phoneE164: "+995555000000",
    whatsapp: "995555000000",
    email: "info@autoparts.ge",
    city: "Tbilisi",
    /** Localized street address. */
    address: {
      ka: "თბილისი, დიდი დიღომი, ავტონაწილების ბაზრობა",
      en: "Didi Dighomi auto parts market, Tbilisi",
      ru: "Тбилиси, Диди Дигоми, рынок автозапчастей",
    },
    mapUrl: "https://maps.google.com/?q=Tbilisi+Didi+Dighomi",
    hours: {
      ka: "ორშ–შაბ, 10:00–19:00",
      en: "Mon–Sat, 10:00–19:00",
      ru: "Пн–Сб, 10:00–19:00",
    },
  },
  /** Hero background. Replace with a real photo (e.g. /images/hero-camry.jpg). */
  heroImage: null as string | null,
  currency: "GEL",
} as const;

export type Brand = typeof brand;
