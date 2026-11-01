import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { logoutAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { LanguageSwitcher } from "@/components/shop/language-switcher";

export default async function AdminPanelLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const repo = getRepository();
  const stats = await repo.getDashboardStats(session.storeId);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/50 p-4 lg:flex">
        <Link href={`/${locale}/admin`} className="mb-8 px-2 pt-2">
          <Logo />
        </Link>
        <AdminNav badges={{ orders: stats.newOrders, vin: stats.newVinRequests }} />
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <p className="truncate px-2 text-xs text-subtle">{fmt(t.admin.signedInAs, { name: session.name })}</p>
          <LanguageSwitcher className="mx-2 w-fit" />
          <Link href={`/${locale}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:text-text">
            <ExternalLink className="size-4" aria-hidden /> {t.admin.viewSite}
          </Link>
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:text-red-400">
              <LogOut className="size-4" aria-hidden /> {t.admin.signOut}
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <Link href={`/${locale}/admin`}>
          <Logo compact />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href={`/${locale}`} className="rounded-lg p-2 text-muted" aria-label={t.admin.viewSite}>
            <ExternalLink className="size-5" />
          </Link>
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="rounded-lg p-2 text-muted" aria-label={t.admin.signOut}>
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>
      <div className="lg:hidden">
        <AdminNav badges={{ orders: stats.newOrders, vin: stats.newVinRequests }} />
      </div>

      <main id="main" className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {repo.mode === "demo" && (
          <p className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
            {t.admin.demoMode}
          </p>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
