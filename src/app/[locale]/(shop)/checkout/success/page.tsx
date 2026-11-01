import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { first } from "@/lib/search-params";
import { telHref } from "@/lib/utils";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const raw = first(await searchParams, "n") ?? "";
  // Only echo values that look like order numbers.
  const number = /^[A-Z]{1,5}-\d{1,10}(, [A-Z]{1,5}-\d{1,10})*$/.test(raw) ? raw : "—";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <div className={`${cardStyles} relative overflow-hidden p-8 text-center sm:p-12`}>
        <div className="hero-glow absolute inset-0" aria-hidden />
        <div className="relative">
          <CheckCircle2 className="mx-auto mb-6 size-14 text-success" aria-hidden />
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.checkout.successTitle}</h1>
          <p className="mt-4 text-muted">{fmt(t.checkout.successText, { number })}</p>
          <p className="mx-auto mt-6 w-fit rounded-xl border border-line-strong bg-bg/60 px-5 py-3 font-mono text-xl font-semibold tracking-wider">
            {number}
          </p>
          <p className="mt-6 text-sm text-subtle">{t.checkout.successNext}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/${locale}/catalog`} className={buttonStyles("primary")}>{t.checkout.backToCatalog}</Link>
            <a href={telHref(brand.contact.phoneE164)} className={buttonStyles("outline")}>
              <Phone className="size-4" aria-hidden /> {brand.contact.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
