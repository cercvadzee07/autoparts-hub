import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Camera, MapPin, Wrench } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { alternates } from "@/lib/seo";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

const ICONS = [Wrench, Camera, BadgeCheck, MapPin];

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.about.title, description: t.about.metaDescription, alternates: alternates(locale, "/about") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="h-9 w-1.5 rounded-full bg-brand" aria-hidden />
        {t.about.title}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-200">{t.about.intro}</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {t.about.points.map((p, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={p.title} className={`${cardStyles} p-6`}>
              <Icon className="mb-4 size-7 text-brand" aria-hidden />
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.text}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/${locale}/catalog`} className={buttonStyles("primary", "lg")}>{t.nav.allParts}</Link>
        <Link href={`/${locale}#contact`} className={buttonStyles("outline", "lg")}>{t.nav.contact}</Link>
      </div>
      <p className="mt-8 text-sm text-subtle">{brand.contact.address[locale]} · {brand.contact.hours[locale]}</p>
    </div>
  );
}
