import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";
import { isLocale, siteUrl } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { getRepository } from "@/lib/data";
import { alternates, jsonLd } from "@/lib/seo";
import { formatPrice, localized, primaryImage, telHref } from "@/lib/utils";
import { AddToCart } from "@/components/cart/add-to-cart";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductGrid } from "@/components/shop/product-card";
import { Badge, conditionTone } from "@/components/ui/badge";
import { buttonStyles, cardStyles, sectionTitle } from "@/components/ui/styles";

async function load(slug: string) {
  return getRepository().getProductBySlug(decodeURIComponent(slug).slice(0, 200));
}

function absolute(url: string) {
  return url.startsWith("http") ? url : `${siteUrl()}${url}`;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/parts/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = await load(slug);
  if (!product) return {};
  const t = getDictionary(locale);
  const title = localized(product.title, locale);
  const description = `${title}. ${t.conditions[product.condition]}, ${formatPrice(product.price, locale)}. ${
    product.oemNumber ? `OEM ${product.oemNumber}. ` : ""
  }${localized(product.description, locale)}`.slice(0, 160);
  const image = primaryImage(product);
  return {
    title,
    description,
    alternates: alternates(locale, `/parts/${product.slug}`),
    openGraph: {
      type: "website",
      title,
      description,
      images: image.endsWith(".svg") ? undefined : [{ url: absolute(image) }],
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/parts/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = await load(slug);
  if (!product) notFound();
  const t = getDictionary(locale);
  const related = await getRepository().getRelatedProducts(product, 4);

  const title = localized(product.title, locale);
  const description = localized(product.description, locale);
  const fit = product.compatibility[0];
  const available = product.status === "available";
  const whatsappText = fmt(t.product.whatsappMessage, { code: product.inventoryCode, title });

  const availability = available
    ? product.quantity > 1
      ? fmt(t.product.inStockQty, { count: product.quantity })
      : t.product.inStock
    : product.status === "sold"
      ? t.product.sold
      : t.product.reserved;

  const specs: [string, string | null][] = [
    [t.product.inventoryId, product.inventoryCode],
    [t.product.oem, product.oemNumber],
    [t.product.condition, t.conditions[product.condition]],
    [t.product.category, product.category ? localized(product.category.name, locale) : null],
    [t.product.make, fit?.makeName ?? null],
    [t.product.model, fit?.modelName ?? null],
    [t.product.generation, fit ? `${fit.generationCode}` : null],
    [t.product.years, product.compatibility.map((c) => `${c.yearFrom}–${c.yearTo}`).join(", ") || null],
    [t.product.availability, availability],
  ];

  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    sku: product.inventoryCode,
    mpn: product.oemNumber ?? undefined,
    image: product.images.map((i) => absolute(i.url)),
    brand: { "@type": "Brand", name: fit?.makeName ?? "Toyota" },
    category: product.category ? localized(product.category.name, locale) : undefined,
    itemCondition:
      product.condition === "new" ? "https://schema.org/NewCondition" : product.condition === "damaged" ? "https://schema.org/DamagedCondition" : "https://schema.org/UsedCondition",
    isAccessoryOrSparePartFor: product.compatibility.map((c) => ({
      "@type": "Car",
      name: `${c.makeName} ${c.modelName} ${c.generationCode}`,
      vehicleModelDate: `${c.yearFrom}`,
    })),
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}/${locale}/parts/${product.slug}`,
      priceCurrency: "GEL",
      price: product.price.toFixed(2),
      availability: available ? "https://schema.org/InStock" : product.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/LimitedAvailability",
      seller: { "@type": "Organization", name: brand.name },
      areaServed: "GE",
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.nav.home, item: `${siteUrl()}/${locale}` },
      { "@type": "ListItem", position: 2, name: t.nav.catalog, item: `${siteUrl()}/${locale}/catalog` },
      { "@type": "ListItem", position: 3, name: title },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([structured, breadcrumbs]) }} />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href={`/${locale}`} className="hover:text-text">{t.nav.home}</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" /></li>
          <li><Link href={`/${locale}/catalog`} className="hover:text-text">{t.nav.catalog}</Link></li>
          {product.category && (
            <>
              <li aria-hidden><ChevronRight className="size-3.5" /></li>
              <li>
                <Link href={`/${locale}/catalog?category=${product.category.slug}`} className="hover:text-text">
                  {localized(product.category.name, locale)}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <ProductGallery images={product.images} title={title} />

        <div className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={conditionTone[product.condition]}>{t.conditions[product.condition]}</Badge>
            <Badge tone={available ? "success" : product.status === "sold" ? "danger" : "warning"}>{availability}</Badge>
            <span className="font-mono text-xs text-subtle">#{product.inventoryCode}</span>
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
          {fit && (
            <p className="mt-2 text-sm text-muted">
              {fit.makeName} {fit.modelName} {fit.generationCode} · {fit.yearFrom}–{fit.yearTo}
            </p>
          )}
          <p className="mt-6 font-display text-4xl font-semibold tracking-tight">{formatPrice(product.price, locale)}</p>

          <div className="mt-6 space-y-3">
            {available ? (
              <AddToCart
                product={{
                  productId: product.id,
                  slug: product.slug,
                  title: product.title,
                  price: product.price,
                  image: primaryImage(product),
                  inventoryCode: product.inventoryCode,
                  maxQuantity: Math.max(1, product.quantity),
                }}
              />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <a href={telHref(brand.contact.phoneE164)} className={buttonStyles("outline", "md")}>
                <Phone className="size-4" aria-hidden />
                {t.product.callToOrder}
              </a>
              <a
                href={`https://wa.me/${brand.contact.whatsapp}?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles("outline", "md")}
              >
                <MessageCircle className="size-4" aria-hidden />
                {t.product.askWhatsapp}
              </a>
            </div>
            <p className="flex items-start gap-2 text-xs text-subtle">
              <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
              {t.product.confirmNote}
            </p>
          </div>

          <section className={`${cardStyles} mt-8 overflow-hidden`} aria-labelledby="specs">
            <h2 id="specs" className="border-b border-line px-5 py-3.5 text-sm font-semibold">{t.product.specs}</h2>
            <dl className="divide-y divide-line text-sm">
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 px-5 py-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {description && (
          <section aria-labelledby="desc">
            <h2 id="desc" className="mb-3 text-lg font-semibold">{t.product.description}</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted">{description}</p>
          </section>
        )}
        {product.compatibility.length > 0 && (
          <section aria-labelledby="fitment">
            <h2 id="fitment" className="mb-3 text-lg font-semibold">{t.product.fitment}</h2>
            <ul className="space-y-2">
              {product.compatibility.map((c) => (
                <li key={c.generationId}>
                  <Link
                    href={`/${locale}/catalog?model=${c.modelSlug}&generation=${c.generationSlug}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:border-line-strong"
                  >
                    <span className="font-medium">
                      {c.makeName} {c.modelName} {c.generationCode}
                    </span>
                    <span className="text-muted">{c.yearFrom}–{c.yearTo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className={`${sectionTitle} mb-6`}>{t.product.related}</h2>
          <ProductGrid products={related} locale={locale} />
        </section>
      )}
    </div>
  );
}
