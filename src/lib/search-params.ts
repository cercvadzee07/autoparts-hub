import { PRODUCT_CONDITIONS, SORT_OPTIONS, type ProductCondition, type ProductFilters, type SortOption } from "@/lib/types";
import { clampInt } from "@/lib/utils";

type Raw = Record<string, string | string[] | undefined>;

export function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 120) : undefined;
}

const slug = (v: string | undefined) => (v && /^[a-z0-9-]{1,80}$/.test(v) ? v : undefined);
const price = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Untrusted URL query → typed catalog filters. */
export function parseCatalogParams(raw: Raw): ProductFilters & { page: number } {
  const condition = first(raw, "condition");
  const sort = first(raw, "sort");
  const year = first(raw, "year");
  return {
    q: first(raw, "q"),
    model: slug(first(raw, "model")),
    generation: slug(first(raw, "generation")),
    category: slug(first(raw, "category")),
    year: year ? clampInt(year, 1950, 2100, 0) || undefined : undefined,
    condition: PRODUCT_CONDITIONS.includes(condition as ProductCondition) ? (condition as ProductCondition) : undefined,
    minPrice: price(first(raw, "minPrice")),
    maxPrice: price(first(raw, "maxPrice")),
    sort: SORT_OPTIONS.includes(sort as SortOption) ? (sort as SortOption) : "newest",
    page: clampInt(first(raw, "page"), 1, 1000, 1),
  };
}

/** Filters → plain string map for links/pagination. */
export function filtersToParams(f: ProductFilters): Record<string, string | undefined> {
  return {
    q: f.q,
    model: f.model,
    generation: f.generation,
    year: f.year ? String(f.year) : undefined,
    category: f.category,
    condition: f.condition,
    minPrice: f.minPrice != null ? String(f.minPrice) : undefined,
    maxPrice: f.maxPrice != null ? String(f.maxPrice) : undefined,
    sort: f.sort && f.sort !== "newest" ? f.sort : undefined,
  };
}
