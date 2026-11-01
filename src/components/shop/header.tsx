"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, House, Menu, Phone, Search, ShoppingCart, UserRound, X } from "lucide-react";
import { useState } from "react";
import { brand } from "@/config/brand";
import { useI18n } from "@/i18n/provider";
import type { Category } from "@/lib/types";
import { cn, localized, telHref } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useCart } from "@/components/cart/cart-store";
import { LanguageSwitcher } from "./language-switcher";

export function Header({ categories }: { categories: Category[] }) {
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

  const base = `/${locale}`;
  const links = [
    { href: base, label: dict.nav.home, exact: true },
    { href: `${base}/catalog`, label: dict.nav.catalog, dropdown: true },
    { href: `${base}/vin-request`, label: dict.nav.vin },
    { href: `${base}/about`, label: dict.nav.about },
    { href: `${base}#contact`, label: dict.nav.contact },
  ];
  const isActive = (href: string, exact?: boolean) =>
    href.includes("#") ? false : exact ? pathname === href : pathname.startsWith(href);

  const cartLink = (
    <Link
      href={`${base}/cart`}
      className="relative inline-flex size-11 items-center justify-center rounded-lg text-text transition-colors hover:bg-surface-2"
      aria-label={`${dict.nav.cart} (${count})`}
    >
      <ShoppingCart className="size-6" aria-hidden />
      <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
        {count}
      </span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm"
      >
        {dict.nav.skipToContent}
      </a>

      {/* ── Desktop ── */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-8 px-8 py-4 lg:flex">
        <Link href={base} aria-label={brand.name}>
          <Logo />
        </Link>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <a href={telHref(brand.contact.phoneE164)} className="flex items-center gap-2.5 text-[15px] font-semibold hover:text-brand">
              <Phone className="size-5" aria-hidden />
              {brand.contact.phoneDisplay}
            </a>
            <span className="h-7 w-px bg-line-strong" aria-hidden />
            <Link
              href={`${base}/admin`}
              className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-2"
              aria-label={dict.nav.admin}
              title={dict.nav.admin}
            >
              <UserRound className="size-6" aria-hidden />
            </Link>
            {cartLink}
          </div>
          <nav aria-label="Main" className="flex items-center rounded-xl border border-line bg-surface/70 p-1">
            {links.map((l, i) => {
              const active = isActive(l.href, l.exact);
              const item = (
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2.5 text-[15px] font-semibold transition-colors",
                    active ? "bg-brand text-white shadow-[0_8px_24px_-10px_var(--brand)]" : "text-text/90 hover:text-white",
                  )}
                >
                  {l.exact && <House className="size-[18px]" aria-hidden />}
                  {l.label}
                  {l.dropdown && <ChevronDown className="size-4 opacity-70 transition-transform group-hover:rotate-180" aria-hidden />}
                </Link>
              );
              return (
                <div key={l.href} className="flex items-center">
                  {i > 0 && !active && !isActive(links[i - 1].href, links[i - 1].exact) && (
                    <span className="h-6 w-px bg-line-strong" aria-hidden />
                  )}
                  {l.dropdown ? (
                    <div className="group relative">
                      {item}
                      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                        <ul className="w-64 rounded-xl border border-line bg-surface-2 p-2 shadow-2xl shadow-black/60">
                          <li>
                            <Link href={`${base}/catalog`} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-surface-3">
                              {dict.nav.allParts}
                            </Link>
                          </li>
                          {categories.map((c) => (
                            <li key={c.id}>
                              <Link href={`${base}/catalog?category=${c.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-3">
                                {localized(c.name, locale)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    item
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:hidden">
        <Link href={base} aria-label={brand.name}>
          <Logo compact />
        </Link>
        <div className="flex items-center gap-1">
          {cartLink}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-line"
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
            <form action={`${base}/catalog`} role="search">
              <label className="relative block">
                <span className="sr-only">{dict.common.search}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <input
                  name="q"
                  type="search"
                  placeholder={dict.home.searchShort}
                  className="h-11 w-full rounded-lg bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            </form>
            <nav className="grid gap-1" aria-label="Mobile">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-3 text-base font-semibold",
                    isActive(l.href, l.exact) ? "bg-brand text-white" : "hover:bg-surface-2",
                  )}
                >
                  {l.exact && <House className="size-[18px]" aria-hidden />}
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <a href={telHref(brand.contact.phoneE164)} className="flex items-center gap-2 text-sm font-semibold">
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
