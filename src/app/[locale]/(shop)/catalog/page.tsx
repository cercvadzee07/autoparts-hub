import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search, SlidersHorizontal, SearchX } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { getRepository } from "@/lib/data";
import { filtersToParams, parseCatalogParams } from "@/lib/search-params";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { CatalogFilters } from "@/components/shop/catalog-filters";
import { ProductGrid } from "@/components/shop/product-card";
import { AutoSubmitSelect } from "@/components/ui/auto-submit";
import { Pagination } from "@/components/ui/pagination";
import { buttonStyles, cardStyles, inputStyles } from "@/components/ui/styles";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/catalog">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const filters = parseCatalogParams(await searchParams);
  const filtered = Object.values(filtersToParams(filters)).some(Boolean) || filters.page > 1;
  let title = t.meta.catalogTitle;
  if (filters.category) {
    const cat = (await getRepository().getCategories()).find((c) => c.slug === filters.category);
    if (cat) title = `${localized(cat.name, locale)} — Toyota`;
  }
  return {
    title,
    description: t.meta.catalogDescription,
    alternates: alternates(locale, "/catalog"),
    // Keep filtered permutations out of the index; the canonical catalog is indexed.
    robots: filtered && !filters.category ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ params, searchParams }: PageProps<"/[locale]/catalog">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const filters = parseCatalogParams(await searchParams);
  const repo = getRepository();
  const [vehicles, categories] = await Promise.all([repo.getVehicleTree(), repo.getCategories()]);
  // A generation left over from a previously selected model would match nothing.
  if (filters.model && filters.generation) {
    const model = vehicles.flatMap((v) => v.models).find((m) => m.slug === filters.model);
    if (!model?.generations.some((g) => g.slug === filters.generation)) filters.generation = undefined;
  }
  const result = await repo.searchProducts(filters);
  const linkParams = filtersToParams(filters);
  const activeCount = Object.entries(linkParams).filter(([k, v]) => v && k !== "sort" && k !== "q").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {filters.q ? `“${filters.q}”` : t.catalog.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{fmt(t.common.results, { count: result.total })}</p>
        </div>
        <form action={`/${locale}/catalog`} role="search" className="flex w-full overflow-hidden rounded-xl md:max-w-md">
          {Object.entries(linkParams).map(([k, v]) => (v && k !== "q" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <label className="relative flex-1">
            <span className="sr-only">{t.common.search}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder={t.home.searchShort}
              className="h-12 w-full bg-white pl-10 pr-3 text-[15px] text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
            />
          </label>
          <button type="submit" className="bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover">{t.common.search}</button>
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className={`${cardStyles} sticky top-24 p-5`}>
            <h2 className="mb-4 text-sm font-semibold">{t.catalog.filters}</h2>
            <CatalogFilters locale={locale} filters={filters} vehicles={vehicles} categories={categories} idPrefix="d" />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <details className="group w-full lg:hidden">
              <summary className={buttonStyles("outline", "md", "w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                <SlidersHorizontal className="size-4" aria-hidden />
                {t.catalog.showFilters}
                {activeCount > 0 && (
                  <span className="rounded-full bg-brand px-1.5 text-xs font-bold text-white">{activeCount}</span>
                )}
              </summary>
              <div className={`${cardStyles} mt-3 p-5`}>
                <CatalogFilters locale={locale} filters={filters} vehicles={vehicles} categories={categories} idPrefix="m" />
              </div>
            </details>

            <form action={`/${locale}/catalog`} className="ml-auto flex items-center gap-2">
              {Object.entries(linkParams).map(([k, v]) =>
                v && k !== "sort" ? <input key={k} type="hidden" name={k} value={v} /> : null,
              )}
              <label htmlFor="sort" className="text-sm text-muted">{t.catalog.sort}</label>
              <AutoSubmitSelect id="sort" name="sort" defaultValue={filters.sort ?? "newest"} className={`${inputStyles} h-10 w-auto pr-9`}>
                <option value="newest">{t.catalog.sortNewest}</option>
                <option value="price_asc">{t.catalog.sortPriceAsc}</option>
                <option value="price_desc">{t.catalog.sortPriceDesc}</option>
              </AutoSubmitSelect>
              <noscript>
                <button type="submit" className={buttonStyles("secondary", "sm")}>{t.common.apply}</button>
              </noscript>
            </form>
          </div>

          {result.items.length === 0 ? (
            <div className={`${cardStyles} flex flex-col items-center px-6 py-16 text-center`}>
              <SearchX className="mb-4 size-10 text-subtle" aria-hidden />
              <h2 className="text-lg font-semibold">{t.catalog.emptyTitle}</h2>
              <p className="mt-2 max-w-md text-sm text-muted">{t.catalog.emptyText}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href={`/${locale}/catalog`} className={buttonStyles("outline")}>{t.catalog.clearFilters}</Link>
                <Link href={`/${locale}/vin-request`} className={buttonStyles("primary")}>{t.nav.vin}</Link>
              </div>
            </div>
          ) : (
            <>
              <ProductGrid products={result.items} locale={locale} priorityCount={4} />
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                basePath={`/${locale}/catalog`}
                params={linkParams}
                labels={{
                  previous: t.common.previous,
                  next: t.common.next,
                  page: fmt(t.common.page, { page: result.page, total: result.pageCount }),
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
