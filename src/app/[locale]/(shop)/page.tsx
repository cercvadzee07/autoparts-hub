import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Headset, MapPin, PhoneCall, Search, Send, ShieldCheck, Truck } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale, siteUrl } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getRepository } from "@/lib/data";
import { jsonLd } from "@/lib/seo";
import { categoryImage, heroImage } from "@/lib/site-images";
import { localized, telHref } from "@/lib/utils";
import { buttonStyles, sectionTitle } from "@/components/ui/styles";
import { ProductGrid } from "@/components/shop/product-card";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const repo = getRepository();

  const [vehicles, categories, featured, recent] = await Promise.all([
    repo.getVehicleTree(),
    repo.getCategories(),
    repo.searchProducts({ featured: true, statuses: ["available"], pageSize: 8 }),
    repo.searchProducts({ statuses: ["available"], sort: "newest", pageSize: 8 }),
  ]);
  const generations = [...(vehicles.flatMap((m) => m.models).find((m) => m.slug === "camry")?.generations ?? [])].sort(
    (a, b) => a.yearFrom - b.yearFrom,
  );
  const hero = heroImage();

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
      postalCode: brand.contact.postalCode,
      addressCountry: "GE",
    },
    geo: { "@type": "GeoCoordinates", latitude: brand.contact.geo.lat, longitude: brand.contact.geo.lng },
    hasMap: brand.contact.mapUrl,
    openingHours: "Mo-Sa 10:00-19:00",
    priceRange: "₾₾",
    currenciesAccepted: "GEL",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-line bg-[#0b0b0e]">
        {hero ? (
          <>
            <Image src={hero} alt="Toyota Camry" fill priority sizes="100vw" className="-z-20 object-cover object-[70%_center]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0b0e] via-[#0b0b0e]/80 to-transparent" aria-hidden />
          </>
        ) : (
          <div className="absolute inset-0 -z-10" aria-hidden>
            {/* Showroom backdrop: window light, floor glow */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_90px,rgb(255_255_255/0.025)_90px,rgb(255_255_255/0.025)_160px)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#16161a] to-transparent" />
            <div className="absolute bottom-[12%] right-[-5%] h-48 w-[70%] rounded-[50%] bg-brand/20 blur-3xl" />
          </div>
        )}
        {/* Red diagonal accent stripes */}
        <div className="pointer-events-none absolute -right-16 -top-10 -z-10 flex rotate-[35deg] gap-5" aria-hidden>
          <span className="h-80 w-10 bg-brand/90" />
          <span className="h-80 w-4 bg-brand/60" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[480px] lg:grid-cols-[1.35fr_1fr] lg:px-8">
          <div className="animate-fade-up">
            <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.1rem] lg:[&>span]:whitespace-nowrap">
              <span className="block">{t.home.heroLine1}</span>
              <span className="block">
                <span className="text-brand">{t.home.heroAccent}</span>
                {t.home.heroLine2 && ` ${t.home.heroLine2}`}
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base font-medium leading-relaxed text-zinc-200 sm:text-lg">{t.home.heroSubtitle}</p>

            <form action={`/${locale}/catalog`} role="search" className="mt-8 flex max-w-xl overflow-hidden rounded-xl shadow-2xl shadow-black/50">
              <label className="relative flex-1">
                <span className="sr-only">{t.common.search}</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-900" aria-hidden />
                <input
                  type="search"
                  name="q"
                  placeholder={t.home.searchShort}
                  className="h-14 w-full bg-white pl-12 pr-4 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
                />
              </label>
              <button type="submit" className="bg-brand px-6 text-base font-bold text-white transition-colors hover:bg-brand-hover sm:px-9">
                {t.common.search}
              </button>
            </form>

            {generations.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="mr-1 text-sm font-semibold">{t.home.generationsLabel}</span>
                {generations.map((g) => (
                  <Link
                    key={g.id}
                    href={`/${locale}/catalog?generation=${g.slug}`}
                    title={`${g.name} · ${g.yearFrom}–${g.yearTo ?? ""}`}
                    className="rounded-xl border border-line-strong bg-surface-2/80 px-4 py-2 text-sm font-semibold backdrop-blur transition-colors hover:border-brand hover:bg-brand"
                  >
                    {g.code}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {!hero && (
            <div className="relative animate-fade-up [animation-delay:120ms] lg:-mr-10 lg:scale-110">
              {/* Ground shadow + brand glow under the car */}
              <div className="absolute inset-x-[6%] bottom-[2%] h-[14%] rounded-[50%] bg-black/80 blur-xl" aria-hidden />
              <div className="absolute inset-x-[15%] bottom-[-4%] h-[18%] rounded-[50%] bg-brand/25 blur-3xl" aria-hidden />
              <Image
                src="/images/hero-camry-red.webp"
                alt="Toyota Camry"
                width={820}
                height={281}
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="relative w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Categories (light band) ──────────────────────────── */}
      <section className="bg-[#f1f1f3] text-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 flex items-center gap-3 font-display text-xl font-bold sm:text-2xl">
            <span className="h-7 w-1.5 rounded-full bg-brand" aria-hidden />
            {t.home.categoriesTitle}
          </h2>
          <div className="grid gap-4 lg:grid-cols-[1fr_270px]">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {categories.map((c) => {
                const photo = categoryImage(c.slug);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/${locale}/catalog?category=${c.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg"
                    >
                      <span className="relative block aspect-[4/3] bg-gradient-to-b from-zinc-50 to-zinc-200/80">
                        <Image
                          src={photo ?? `/parts/dark/${c.icon}.svg`}
                          alt=""
                          fill
                          unoptimized={!photo}
                          sizes="(min-width: 1280px) 160px, (min-width: 640px) 25vw, 50vw"
                          className={photo ? "object-cover" : "object-contain p-4 transition-transform duration-300 group-hover:scale-105"}
                        />
                      </span>
                      <span className="flex flex-1 items-center justify-between gap-2 px-3 py-3">
                        <span className="text-sm font-semibold leading-snug">{localized(c.name, locale)}</span>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-800 transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                          <ArrowRight className="size-3.5" aria-hidden />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href={`/${locale}/catalog`}
              className="group relative isolate flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a2a30] via-[#141417] to-black p-6 text-white shadow-xl"
            >
              <div className="pointer-events-none absolute -right-10 top-6 -z-10 flex rotate-[35deg] gap-3" aria-hidden>
                <span className="h-72 w-6 bg-brand/80" />
                <span className="h-72 w-2.5 bg-brand/50" />
              </div>
              <div className="pointer-events-none absolute -left-16 bottom-10 -z-10 h-1 w-64 rotate-[-25deg] bg-brand/70" aria-hidden />
              <p className="font-display text-3xl font-black tracking-[0.12em] text-brand">TOYOTA</p>
              <p className="font-display text-3xl font-bold">{t.home.promoTitle}</p>
              <p className="mt-3 text-[15px] font-medium leading-snug text-zinc-200">{t.home.promoText}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 group-hover:text-white">
                {t.nav.allParts} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Benefits strip ───────────────────────────────────── */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <ul className="grid flex-1 gap-6 sm:grid-cols-3 sm:gap-0">
            {[
              { icon: ShieldCheck, text: t.home.stripWarranty },
              { icon: Truck, text: t.home.stripDelivery },
              { icon: Headset, text: t.home.stripSupport },
            ].map(({ icon: Icon, text }, i) => (
              <li key={text} className={`flex items-center gap-4 sm:px-6 ${i > 0 ? "sm:border-l sm:border-line-strong" : "sm:pl-0"}`}>
                <Icon className="size-11 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
                <span className="max-w-[12rem] text-[15px] font-semibold leading-snug">{text}</span>
              </li>
            ))}
          </ul>
          <Link href={`/${locale}/vin-request`} className={buttonStyles("primary", "lg", "h-14 shrink-0 px-7 text-[15px] font-bold")}>
            <Send className="size-5" aria-hidden />
            {t.home.stripCta}
          </Link>
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────── */}
      {featured.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
          <SectionHeader title={t.home.featuredTitle} href={`/${locale}/catalog`} linkLabel={t.common.viewAll} />
          <ProductGrid products={featured.items} locale={locale} />
        </section>
      )}

      {/* ── Recent ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <SectionHeader title={t.home.recentTitle} href={`/${locale}/catalog?sort=newest`} linkLabel={t.common.viewAll} />
        <ProductGrid products={recent.items} locale={locale} />
      </section>

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-14 sm:px-6 lg:px-8">
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
          {/* Embedded map of the shop (no API key needed). */}
          <div className="relative h-72 border-t border-line sm:h-96">
            <iframe
              title={`${t.home.address}: ${brand.contact.address[locale]}`}
              src={`https://maps.google.com/maps?q=${brand.contact.geo.lat},${brand.contact.geo.lng}&z=16&hl=${locale}&output=embed`}
              className="absolute inset-0 h-full w-full grayscale-[35%] invert-[0.9] hue-rotate-180"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className={`${sectionTitle} flex items-center gap-3`}>
        <span className="h-7 w-1.5 rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-text">
        {linkLabel} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
