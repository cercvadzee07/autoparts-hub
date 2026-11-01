import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { first } from "@/lib/search-params";
import { VIN_STATUSES, type VinStatus } from "@/lib/types";
import { clampInt, cn, formatDate } from "@/lib/utils";
import { Badge, vinStatusTone } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { cardStyles } from "@/components/ui/styles";

export default async function AdminVinRequestsPage({ params, searchParams }: PageProps<"/[locale]/admin/vin-requests">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const sp = await searchParams;
  const statusParam = first(sp, "status");
  const status = VIN_STATUSES.includes(statusParam as VinStatus) ? (statusParam as VinStatus) : undefined;
  const page = clampInt(first(sp, "page"), 1, 1000, 1);
  const result = await getRepository().listVinRequests(session.storeId, { status, page, pageSize: 20 });
  const L = t.admin.vinList;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.admin.vinRequests}</h1>
      <nav className="flex flex-wrap gap-1.5" aria-label={L.status}>
        {[undefined, ...VIN_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={`/${locale}/admin/vin-requests${s ? `?status=${s}` : ""}`}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              status === s ? "border-brand bg-brand-soft text-text" : "border-line text-muted hover:text-text",
            )}
          >
            {s ? t.vinStatus[s] : t.common.all}
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <div className={`${cardStyles} px-6 py-16 text-center text-muted`}>{L.empty}</div>
      ) : (
        <ul className={`${cardStyles} divide-y divide-line overflow-hidden`}>
          {result.items.map((v) => (
            <li key={v.id}>
              <Link href={`/${locale}/admin/vin-requests/${v.id}`} className="flex items-start gap-4 px-4 py-4 hover:bg-surface-2 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tracking-wider">{v.vin}</p>
                  <p className="mt-0.5 truncate text-sm">
                    {v.vehicleModel} — <span className="text-muted">{v.partDescription}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-subtle">
                    {v.phone} · {formatDate(v.createdAt, locale, true)}
                    {v.imageUrl && <ImageIcon className="size-3.5" aria-label={L.hasPhoto} />}
                  </p>
                </div>
                <Badge tone={vinStatusTone[v.status]}>{t.vinStatus[v.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath={`/${locale}/admin/vin-requests`}
        params={{ status }}
        labels={{ previous: t.common.previous, next: t.common.next, page: fmt(t.common.page, { page: result.page, total: result.pageCount }) }}
      />
    </div>
  );
}
