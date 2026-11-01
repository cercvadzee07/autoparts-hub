"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag, Zap } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import type { LocalizedText } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { buttonStyles } from "@/components/ui/styles";
import { cart, useCart } from "./cart-store";

export interface CartProductSnapshot {
  productId: string;
  slug: string;
  title: LocalizedText;
  price: number;
  image: string;
  inventoryCode: string;
  maxQuantity: number;
}

export function AddToCart({ product }: { product: CartProductSnapshot }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { items } = useCart();
  const inCart = items.some((i) => i.productId === product.productId);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {inCart ? (
        <Link href={`/${locale}/cart`} className={buttonStyles("secondary", "lg", "flex-1")}>
          <Check className="size-5 text-success" aria-hidden />
          {dict.product.inCart}
        </Link>
      ) : (
        <button
          type="button"
          className={buttonStyles("secondary", "lg", "flex-1")}
          onClick={() => {
            cart.add(product);
            toast(dict.cart.added);
          }}
        >
          <ShoppingBag className="size-5" aria-hidden />
          {dict.product.addToCart}
        </button>
      )}
      <button
        type="button"
        className={buttonStyles("primary", "lg", "flex-1")}
        onClick={() => {
          if (!inCart) cart.add(product);
          router.push(`/${locale}/checkout`);
        }}
      >
        <Zap className="size-5" aria-hidden />
        {dict.product.orderNow}
      </button>
    </div>
  );
}
