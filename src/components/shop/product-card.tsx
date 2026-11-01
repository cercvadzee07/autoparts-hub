import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import type { Product } from "@/lib/types";
import { cn, fitmentLabel, formatPrice, localized, primaryImage } from "@/lib/utils";
import { Badge, conditionTone } from "@/components/ui/badge";
import { PartImage } from "./part-image";

export function ProductCard({ product, locale, priority }: { product: Product; locale: Locale; priority?: boolean }) {
  const t = getDictionary(locale);
  const title = localized(product.title, locale);
  const fitment = fitmentLabel(product);
  const unavailable = product.status !== "available";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong">
      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#202026,#121215_70%)]">
        <PartImage
          src={primaryImage(product)}
          alt={title}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 480px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone={conditionTone[product.condition]}>{t.conditions[product.condition]}</Badge>
          {unavailable && (
            <Badge tone={product.status === "sold" ? "danger" : "warning"}>
              {product.status === "sold" ? t.product.sold : t.product.reserved}
            </Badge>
          )}
        </div>
        <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[11px] text-muted backdrop-blur">
          {product.inventoryCode}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {fitment && <p className="text-xs font-medium uppercase tracking-wide text-subtle">{fitment}</p>}
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">
          <Link href={`/${locale}/parts/${product.slug}`} className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between pt-2">
          <p className={cn("font-display text-xl font-semibold tracking-tight", unavailable && "text-muted line-through decoration-1")}>
            {formatPrice(product.price, locale)}
          </p>
          {product.oemNumber && <p className="font-mono text-[11px] text-subtle">OEM {product.oemNumber}</p>}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, locale, priorityCount = 0 }: { products: Product[]; locale: Locale; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} locale={locale} priority={i < priorityCount} />
      ))}
    </div>
  );
}
