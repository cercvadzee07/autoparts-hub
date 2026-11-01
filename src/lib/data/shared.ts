import type { OrderStatus, ProductFilters, ProductStatus } from "@/lib/types";

export const DEFAULT_PAGE_SIZE = 12;
export const PUBLIC_STATUSES: ProductStatus[] = ["available", "reserved"];
/** Statuses a product page may be shown publicly in (sold parts stay indexable). */
export const VISIBLE_STATUSES: ProductStatus[] = ["available", "reserved", "sold"];
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["completed", "cancelled"];

export function pageParams(filters: { page?: number; pageSize?: number }) {
  const pageSize = Math.min(60, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, filters.page ?? 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export function normalizeQuery(q: ProductFilters["q"]): string {
  return (q ?? "").trim().toLowerCase().slice(0, 100);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return !TERMINAL_ORDER_STATUSES.includes(from);
}
