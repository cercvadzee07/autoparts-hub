import type { Locale } from "@/i18n/config";

export type LocalizedText = Record<Locale, string>;

export const PRODUCT_CONDITIONS = ["new", "like_new", "used", "damaged"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_STATUSES = ["draft", "available", "reserved", "sold", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  "new",
  "awaiting_confirmation",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
/** Orders that still need work from the shop. */
export const PENDING_ORDER_STATUSES: OrderStatus[] = ["awaiting_confirmation", "confirmed", "processing"];

export const VIN_STATUSES = ["new", "in_progress", "answered", "closed"] as const;
export type VinStatus = (typeof VIN_STATUSES)[number];

export const SORT_OPTIONS = ["newest", "price_asc", "price_desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export type UserRole = "customer" | "store_staff" | "store_owner" | "platform_admin";

export interface Store {
  id: string;
  slug: string;
  name: string;
  phone: string;
  city: string;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  icon: string;
  sortOrder: number;
}

export interface VehicleGeneration {
  id: string;
  modelId: string;
  slug: string;
  name: string;
  code: string;
  yearFrom: number;
  yearTo: number | null;
}

export interface VehicleModel {
  id: string;
  makeId: string;
  slug: string;
  name: string;
  generations: VehicleGeneration[];
}

export interface VehicleMake {
  id: string;
  slug: string;
  name: string;
  models: VehicleModel[];
}

export interface ProductImage {
  id: string;
  url: string;
  /** Storage path when the file lives in Supabase Storage / local uploads. */
  path: string | null;
  sortOrder: number;
}

export interface Compatibility {
  generationId: string;
  yearFrom: number;
  yearTo: number;
  makeName: string;
  modelName: string;
  modelSlug: string;
  generationName: string;
  generationCode: string;
  generationSlug: string;
}

export interface Product {
  id: string;
  storeId: string;
  inventoryCode: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  category: Category | null;
  condition: ProductCondition;
  status: ProductStatus;
  price: number;
  quantity: number;
  oemNumber: string | null;
  featured: boolean;
  images: ProductImage[];
  compatibility: Compatibility[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  q?: string;
  model?: string;
  generation?: string;
  year?: number;
  category?: string;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  /** Public catalog defaults to ["available","reserved"]. Admin passes any. */
  statuses?: ProductStatus[];
  featured?: boolean;
  storeId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ProductInput {
  id?: string;
  title: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  condition: ProductCondition;
  status: ProductStatus;
  price: number;
  quantity: number;
  oemNumber: string | null;
  featured: boolean;
  compatibility: { generationId: string; yearFrom: number; yearTo: number }[];
}

export interface UploadedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productSlug: string | null;
  title: string;
  inventoryCode: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderNote {
  id: string;
  body: string;
  author: string | null;
  createdAt: string;
}

export interface OrderStatusChange {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  author: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  address: string;
  customerNotes: string | null;
  locale: Locale;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  notes: OrderNote[];
  history: OrderStatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderInput {
  customerName: string;
  phone: string;
  address: string;
  notes: string | null;
  locale: Locale;
  items: { productId: string; quantity: number }[];
}

export interface VinRequest {
  id: string;
  storeId: string;
  vin: string;
  vehicleModel: string;
  partDescription: string;
  phone: string;
  customerName: string | null;
  imageUrl: string | null;
  status: VinStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VinRequestInput {
  vin: string;
  vehicleModel: string;
  partDescription: string;
  phone: string;
  customerName: string | null;
}

export interface DashboardStats {
  totalProducts: number;
  availableProducts: number;
  soldProducts: number;
  reservedProducts: number;
  newOrders: number;
  pendingOrders: number;
  newVinRequests: number;
  completedRevenue: number;
}

export type ActivityKind = "order" | "vin" | "inventory";
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Machine key, e.g. "order_created", "status_changed", "product_created". */
  action: string;
  label: string;
  href: string | null;
  createdAt: string;
}

export interface InventoryEvent {
  id: string;
  productId: string;
  action: string;
  note: string | null;
  author: string | null;
  createdAt: string;
}

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  storeId: string;
}

export class DomainError extends Error {
  constructor(
    public code:
      | "PRODUCT_UNAVAILABLE"
      | "INSUFFICIENT_STOCK"
      | "EMPTY_ORDER"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_FILE"
      | "UNKNOWN",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "DomainError";
  }
}
