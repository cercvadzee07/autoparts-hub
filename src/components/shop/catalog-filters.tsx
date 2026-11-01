import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { PRODUCT_CONDITIONS, type Category, type ProductFilters, type VehicleMake } from "@/lib/types";
import { AutoSubmitSelect } from "@/components/ui/auto-submit";
import { buttonStyles, inputStyles, labelStyles } from "@/components/ui/styles";

/** GET form — works without JavaScript; selects auto-submit when JS is on. */
export function CatalogFilters({
  locale,
  filters,
  vehicles,
  categories,
  idPrefix,
}: {
  locale: Locale;
  filters: ProductFilters;
  vehicles: VehicleMake[];
  categories: Category[];
  idPrefix: string;
}) {
  const t = getDictionary(locale);
  // The shop sells Camry parts only, so the filter starts at the generation.
  const gens = vehicles.flatMap((m) => m.models.flatMap((model) => model.generations));
  const id = (name: string) => `${idPrefix}-${name}`;
  const years: number[] = [];
  for (let y = new Date().getFullYear(); y >= 2000; y--) years.push(y);

  return (
    <form action={`/${locale}/catalog`} className="space-y-5">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort && filters.sort !== "newest" && <input type="hidden" name="sort" value={filters.sort} />}

      <div>
        <label htmlFor={id("generation")} className={labelStyles}>{t.catalog.generation}</label>
        <AutoSubmitSelect id={id("generation")} name="generation" defaultValue={filters.generation ?? ""}>
          <option value="">{t.common.all}</option>
          {gens.map((g) => (
            <option key={g.id} value={g.slug}>
              {g.name} · {g.yearFrom}–{g.yearTo ?? ""}
            </option>
          ))}
        </AutoSubmitSelect>
      </div>

      <div>
        <label htmlFor={id("year")} className={labelStyles}>{t.catalog.year}</label>
        <AutoSubmitSelect id={id("year")} name="year" defaultValue={filters.year ? String(filters.year) : ""}>
          <option value="">{t.common.any}</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </AutoSubmitSelect>
      </div>

      <div>
        <label htmlFor={id("category")} className={labelStyles}>{t.catalog.category}</label>
        <AutoSubmitSelect id={id("category")} name="category" defaultValue={filters.category ?? ""}>
          <option value="">{t.common.all}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name[locale]}</option>
          ))}
        </AutoSubmitSelect>
      </div>

      <div>
        <label htmlFor={id("condition")} className={labelStyles}>{t.catalog.condition}</label>
        <AutoSubmitSelect id={id("condition")} name="condition" defaultValue={filters.condition ?? ""}>
          <option value="">{t.common.any}</option>
          {PRODUCT_CONDITIONS.map((c) => (
            <option key={c} value={c}>{t.conditions[c]}</option>
          ))}
        </AutoSubmitSelect>
      </div>

      <fieldset>
        <legend className={labelStyles}>{t.catalog.price}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">{t.catalog.priceFrom}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              name="minPrice"
              placeholder={t.catalog.priceFrom}
              defaultValue={filters.minPrice ?? ""}
              className={inputStyles}
            />
          </label>
          <label>
            <span className="sr-only">{t.catalog.priceTo}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              name="maxPrice"
              placeholder={t.catalog.priceTo}
              defaultValue={filters.maxPrice ?? ""}
              className={inputStyles}
            />
          </label>
        </div>
      </fieldset>

      <div className="flex gap-2 pt-1">
        <button type="submit" className={buttonStyles("primary", "md", "flex-1")}>{t.common.apply}</button>
        <Link href={`/${locale}/catalog`} className={buttonStyles("ghost", "md")}>{t.common.reset}</Link>
      </div>
    </form>
  );
}
