import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Camera, Clock, MapPin, PhoneCall, Search, Truck } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale, siteUrl } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { getRepository } from "@/lib/data";
import { jsonLd } from "@/lib/seo";
import { telHref } from "@/lib/utils";
import { buttonStyles, cardStyles, sectionTitle } from "@/components/ui/styles";
import { ProductGrid } from "@/components/shop/product-card";
import { SedanIllustration } from "@/components/shop/sedan-illustration";
import { VehicleSelector } from "@/components/shop/vehicle-selector";

const BENEFIT_ICONS = [BadgeCheck, Camera, PhoneCall, Truck];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const repo = getRepository();

  const [vehicles, categories, counts, featured, recent] = await Promise.all([
    repo.getVehicleTree(),
    repo.getCategories(),
    repo.getCategoryCounts(),
    repo.searchProducts({ featured: true, statuses: ["available"], pageSize: 8 }),
    repo.searchProducts({ statuses: ["available"], sort: "newest", pageSize: 8 }),
  ]);
  const totalInStock = Object.values(counts).reduce((a, b) => a + b, 0);
  const camryGenerations = vehicles.flatMap((m) => m.models).find((m) => m.slug === "camry")?.generations.length ?? 0;

  const organization = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: brand.name,
    url: `${siteUrl()}/${locale}`,
    telephone: brand.contact.phoneE164,
    email: brand.contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.contact.address[locale],
      addressLocality: brand.contact.city,
      addressCountry: "GE",
    },
    openingHours: "Mo-Sa 10:00-19:00",
    priceRange: "₾₾",
    currenciesAccepted: "GEL",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="hero-glow absolute inset-0" aria-hidden />
        <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-16 lg:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-fade-up">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                {t.home.eyebrow}
              </p>
              <h1
                className={`font-display font-semibold leading-[1.1] tracking-tight text-balance ${
                  // Georgian words are long; a slightly smaller scale keeps the hero to ~4 lines.
                  locale === "ka" ? "text-[1.8rem] sm:text-[2.6rem] lg:text-[3.1rem]" : "text-[2.1rem] sm:text-5xl lg:text-[3.6rem]"
                }`}
              >
                {t.home.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{t.home.heroText}</p>

              <form action={`/${locale}/catalog`} role="search" className="mt-8 flex max-w-xl gap-2">
                <label className="relative flex-1">
                  <span className="sr-only">{t.common.search}</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle" aria-hidden />
                  <input
                    type="search"
                    name="q"
                    placeholder={t.common.searchPlaceholder}
                    className="h-13 w-full rounded-xl border border-line-strong bg-surface/90 pl-12 pr-4 text-[15px] placeholder:text-subtle backdrop-blur focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                </label>
                <button type="submit" className={buttonStyles("primary", "lg", "h-13 px-5 sm:px-7")}>
                  <span className="hidden sm:inline">{t.home.findParts}</span>
                  <ArrowRight className="size-5 sm:hidden" aria-label={t.home.findParts} />
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Link href={`/${locale}/vin-request`} className="font-medium text-text underline decoration-brand decoration-2 underline-offset-4 hover:text-brand">
                  {t.home.vinCta}
                </Link>
                <a href={telHref(brand.contact.phoneE164)} className="text-muted hover:text-text">
                  {t.common.callUs}: {brand.contact.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="relative animate-fade-up [animation-delay:120ms]">
              {brand.heroImage ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-line">
                  <Image src={brand.heroImage} alt="Toyota Camry" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </div>
              ) : (
                <SedanIllustration className="w-full drop-shadow-2xl lg:scale-110" />
              )}
            </div>
          </div>

          {/* Stats */}
          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-8 sm:max-w-2xl">
            <div>
              <dt className="text-xs text-subtle sm:text-sm">{t.home.statsParts}</dt>
              <dd className="font-display text-2xl font-semibold sm:text-3xl">{totalInStock}+</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle sm:text-sm">{t.home.statsGenerations}</dt>
              <dd className="font-display text-2xl font-semibold sm:text-3xl">{camryGenerations}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle sm:text-sm">{t.home.statsDelivery}</dt>
              <dd className="font-display text-2xl font-semibold sm:text-3xl">24–72h</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Vehicle selector ─────────────────────────────────── */}
      <section className="relative z-10 mx-auto -mt-px max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`${cardStyles} -translate-y-6 p-5 shadow-2xl shadow-black/40 sm:p-6`}>
          <h2 className="mb-4 text-sm font-semibold">{t.home.vehicleTitle}</h2>
          <VehicleSelector makes={vehicles} />
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className={sectionTitle}>{t.home.categoriesTitle}</h2>
          <p className="mt-2 text-muted">{t.home.categoriesText}</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/catalog?category=${c.slug}`}
                className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/50 hover:bg-surface-2"
              >
                <span className="relative size-12 overflow-hidden rounded-xl bg-surface-3">
                  <Image src={`/parts/${c.icon}.svg`} alt="" fill unoptimized className="object-contain p-1.5 opacity-90 transition-transform group-hover:scale-110" />
                </span>
                <span className="text-sm font-medium leading-snug">{c.name[locale]}</span>
                <span className="mt-auto text-xs text-subtle">{fmt(t.home.partsCount, { count: counts[c.slug] ?? 0 })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Featured ─────────────────────────────────────────── */}
      {featured.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeader title={t.home.featuredTitle} href={`/${locale}/catalog`} linkLabel={t.common.viewAll} />
          <ProductGrid products={featured.items} locale={locale} />
        </section>
      )}

      {/* ── Benefits ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className={`${sectionTitle} mb-8`}>{t.home.benefitsTitle}</h2>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.home.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[i];
            return (
              <div key={b.title} className="bg-surface p-6">
                <Icon className="mb-4 size-6 text-brand" aria-hidden />
                <h3 className="font-medium">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Recent ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader title={t.home.recentTitle} href={`/${locale}/catalog?sort=newest`} linkLabel={t.common.viewAll} />
        <ProductGrid products={recent.items} locale={locale} />
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="hero-glow absolute inset-0 opacity-70" aria-hidden />
          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <h2 className={sectionTitle}>{t.home.contactTitle}</h2>
              <p className="mt-3 max-w-md text-muted">{t.home.contactText}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={telHref(brand.contact.phoneE164)} className={buttonStyles("primary", "lg")}>
                  <PhoneCall className="size-5" aria-hidden />
                  {brand.contact.phoneDisplay}
                </a>
                <a href={`https://wa.me/${brand.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className={buttonStyles("outline", "lg")}>
                  {t.common.whatsapp}
                </a>
              </div>
            </div>
            <dl className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-bg/60 p-5">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-subtle">
                  <MapPin className="size-4 text-brand" aria-hidden /> {t.home.address}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed">{brand.contact.address[locale]}</dd>
                <a href={brand.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-brand hover:underline">
                  {t.home.openMap} →
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-bg/60 p-5">
                <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-subtle">
                  <Clock className="size-4 text-brand" aria-hidden /> {t.home.hours}
                </dt>
                <dd className="mt-3 text-sm">{brand.contact.hours[locale]}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className={sectionTitle}>{title}</h2>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-text">
        {linkLabel} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
