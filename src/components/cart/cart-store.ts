"use client";

import { useSyncExternalStore } from "react";
import type { LocalizedText } from "@/lib/types";

export interface CartItem {
  productId: string;
  quantity: number;
  /** Snapshot for rendering; price is re-validated on the server at checkout. */
  slug: string;
  title: LocalizedText;
  price: number;
  image: string;
  inventoryCode: string;
  maxQuantity: number;
}

const KEY = "ap_cart_v1";
const EMPTY: CartItem[] = [];
let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (Array.isArray(parsed)) items = parsed.filter((i) => i && typeof i.productId === "string");
  } catch {
    items = EMPTY;
  }
}

function commit(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — cart still works for this tab */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return items;
}

export const cart = {
  add(item: Omit<CartItem, "quantity">, quantity = 1) {
    load();
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) {
      commit(
        items.map((i) =>
          i.productId === item.productId
            ? { ...i, ...item, quantity: Math.min(item.maxQuantity, i.quantity + quantity) }
            : i,
        ),
      );
    } else {
      commit([...items, { ...item, quantity: Math.min(item.maxQuantity, quantity) }]);
    }
  },
  setQuantity(productId: string, quantity: number) {
    load();
    commit(
      items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(i.maxQuantity, quantity)) } : i)),
    );
  },
  remove(productId: string) {
    load();
    commit(items.filter((i) => i.productId !== productId));
  },
  clear() {
    commit(EMPTY);
  },
};

export function useCart() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const count = list.reduce((s, i) => s + i.quantity, 0);
  const total = list.reduce((s, i) => s + i.price * i.quantity, 0);
  return { items: list, count, total };
}
