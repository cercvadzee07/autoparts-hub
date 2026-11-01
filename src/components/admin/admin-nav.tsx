"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Package, ScanSearch } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function AdminNav({ badges }: { badges: { orders: number; vin: number } }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const base = `/${locale}/admin`;
  const items = [
    { href: base, label: dict.admin.dashboard, icon: LayoutDashboard, exact: true, badge: 0 },
    { href: `${base}/products`, label: dict.admin.products, icon: Package, badge: 0 },
    { href: `${base}/orders`, label: dict.admin.orders, icon: ClipboardList, badge: badges.orders },
    { href: `${base}/vin-requests`, label: dict.admin.vinRequests, icon: ScanSearch, badge: badges.vin },
  ];
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden flex-col gap-1 lg:flex" aria-label={dict.admin.title}>
        {items.map(({ href, label, icon: Icon, exact, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href, exact) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(href, exact) ? "bg-surface-3 text-text" : "text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon className={cn("size-[18px]", isActive(href, exact) && "text-brand")} aria-hidden />
            <span className="flex-1">{label}</span>
            {badge > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
          </Link>
        ))}
      </nav>

      {/* Mobile bottom bar — thumb-friendly for the shop floor */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label={dict.admin.title}
      >
        {items.map(({ href, label, icon: Icon, exact, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href, exact) ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium",
              isActive(href, exact) ? "text-text" : "text-subtle",
            )}
          >
            <Icon className={cn("size-5", isActive(href, exact) && "text-brand")} aria-hidden />
            <span className="max-w-full truncate">{label}</span>
            {badge > 0 && (
              <span className="absolute right-[22%] top-1.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
