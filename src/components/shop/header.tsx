"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { brand } from "@/config/brand";
import { useI18n } from "@/i18n/provider";
import { cn, telHref } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useCart } from "@/components/cart/cart-store";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  // Close the mobile menu after navigation.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const links = [
    { href: `/${locale}/catalog`, label: dict.nav.catalog },
    { href: `/${locale}/vin-request`, label: dict.nav.vin },
    { href: `/${locale}#contact`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/85 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm"
      >
        {dict.nav.skipToContent}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link href={`/${locale}`} className="shrink-0" aria-label={brand.name}>
          <Logo />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(l.href) ? "text-text" : "text-muted hover:text-text",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form action={`/${locale}/catalog`} role="search" className="ml-auto hidden max-w-sm flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">{dict.common.search}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              name="q"
              type="search"
              placeholder={dict.common.searchPlaceholder}
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-subtle focus:border-brand focus:outline-none"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a
            href={telHref(brand.contact.phoneE164)}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-text xl:flex"
          >
            <Phone className="size-4 text-brand" aria-hidden />
            {brand.contact.phoneDisplay}
          </a>
          <LanguageSwitcher className="hidden sm:flex" />
          <Link
            href={`/${locale}/cart`}
            className="relative inline-flex size-10 items-center justify-center rounded-lg border border-line text-text transition-colors hover:border-line-strong hover:bg-surface-2"
            aria-label={`${dict.nav.cart} (${count})`}
          >
            <ShoppingBag className="size-[18px]" aria-hidden />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? dict.nav.close : dict.nav.menu}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-bg lg:hidden">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
            <form action={`/${locale}/catalog`} role="search" className="md:hidden">
              <label className="relative block">
                <span className="sr-only">{dict.common.search}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                <input
                  name="q"
                  type="search"
                  placeholder={dict.common.searchPlaceholder}
                  className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-subtle focus:border-brand focus:outline-none"
                />
              </label>
            </form>
            <nav className="grid gap-1" aria-label="Mobile">
              {[{ href: `/${locale}`, label: dict.nav.home }, ...links].map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 text-base font-medium hover:bg-surface-2">
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <a href={telHref(brand.contact.phoneE164)} className="flex items-center gap-2 text-sm font-medium">
                <Phone className="size-4 text-brand" aria-hidden />
                {brand.contact.phoneDisplay}
              </a>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
