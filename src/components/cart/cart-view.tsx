"use client";

import Link from "next/link";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn, formatPrice, localized } from "@/lib/utils";
import { buttonStyles, cardStyles } from "@/components/ui/styles";
import { PartImage } from "@/components/shop/part-image";
import { cart, useCart } from "./cart-store";
import { useCartStatus } from "./use-cart-status";

export function CartView() {
  const { locale, dict } = useI18n();
  const { items, total } = useCart();
  const { unavailable } = useCartStatus(items);

  if (items.length === 0) {
    return (
      <div className={`${cardStyles} flex flex-col items-center px-6 py-20 text-center`}>
        <ShoppingBag className="mb-4 size-10 text-subtle" aria-hidden />
        <h2 className="text-lg font-semibold">{dict.cart.empty}</h2>
        <p className="mt-2 text-sm text-muted">{dict.cart.emptyText}</p>
        <Link href={`/${locale}/catalog`} className={buttonStyles("primary", "md", "mt-6")}>
          {dict.cart.browse}
        </Link>
      </div>
    );
  }

  const orderable = items.filter((i) => !unavailable.includes(i.productId));
  const orderableTotal = orderable.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {unavailable.length > 0 && (
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {dict.cart.removeUnavailable}
          </p>
        )}
        <ul className="space-y-3">
          {items.map((item) => {
            const gone = unavailable.includes(item.productId);
            const title = localized(item.title, locale);
            return (
              <li key={item.productId} className={cn(cardStyles, "flex gap-4 p-3 sm:p-4", gone && "opacity-60")}>
                <Link
                  href={`/${locale}/parts/${item.slug}`}
                  className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-28"
                >
                  <PartImage src={item.image} alt={title} sizes="112px" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/${locale}/parts/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand sm:text-[15px]">
                        {title}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-subtle">{item.inventoryCode}</p>
                      {gone && <p className="mt-1 text-xs font-medium text-amber-300">{dict.cart.unavailable}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove(item.productId)}
                      className="rounded-lg p-2 text-subtle hover:bg-surface-2 hover:text-red-400"
                      aria-label={`${dict.cart.remove}: ${title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-3">
                    {item.maxQuantity > 1 ? (
                      <div className="flex items-center rounded-lg border border-line" role="group" aria-label={dict.cart.quantity}>
                        <button
                          type="button"
                          className="p-2 text-muted hover:text-text disabled:opacity-30"
                          onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="−"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          className="p-2 text-muted hover:text-text disabled:opacity-30"
                          onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity}
                          aria-label="+"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-subtle">× 1</span>
                    )}
                    <p className="font-display text-lg font-semibold">{formatPrice(item.price * item.quantity, locale)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href={`/${locale}/catalog`} className="inline-block pt-2 text-sm text-muted hover:text-text">
          ← {dict.cart.continue}
        </Link>
      </div>

      <aside className={`${cardStyles} h-fit p-5 lg:sticky lg:top-24`}>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{dict.cart.subtotal}</dt>
            <dd>{formatPrice(total, locale)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>{dict.cart.total}</dt>
            <dd className="font-display text-xl">{formatPrice(orderableTotal, locale)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-subtle">{dict.cart.deliveryNote}</p>
        <Link
          href={`/${locale}/checkout`}
          aria-disabled={orderable.length === 0}
          className={buttonStyles("primary", "lg", cn("mt-5 w-full", orderable.length === 0 && "pointer-events-none opacity-50"))}
        >
          {dict.cart.checkout}
        </Link>
      </aside>
    </div>
  );
}
