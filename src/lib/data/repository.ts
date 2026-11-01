import type {
  ActivityItem,
  Category,
  DashboardStats,
  InventoryEvent,
  Order,
  OrderStatus,
  Paginated,
  PlaceOrderInput,
  Product,
  ProductFilters,
  ProductInput,
  ProductStatus,
  Store,
  UploadedFile,
  VehicleMake,
  VinRequest,
  VinRequestInput,
  VinStatus,
} from "@/lib/types";

/** Who performed an admin action (for history/audit rows). */
export interface Actor {
  userId: string;
  name: string;
}

/**
 * Data-access contract. Two implementations:
 *  - SupabaseRepository (production; PostgreSQL + RLS + Storage)
 *  - DemoRepository     (local development without credentials; JSON file)
 * Pages and actions only ever talk to this interface.
 */
export interface Repository {
  readonly mode: "supabase" | "demo";

  // ── Public catalog ──────────────────────────────────────────
  getDefaultStore(): Promise<Store>;
  getCategories(): Promise<Category[]>;
  getVehicleTree(): Promise<VehicleMake[]>;
  searchProducts(filters: ProductFilters): Promise<Paginated<Product>>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  getRelatedProducts(product: Product, limit: number): Promise<Product[]>;
  getSitemapEntries(): Promise<{ slug: string; updatedAt: string }[]>;
  getCategoryCounts(): Promise<Record<string, number>>;

  // ── Customer writes ─────────────────────────────────────────
  /** Validates stock & prices server-side, reserves items. Returns order numbers. */
  placeOrder(input: PlaceOrderInput): Promise<string[]>;
  createVinRequest(input: VinRequestInput, image: UploadedFile | null): Promise<string>;

  // ── Admin: products ─────────────────────────────────────────
  getProductById(id: string): Promise<Product | null>;
  saveProduct(storeId: string, input: ProductInput, actor: Actor): Promise<Product>;
  deleteProduct(id: string, actor: Actor): Promise<void>;
  setProductStatus(id: string, status: ProductStatus, actor: Actor): Promise<void>;
  addProductImages(productId: string, files: UploadedFile[]): Promise<void>;
  removeProductImage(imageId: string): Promise<void>;
  setCoverImage(imageId: string): Promise<void>;
  getInventoryHistory(productId: string): Promise<InventoryEvent[]>;

  // ── Admin: orders ───────────────────────────────────────────
  listOrders(
    storeId: string,
    opts: { status?: OrderStatus; q?: string; page?: number; pageSize?: number },
  ): Promise<Paginated<Order>>;
  getOrder(id: string): Promise<Order | null>;
  updateOrderStatus(id: string, status: OrderStatus, note: string | null, actor: Actor): Promise<void>;
  addOrderNote(id: string, body: string, actor: Actor): Promise<void>;

  // ── Admin: VIN requests ─────────────────────────────────────
  listVinRequests(
    storeId: string,
    opts: { status?: VinStatus; page?: number; pageSize?: number },
  ): Promise<Paginated<VinRequest>>;
  getVinRequest(id: string): Promise<VinRequest | null>;
  updateVinRequest(id: string, patch: { status: VinStatus; adminNotes: string | null }): Promise<void>;

  // ── Admin: dashboard ────────────────────────────────────────
  getDashboardStats(storeId: string): Promise<DashboardStats>;
  getRecentActivity(storeId: string, limit: number): Promise<ActivityItem[]>;
}
