"use client";

import { useEffect, useState } from "react";
import { checkCartAction } from "@/app/actions/shop";
import { cart, type CartItem } from "./cart-store";

type Status = Record<string, { available: boolean; price: number; quantity: number }>;

/**
 * Re-checks cart lines against the server and syncs prices/limits.
 * Returns ids of lines that can no longer be ordered.
 */
export function useCartStatus(items: CartItem[]) {
  const [status, setStatus] = useState<Status>({});
  const key = items.map((i) => i.productId).sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    checkCartAction(key.split(","))
      .then((res) => {
        if (cancelled) return;
        setStatus(res);
        for (const [id, s] of Object.entries(res)) {
          const line = items.find((i) => i.productId === id);
          if (line && s.available && (line.price !== s.price || line.maxQuantity !== s.quantity)) {
            cart.add({ ...line, price: s.price, maxQuantity: Math.max(1, s.quantity) }, 0);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the set of products changes
  }, [key]);

  const unavailable = items.filter((i) => status[i.productId] && !status[i.productId].available).map((i) => i.productId);
  return { unavailable, checked: Object.keys(status).length > 0 };
}
