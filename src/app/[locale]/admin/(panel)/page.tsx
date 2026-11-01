import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Package, Plus, ScanSearch, type LucideIcon } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Badge, orderStatusTone } from "@/components/ui/badge";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

const ACTIVITY_ICON: Record<string, LucideIcon> = { order: ClipboardList, vin: ScanSearch, inventory: Package };

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const repo = getRepository();
  const [stats, activity, latest] = await Promise.all([
    repo.getDashboardStats(session.storeId),
    repo.getRecentActivity(session.storeId, 12),
    repo.listOrders(session.storeId, { pageSize: 5 }),
  ]);

  const cards = [
    { label: t.admin.stats.totalProducts, value: stats.totalProducts, href: `/${locale}/admin/products` },
    { label: t.admin.stats.available, value: stats.availableProducts, href: `/${locale}/admin/products?status=available` },
    { label: t.admin.stats.sold, value: stats.soldProducts, href: `/${locale}/admin/products?status=sold` },
    { label: t.admin.stats.reserved, value: stats.reservedProducts, href: `/${locale}/admin/products?status=reserved` },
    { label: t.admin.stats.newOrders, value: stats.newOrders, href: `/${locale}/admin/orders?status=new`, highlight: stats.newOrders > 0 },
    { label: t.admin.stats.pendingOrders, value: stats.pendingOrders, href: `/${locale}/admin/orders` },
    { label: t.admin.stats.newVin, value: stats.newVinRequests, href: `/${locale}/admin/vin-requests?status=new`, highlight: stats.newVinRequests > 0 },
    { label: t.admin.stats.revenue, value: formatPrice(stats.completedRevenue, locale), href: `/${locale}/admin/orders?status=completed` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.admin.dashboard}</h1>
        <Link href={`/${locale}/admin/products/new`} className={buttonStyles("primary", "md")}>
          <Plus className="size-4" aria-hidden /> {t.admin.addProduct}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={cn(
              cardStyles,
              "p-4 transition-colors hover:border-line-strong sm:p-5",
              c.highlight && "border-brand/50 bg-brand-soft",
            )}
          >
            <p className="text-xs text-muted sm:text-sm">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className={`${cardStyles} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">{t.admin.latestOrders}</h2>
            <Link href={`/${locale}/admin/orders`} className="text-sm text-muted hover:text-text">{t.common.viewAll} →</Link>
          </div>
          {latest.items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">{t.admin.orderList.empty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {latest.items.map((o) => (
                <li key={o.id}>
                  <Link href={`/${locale}/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
                      <p className="truncate text-xs text-muted">{o.customerName} · {o.phone}</p>
                    </div>
                    <div className="text-right">
                      <Badge tone={orderStatusTone[o.status]}>{t.orderStatus[o.status]}</Badge>
                      <p className="mt-1 text-xs text-subtle">{formatPrice(o.total, locale)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardStyles} overflow-hidden`}>
          <h2 className="border-b border-line px-5 py-4 font-semibold">{t.admin.recentActivity}</h2>
          {activity.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">{t.admin.noActivity}</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind];
                const body = (
                  <>
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-3">
                      <Icon className="size-4 text-muted" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.admin.activity[a.action] ?? a.action}</p>
                      <p className="truncate text-xs text-muted">{a.label}</p>
                    </div>
                    <time className="shrink-0 text-xs text-subtle" dateTime={a.createdAt}>
                      {formatDate(a.createdAt, locale, true)}
                    </time>
                  </>
                );
                return (
                  <li key={`${a.kind}-${a.id}`}>
                    {a.href ? (
                      <Link href={`/${locale}${a.href}`} className="flex gap-3 px-5 py-3 hover:bg-surface-2">{body}</Link>
                    ) : (
                      <div className="flex gap-3 px-5 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
