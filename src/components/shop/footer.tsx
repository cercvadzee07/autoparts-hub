import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { telHref } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import type { Category } from "@/lib/types";
import { LanguageSwitcher } from "./language-switcher";

export function Footer({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const t = getDictionary(locale);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t.footer.about}</p>
          <LanguageSwitcher className="w-fit" />
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-subtle">{t.footer.shop}</h2>
          <ul className="grid gap-2.5 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/${locale}/catalog?category=${c.slug}`} className="text-muted hover:text-text">
                  {c.name[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-subtle">{t.footer.help}</h2>
          <ul className="grid gap-2.5 text-sm">
            <li>
              <Link href={`/${locale}/catalog`} className="text-muted hover:text-text">{t.nav.catalog}</Link>
            </li>
            <li>
              <Link href={`/${locale}/vin-request`} className="text-muted hover:text-text">{t.nav.vin}</Link>
            </li>
            <li>
              <Link href={`/${locale}/cart`} className="text-muted hover:text-text">{t.nav.cart}</Link>
            </li>
          </ul>
          <p className="mt-6 text-sm font-medium">{t.footer.howToOrder}</p>
          <p className="mt-1 text-sm text-muted">{t.footer.howToOrderText}</p>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-subtle">{t.footer.contacts}</h2>
          <ul className="grid gap-3 text-sm text-muted">
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <a href={telHref(brand.contact.phoneE164)} className="hover:text-text">{brand.contact.phoneDisplay}</a>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>{brand.contact.address[locale]}</span>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>{brand.contact.hours[locale]}</span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <a href={`mailto:${brand.contact.email}`} className="hover:text-text">{brand.contact.email}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} {brand.name}. {t.footer.rights}</p>
          <Link href={`/${locale}/admin`} className="hover:text-muted">{t.nav.admin}</Link>
        </div>
      </div>
    </footer>
  );
}
