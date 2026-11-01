import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternates } from "@/lib/seo";
import { telHref } from "@/lib/utils";
import { VinForm } from "@/components/shop/vin-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/vin-request">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.meta.vinTitle, description: t.meta.vinDescription, alternates: alternates(locale, "/vin-request") };
}

export default async function VinRequestPage({ params }: PageProps<"/[locale]/vin-request">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.vin.title}</h1>
          <p className="mt-4 leading-relaxed text-muted">{t.vin.intro}</p>
          <ol className="mt-10 space-y-6">
            {t.vin.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand-soft font-display text-sm font-semibold text-red-300">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <a href={telHref(brand.contact.phoneE164)} className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-text">
            <Phone className="size-4 text-brand" aria-hidden />
            {t.common.callUs}: {brand.contact.phoneDisplay}
          </a>
        </div>
        <VinForm />
      </div>
    </div>
  );
}
