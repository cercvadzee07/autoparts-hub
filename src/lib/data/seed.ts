/**
 * Initial catalog data: one store, categories, the Toyota Camry generations and a
 * sample inventory of used Camry parts.
 *
 * This file is dependency-free on purpose — it is used by the demo database
 * AND by `npm run seed:sql`, which turns it into supabase/seed.sql.
 */

type L = { ka: string; en: string; ru: string };

export const SEED_STORE = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "autoparts-hub-tbilisi",
  name: "AutoParts Hub — Tbilisi",
  phone: "+995555000000",
  city: "Tbilisi",
};

const uuid = (prefix: string, n: number) =>
  `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

export const SEED_CATEGORIES: { id: string; slug: string; icon: string; name: L; sortOrder: number }[] = [
  { slug: "lighting", icon: "headlight", name: { ka: "განათება", en: "Lighting", ru: "Оптика" } },
  { slug: "body", icon: "bumper", name: { ka: "ძარა", en: "Body parts", ru: "Кузов" } },
  { slug: "mirrors", icon: "mirror", name: { ka: "სარკეები", en: "Mirrors", ru: "Зеркала" } },
  { slug: "doors", icon: "door", name: { ka: "კარები", en: "Doors", ru: "Двери" } },
  { slug: "engine", icon: "engine", name: { ka: "ძრავი", en: "Engine", ru: "Двигатель" } },
  { slug: "transmission", icon: "gearbox", name: { ka: "ტრანსმისია", en: "Transmission", ru: "Трансмиссия" } },
  { slug: "suspension", icon: "suspension", name: { ka: "სავალი ნაწილი", en: "Suspension", ru: "Подвеска" } },
  { slug: "brakes", icon: "brake", name: { ka: "სამუხრუჭე სისტემა", en: "Brakes", ru: "Тормоза" } },
  { slug: "cooling", icon: "radiator", name: { ka: "გაგრილება და კონდიციონერი", en: "Cooling & A/C", ru: "Охлаждение и кондиционер" } },
  { slug: "electrical", icon: "electrical", name: { ka: "ელექტროობა", en: "Electrical", ru: "Электрика" } },
  { slug: "interior", icon: "seat", name: { ka: "სალონი", en: "Interior", ru: "Салон" } },
  { slug: "wheels", icon: "wheel", name: { ka: "დისკები და საბურავები", en: "Wheels & tires", ru: "Диски и шины" } },
].map((c, i) => ({ ...c, id: uuid("c0000000", i + 1), sortOrder: i + 1 }));

export const SEED_MAKES = [{ id: uuid("a0000000", 1), slug: "toyota", name: "Toyota" }];

export const SEED_MODELS = [
  { id: uuid("b0000000", 1), makeId: SEED_MAKES[0].id, slug: "camry", name: "Camry" },
];

export const SEED_GENERATIONS: {
  id: string;
  modelId: string;
  slug: string;
  name: string;
  code: string;
  yearFrom: number;
  yearTo: number | null;
}[] = [
  { modelId: SEED_MODELS[0].id, slug: "camry-xv30", name: "Camry XV30", code: "XV30", yearFrom: 2001, yearTo: 2006 },
  { modelId: SEED_MODELS[0].id, slug: "camry-xv40", name: "Camry XV40", code: "XV40", yearFrom: 2006, yearTo: 2011 },
  { modelId: SEED_MODELS[0].id, slug: "camry-xv50", name: "Camry XV50", code: "XV50", yearFrom: 2011, yearTo: 2014 },
  { modelId: SEED_MODELS[0].id, slug: "camry-xv55", name: "Camry XV55", code: "XV55", yearFrom: 2014, yearTo: 2017 },
  { modelId: SEED_MODELS[0].id, slug: "camry-xv70", name: "Camry XV70", code: "XV70", yearFrom: 2017, yearTo: 2024 },
  { modelId: SEED_MODELS[0].id, slug: "camry-xv80", name: "Camry XV80", code: "XV80", yearFrom: 2024, yearTo: null },
].map((g, i) => ({ ...g, id: uuid("d0000000", i + 1) }));

const cat = (slug: string) => SEED_CATEGORIES.find((c) => c.slug === slug)!.id;
const gen = (slug: string) => SEED_GENERATIONS.find((g) => g.slug === slug)!;

interface Template {
  title: L;
  category: string;
  icon: string;
  oem: string;
  basePrice: number;
  gens: string[];
}

const TEMPLATES: Template[] = [
  { title: { ka: "წინა ფარი მარცხენა", en: "Front headlight, left", ru: "Фара передняя левая" }, category: "lighting", icon: "headlight", oem: "81150-", basePrice: 380, gens: ["camry-xv70", "camry-xv55", "camry-xv50", "camry-xv40"] },
  { title: { ka: "წინა ფარი მარჯვენა", en: "Front headlight, right", ru: "Фара передняя правая" }, category: "lighting", icon: "headlight", oem: "81110-", basePrice: 380, gens: ["camry-xv70", "camry-xv55", "camry-xv50"] },
  { title: { ka: "უკანა ფარი მარცხენა", en: "Tail light, left", ru: "Фонарь задний левый" }, category: "lighting", icon: "taillight", oem: "81560-", basePrice: 160, gens: ["camry-xv70", "camry-xv55", "camry-xv40"] },
  { title: { ka: "წინა ბამპერი", en: "Front bumper", ru: "Бампер передний" }, category: "body", icon: "bumper", oem: "52119-", basePrice: 420, gens: ["camry-xv70", "camry-xv55", "camry-xv50", "camry-xv80"] },
  { title: { ka: "უკანა ბამპერი", en: "Rear bumper", ru: "Бампер задний" }, category: "body", icon: "bumper", oem: "52159-", basePrice: 360, gens: ["camry-xv70", "camry-xv50"] },
  { title: { ka: "კაპოტი", en: "Hood", ru: "Капот" }, category: "body", icon: "hood", oem: "53301-", basePrice: 450, gens: ["camry-xv70", "camry-xv55", "camry-xv40"] },
  { title: { ka: "რადიატორის ცხაური", en: "Front grille", ru: "Решётка радиатора" }, category: "body", icon: "grille", oem: "53101-", basePrice: 140, gens: ["camry-xv70", "camry-xv55", "camry-xv50"] },
  { title: { ka: "გვერდითი სარკე მარჯვენა", en: "Side mirror, right", ru: "Зеркало боковое правое" }, category: "mirrors", icon: "mirror", oem: "87910-", basePrice: 220, gens: ["camry-xv70", "camry-xv50", "camry-xv40"] },
  { title: { ka: "გვერდითი სარკე მარცხენა", en: "Side mirror, left", ru: "Зеркало боковое левое" }, category: "mirrors", icon: "mirror", oem: "87940-", basePrice: 220, gens: ["camry-xv70", "camry-xv55"] },
  { title: { ka: "წინა კარი მარცხენა", en: "Front door, left", ru: "Дверь передняя левая" }, category: "doors", icon: "door", oem: "67002-", basePrice: 520, gens: ["camry-xv70", "camry-xv50"] },
  { title: { ka: "ძრავი 2.5 (2AR-FE)", en: "Engine 2.5 (2AR-FE)", ru: "Двигатель 2.5 (2AR-FE)" }, category: "engine", icon: "engine", oem: "19000-36", basePrice: 3900, gens: ["camry-xv50", "camry-xv55"] },
  { title: { ka: "ძრავი 2.5 (A25A-FKS)", en: "Engine 2.5 (A25A-FKS)", ru: "Двигатель 2.5 (A25A-FKS)" }, category: "engine", icon: "engine", oem: "19000-F0", basePrice: 5200, gens: ["camry-xv70"] },
  { title: { ka: "ავტომატური გადაცემათა კოლოფი", en: "Automatic transmission", ru: "АКПП" }, category: "transmission", icon: "gearbox", oem: "30500-", basePrice: 2400, gens: ["camry-xv70", "camry-xv50", "camry-xv40"] },
  { title: { ka: "წინა ამორტიზატორი", en: "Front shock absorber", ru: "Амортизатор передний" }, category: "suspension", icon: "suspension", oem: "48510-", basePrice: 120, gens: ["camry-xv70", "camry-xv55", "camry-xv40"] },
  { title: { ka: "წინა სამუხრუჭე სუპორტი", en: "Front brake caliper", ru: "Суппорт тормозной передний" }, category: "brakes", icon: "brake", oem: "47750-", basePrice: 150, gens: ["camry-xv70", "camry-xv50"] },
  { title: { ka: "ძრავის რადიატორი", en: "Engine radiator", ru: "Радиатор охлаждения" }, category: "cooling", icon: "radiator", oem: "16400-", basePrice: 260, gens: ["camry-xv70", "camry-xv55", "camry-xv30"] },
  { title: { ka: "კონდიციონერის კომპრესორი", en: "A/C compressor", ru: "Компрессор кондиционера" }, category: "cooling", icon: "radiator", oem: "88310-", basePrice: 480, gens: ["camry-xv70", "camry-xv50"] },
  { title: { ka: "გენერატორი", en: "Alternator", ru: "Генератор" }, category: "electrical", icon: "electrical", oem: "27060-", basePrice: 290, gens: ["camry-xv70", "camry-xv50", "camry-xv40"] },
  { title: { ka: "მულტიმედიის ეკრანი", en: "Multimedia display", ru: "Мультимедийный дисплей" }, category: "electrical", icon: "display", oem: "86140-", basePrice: 650, gens: ["camry-xv70", "camry-xv55"] },
  { title: { ka: "მძღოლის სავარძელი", en: "Driver seat", ru: "Сиденье водителя" }, category: "interior", icon: "seat", oem: "71100-", basePrice: 540, gens: ["camry-xv70", "camry-xv50"] },
  { title: { ka: "შენადნობის დისკი R17", en: "Alloy wheel R17", ru: "Диск литой R17" }, category: "wheels", icon: "wheel", oem: "42611-", basePrice: 260, gens: ["camry-xv70", "camry-xv55", "camry-xv50"] },
  { title: { ka: "შენადნობის დისკი R18", en: "Alloy wheel R18", ru: "Диск литой R18" }, category: "wheels", icon: "wheel", oem: "42611-", basePrice: 340, gens: ["camry-xv70"] },
];

const CONDITIONS = ["used", "like_new", "used", "used", "damaged", "new"] as const;

function description(title: L, car: string, condition: string): L {
  const extra: Record<string, L> = {
    like_new: { ka: " მდგომარეობა — თითქმის ახალი.", en: " Condition is close to new.", ru: " Состояние — почти новое." },
    damaged: { ka: " აქვს მცირე დაზიანება, იხილეთ ფოტოები.", en: " Has minor damage — see photos.", ru: " Есть незначительные повреждения — смотрите фото." },
    new: { ka: " ახალი, შეფუთვაში.", en: " Brand new, in original packaging.", ru: " Новая, в оригинальной упаковке." },
  };
  const e = extra[condition] ?? { ka: "", en: "", ru: "" };
  return {
    ka: `ორიგინალი ნაწილი — ${title.ka}, მოხსნილი ${car}-დან. შემოწმებულია და მზადაა დასაყენებლად.${e.ka} ფოტოებზე ნაჩვენებია რეალური ნაწილი. ნახვა შესაძლებელია ჩვენს მაღაზიაში თბილისში.`,
    en: `Genuine ${title.en.toLowerCase()} removed from a ${car}. Inspected and ready to fit.${e.en} Photos show the actual part. You can view it at our shop in Tbilisi.`,
    ru: `Оригинальная деталь — ${title.ru.toLowerCase()}, снята с ${car}. Проверена и готова к установке.${e.ru} На фото — реальная деталь. Можно осмотреть в нашем магазине в Тбилиси.`,
  };
}

export interface SeedProduct {
  id: string;
  storeId: string;
  inventoryCode: string;
  slug: string;
  title: L;
  description: L;
  categoryId: string;
  condition: "new" | "like_new" | "used" | "damaged";
  status: "available" | "reserved" | "sold";
  price: number;
  quantity: number;
  oemNumber: string;
  featured: boolean;
  image: string;
  compatibility: { generationId: string; yearFrom: number; yearTo: number }[];
  createdAt: string;
}

function slugPart(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildProducts(): SeedProduct[] {
  const products: SeedProduct[] = [];
  let n = 0;
  const now = Date.UTC(2026, 9, 30, 12, 0, 0);
  for (const t of TEMPLATES) {
    for (const gSlug of t.gens) {
      n += 1;
      const g = gen(gSlug);
      const yearTo = g.yearTo ?? 2026;
      const age = Math.max(0, 2026 - g.yearFrom);
      const condition = CONDITIONS[n % CONDITIONS.length];
      const factor = Math.max(0.45, 1 - age * 0.035) * (condition === "damaged" ? 0.6 : condition === "new" ? 1.4 : 1);
      const price = Math.round((t.basePrice * factor) / 5) * 5;
      const inventoryCode = `AP-${String(n).padStart(5, "0")}`;
      const car = `Toyota ${g.name} (${g.yearFrom}–${g.yearTo ?? ""})`.replace("–)", "+)");
      const status = n % 17 === 0 ? "sold" : n % 23 === 0 ? "reserved" : "available";
      products.push({
        id: uuid("e0000000", n),
        storeId: SEED_STORE.id,
        inventoryCode,
        slug: `toyota-${slugPart(g.name)}-${slugPart(t.title.en)}-${inventoryCode.toLowerCase()}`,
        title: {
          ka: `${t.title.ka} — Toyota ${g.name}`,
          en: `${t.title.en} — Toyota ${g.name}`,
          ru: `${t.title.ru} — Toyota ${g.name}`,
        },
        description: description(t.title, car, condition),
        categoryId: cat(t.category),
        condition,
        status,
        price,
        quantity: status === "available" ? (t.category === "wheels" ? 4 : 1) : 0,
        oemNumber: `${t.oem}${(1000 + n * 37).toString(36).toUpperCase().slice(0, 5)}`,
        featured: n % 5 === 1,
        image: `/parts/${t.icon}.svg`,
        compatibility: [{ generationId: g.id, yearFrom: g.yearFrom, yearTo }],
        createdAt: new Date(now - n * 7.3 * 3600 * 1000).toISOString(),
      });
    }
  }
  return products;
}

export const SEED_PRODUCTS = buildProducts();
