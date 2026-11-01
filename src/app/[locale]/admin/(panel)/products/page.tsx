import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Pencil, Plus, Search, Tag } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { setProductStatusAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { first } from "@/lib/search-params";
import { PRODUCT_STATUSES, type Product, type ProductStatus } from "@/lib/types";
import { clampInt, formatPrice, localized, primaryImage } from "@/lib/utils";
import { AutoSubmitSelect } from "@/components/ui/auto-submit";
import { Badge, productStatusTone } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { buttonStyles, cardStyles, inputStyles } from "@/components/ui/styles";
import { SubmitButton } from "@/components/ui/submit-button";
import { PartImage } from "@/components/shop/part-image";
import { FlashToast } from "@/components/admin/flash-toast";

export default async function AdminProductsPage({ params, searchParams }: PageProps<"/[locale]/admin/products">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const sp = await searchParams;
  const q = first(sp, "q");
  const statusParam = first(sp, "status");
  const status = PRODUCT_STATUSES.includes(statusParam as ProductStatus) ? (statusParam as ProductStatus) : undefined;
  const category = first(sp, "category");
  const page = clampInt(first(sp, "page"), 1, 1000, 1);
  const repo = getRepository();
  const [result, categories] = await Promise.all([
    repo.searchProducts({
      q,
      category,
      statuses: status ? [status] : [...PRODUCT_STATUSES],
      storeId: session.storeId,
      page,
      pageSize: 20,
    }),
    repo.getCategories(),
  ]);
  const L = t.admin.productList;

  return (
    <div className="space-y-6">
      <FlashToast show={first(sp, "deleted") === "1"} message={t.admin.toast.deleted} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.admin.products}</h1>
          <p className="mt-1 text-sm text-muted">{fmt(t.common.results, { count: result.total })}</p>
        </div>
        <Link href={`/${locale}/admin/products/new`} className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden /> {t.admin.addProduct}
        </Link>
      </div>

      <form className="grid gap-3 sm:grid-cols-[1fr_180px_200px]" action={`/${locale}/admin/products`}>
        <label className="relative">
          <span className="sr-only">{t.common.search}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input name="q" type="search" defaultValue={q} placeholder={L.searchPlaceholder} className={`${inputStyles} pl-9`} />
        </label>
        <label>
          <span className="sr-only">{L.status}</span>
          <AutoSubmitSelect name="status" defaultValue={status ?? ""}>
            <option value="">{L.status}: {t.common.all}</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>{t.productStatus[s]}</option>
            ))}
          </AutoSubmitSelect>
        </label>
        <label>
          <span className="sr-only">{L.category}</span>
          <AutoSubmitSelect name="category" defaultValue={category ?? ""}>
            <option value="">{L.category}: {t.common.all}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{localized(c.name, locale)}</option>
            ))}
          </AutoSubmitSelect>
        </label>
      </form>

      {result.items.length === 0 ? (
        <div className={`${cardStyles} px-6 py-16 text-center text-muted`}>{L.empty}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${cardStyles} hidden overflow-hidden md:block`}>
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2/60 text-left text-xs uppercase tracking-wider text-subtle">
                <tr>
                  <th scope="col" className="w-16 px-4 py-3 font-medium">{L.photo}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{L.product}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{L.status}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{L.price}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{L.stock}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{L.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <span className="relative block size-12 overflow-hidden rounded-lg bg-surface-3">
                        <PartImage src={primaryImage(p)} alt="" sizes="48px" />
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <Link href={`/${locale}/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:text-brand">
                        {localized(p.title, locale)}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-subtle">
                        {p.inventoryCode}{p.oemNumber ? ` · OEM ${p.oemNumber}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={productStatusTone[p.status]}>{t.productStatus[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatPrice(p.price, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{p.quantity}</td>
                    <td className="px-4 py-3">
                      <RowActions product={p} locale={locale} labels={{ edit: t.common.edit, sold: L.markSold, available: L.markAvailable }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {result.items.map((p) => (
              <li key={p.id} className={`${cardStyles} p-3`}>
                <div className="flex gap-3">
                  <Link href={`/${locale}/admin/products/${p.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    <PartImage src={primaryImage(p)} alt="" sizes="80px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/${locale}/admin/products/${p.id}`} className="line-clamp-2 text-sm font-medium">
                      {localized(p.title, locale)}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-subtle">{p.inventoryCode}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge tone={productStatusTone[p.status]}>{t.productStatus[p.status]}</Badge>
                      <span className="font-semibold">{formatPrice(p.price, locale)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <RowActions product={p} locale={locale} labels={{ edit: t.common.edit, sold: L.markSold, available: L.markAvailable }} wide />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath={`/${locale}/admin/products`}
            params={{ q, status, category }}
            labels={{ previous: t.common.previous, next: t.common.next, page: fmt(t.common.page, { page: result.page, total: result.pageCount }) }}
          />
        </>
      )}
    </div>
  );
}

function RowActions({
  product,
  locale,
  labels,
  wide,
}: {
  product: Product;
  locale: string;
  labels: { edit: string; sold: string; available: string };
  wide?: boolean;
}) {
  const next: ProductStatus | null = product.status === "available" ? "sold" : product.status === "sold" ? "available" : null;
  return (
    <div className={wide ? "grid grid-cols-2 gap-2" : "flex justify-end gap-2"}>
      {next && (
        <form action={setProductStatusAction}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="status" value={next} />
          <SubmitButton className={buttonStyles("outline", "sm", wide ? "w-full" : "")}>
            {next === "sold" ? <Tag className="size-3.5" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
            {next === "sold" ? labels.sold : labels.available}
          </SubmitButton>
        </form>
      )}
      <Link href={`/${locale}/admin/products/${product.id}`} className={buttonStyles("secondary", "sm", wide ? "w-full" : "")}>
        <Pencil className="size-3.5" aria-hidden /> {labels.edit}
      </Link>
    </div>
  );
}
