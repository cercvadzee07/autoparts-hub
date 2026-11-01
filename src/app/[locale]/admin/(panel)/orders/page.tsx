import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { first } from "@/lib/search-params";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import { clampInt, cn, formatDate, formatPrice } from "@/lib/utils";
import { Badge, orderStatusTone } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { cardStyles, inputStyles } from "@/components/ui/styles";

export default async function AdminOrdersPage({ params, searchParams }: PageProps<"/[locale]/admin/orders">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const sp = await searchParams;
  const q = first(sp, "q");
  const statusParam = first(sp, "status");
  const status = ORDER_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;
  const page = clampInt(first(sp, "page"), 1, 1000, 1);
  const result = await getRepository().listOrders(session.storeId, { status, q, page, pageSize: 20 });
  const L = t.admin.orderList;
  const tabHref = (s?: OrderStatus) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const str = p.toString();
    return `/${locale}/admin/orders${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.admin.orders}</h1>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <nav className="flex w-max gap-1.5" aria-label={L.status}>
          {[undefined, ...ORDER_STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={tabHref(s)}
              aria-current={status === s ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                status === s ? "border-brand bg-brand-soft text-text" : "border-line text-muted hover:text-text",
              )}
            >
              {s ? t.orderStatus[s] : t.common.all}
            </Link>
          ))}
        </nav>
      </div>

      <form action={`/${locale}/admin/orders`} className="max-w-md">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="relative block">
          <span className="sr-only">{t.common.search}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input name="q" type="search" defaultValue={q} placeholder={L.searchPlaceholder} className={`${inputStyles} pl-9`} />
        </label>
      </form>

      {result.items.length === 0 ? (
        <div className={`${cardStyles} px-6 py-16 text-center text-muted`}>{L.empty}</div>
      ) : (
        <ul className={`${cardStyles} divide-y divide-line overflow-hidden`}>
          {result.items.map((o) => (
            <li key={o.id}>
              <Link
                href={`/${locale}/admin/orders/${o.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-4 hover:bg-surface-2 sm:grid-cols-[140px_1fr_140px_120px_auto] sm:px-5"
              >
                <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                <span className="justify-self-end sm:order-last">
                  <Badge tone={orderStatusTone[o.status]}>{t.orderStatus[o.status]}</Badge>
                </span>
                <span className="min-w-0 truncate text-sm">
                  {o.customerName} <span className="text-muted">· {o.phone}</span>
                </span>
                <span className="justify-self-end text-sm font-medium tabular-nums sm:justify-self-start">
                  {formatPrice(o.total, locale)}
                  <span className="ml-1 text-xs text-subtle">({o.items.length})</span>
                </span>
                <time className="col-span-2 text-xs text-subtle sm:col-span-1" dateTime={o.createdAt}>
                  {formatDate(o.createdAt, locale, true)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath={`/${locale}/admin/orders`}
        params={{ q, status }}
        labels={{ previous: t.common.previous, next: t.common.next, page: fmt(t.common.page, { page: result.page, total: result.pageCount }) }}
      />
    </div>
  );
}
