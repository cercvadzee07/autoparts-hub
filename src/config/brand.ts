/**
 * Branding — change the name, contacts and visuals of the store here.
 * Colors live in src/app/globals.css (the `--brand-*` tokens).
 * The logo mark is src/components/brand/logo.tsx.
 */
export const brand = {
  name: "AutoParts Hub",
  shortName: "AutoParts",
  /** Wordmark split: first part white, accent part red. */
  wordmark: { main: "AutoParts", accent: "Hub" },
  /** Small line under the logo (not translated — part of the brand). */
  tagline: "USED TOYOTA PARTS • GEORGIA",
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
      ka: "თბილისი, ნავთლუღი, წმ. ქეთევან დედოფლის გამზირი",
      en: "Tsminda Ketevan Dedoflis Ave, Navtlughi, Tbilisi",
      ru: "Тбилиси, Навтлуги, проспект Цминда Кетеван Дедофлис",
    },
    postalCode: "0144",
    /** Shop location (the box). Used for the embedded map and Google structured data. */
    geo: { lat: 41.685269, lng: 44.846962 },
    mapUrl: "https://maps.app.goo.gl/nTWRts5sFM4xszoJ8",
    hours: {
      ka: "ორშ–შაბ, 10:00–19:00",
      en: "Mon–Sat, 10:00–19:00",
      ru: "Пн–Сб, 10:00–19:00",
    },
  },
  // Hero/category photos: drop files into public/images (see src/lib/site-images.ts).
  currency: "GEL",
} as const;

export type Brand = typeof brand;
