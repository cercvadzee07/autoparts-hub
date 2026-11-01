// Applies supabase/migrations + seed.sql to an in-process Postgres (PGlite) with
// minimal stand-ins for Supabase's `auth` and `storage` schemas, then checks the
// RPCs and Row Level Security policies behave as intended.
// Run: npm run db:verify
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const root = process.cwd();
const db = new PGlite({ extensions: { pg_trgm } });

const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  grant usage on schema storage to anon, authenticated;
`;

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};
const as = async (role, sub, fn) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
};
const rejects = async (fn) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e.message;
  }
};

await db.exec(SUPABASE_STUBS);
for (const f of readdirSync(join(root, "supabase", "migrations")).sort()) {
  await db.exec(readFileSync(join(root, "supabase", "migrations", f), "utf8"));
  console.log(`applied ${f}`);
}
await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
console.log("applied seed.sql\n");

// ── Public catalog ────────────────────────────────────────────
const all = await as("anon", null, () => db.query(`select * from public.search_products(p_limit => 60)`));
ok("anon can search the catalog", all.rows.length > 0, `${all.rows[0]?.total_count} listed parts`);
const filtered = await as("anon", null, () =>
  db.query(`select * from public.search_products(p_model => 'camry', p_generation => 'camry-xv70', p_year => 2019, p_category => 'lighting')`),
);
ok("vehicle/year/category filters", filtered.rows.length > 0 && filtered.rows.length < all.rows.length, `${filtered.rows.length} matches`);
const text = await as("anon", null, () => db.query(`select * from public.search_products(p_q => 'ფარი xv70')`));
ok("Georgian text search", text.rows.length > 0, `${text.rows.length} matches`);
const sorted = await as("anon", null, () =>
  db.query(`select p.price from public.search_products(p_sort => 'price_asc', p_limit => 5) s join public.products p using (id)`),
);
const prices = sorted.rows.map((r) => Number(r.price));
ok("price sorting", prices.every((p, i) => i === 0 || p >= prices[i - 1]), prices.join(", "));

// ── Checkout ──────────────────────────────────────────────────
const target = (await db.query(`select id, price from public.products where status = 'available' and quantity = 1 limit 1`)).rows[0];
const placed = await as("anon", null, () =>
  db.query(`select public.place_order('Test', '+995555123456', 'Pickup', '', 'ka', $1::jsonb) as numbers`, [
    JSON.stringify([{ product_id: target.id, quantity: 1 }]),
  ]),
);
const orderNumber = placed.rows[0].numbers[0];
ok("anon can place an order", /^AP-\d+$/.test(orderNumber), orderNumber);
const after = (await db.query(`select status, quantity from public.products where id = $1`, [target.id])).rows[0];
ok("ordered part is reserved", after.status === "reserved" && after.quantity === 0);
const order = (await db.query(`select total from public.orders where order_number = $1`, [orderNumber])).rows[0];
ok("order total uses database price", Number(order.total) === Number(target.price));
const dup = await as("anon", null, () =>
  rejects(() =>
    db.query(`select public.place_order('Second Buyer', '+995555000001', 'Pickup', '', 'ka', $1::jsonb)`, [
      JSON.stringify([{ product_id: target.id, quantity: 1 }]),
    ]),
  ),
);
ok("reserved part cannot be ordered twice", dup?.includes("PRODUCT_UNAVAILABLE"), dup ?? "no error");

// ── RLS: anonymous visitors ───────────────────────────────────
const anonOrders = await as("anon", null, () => db.query(`select * from public.orders`));
ok("anon cannot read orders", anonOrders.rows.length === 0);
const anonCustomers = await as("anon", null, () => db.query(`select * from public.customers`));
ok("anon cannot read customers", anonCustomers.rows.length === 0);
const anonUpdate = await as("anon", null, () => db.query(`update public.products set price = 1 returning id`));
ok("anon cannot change products", anonUpdate.rows.length === 0);
const store = (await db.query(`select id from public.stores limit 1`)).rows[0].id;
await as("anon", null, () =>
  db.query(
    `insert into public.vin_requests (store_id, vin, vehicle_model, part_description, phone) values ($1, '4T1B11HK5KU123456', 'Camry 2019', 'Rear bumper', '+995599112233')`,
    [store],
  ),
);
ok("anon can submit a VIN request", true);
const anonVin = await as("anon", null, () => db.query(`select * from public.vin_requests`));
ok("anon cannot read VIN requests", anonVin.rows.length === 0);
const sneaky = await as("anon", null, () =>
  rejects(() =>
    db.query(
      `insert into public.vin_requests (store_id, vin, vehicle_model, part_description, phone, status, admin_notes) values ($1, '4T1B11HK5KU123456', 'Camry', 'Part', '+995599112233', 'closed', 'x')`,
      [store],
    ),
  ),
);
ok("anon cannot set VIN status/notes", !!sneaky);

// ── Staff ─────────────────────────────────────────────────────
const staff = (await db.query(`insert into auth.users (email) values ('owner@example.test') returning id`)).rows[0].id;
const outsider = (await db.query(`insert into auth.users (email) values ('other@example.test') returning id`)).rows[0].id;
await db.query(`insert into public.store_members (store_id, user_id, role) values ($1, $2, 'owner')`, [store, staff]);
const profile = (await db.query(`select role from public.profiles where id = $1`, [staff])).rows[0];
ok("profile auto-created on sign-up", profile?.role === "customer");

const staffOrders = await as("authenticated", staff, () => db.query(`select * from public.orders`));
ok("store member reads store orders", staffOrders.rows.length === 1);
const outsiderOrders = await as("authenticated", outsider, () => db.query(`select * from public.orders`));
ok("non-member cannot read orders", outsiderOrders.rows.length === 0);
const escalate = await as("authenticated", outsider, () =>
  rejects(() => db.query(`update public.profiles set role = 'platform_admin' where id = $1`, [outsider])),
);
ok("users cannot promote themselves", !!escalate);

const orderId = (await db.query(`select id from public.orders where order_number = $1`, [orderNumber])).rows[0].id;
const forbidden = await as("authenticated", outsider, () =>
  rejects(() => db.query(`select public.admin_update_order_status($1, 'cancelled', '', 'x')`, [orderId])),
);
ok("non-member cannot change order status", forbidden?.includes("FORBIDDEN"));
await as("authenticated", staff, () => db.query(`select public.admin_update_order_status($1, 'cancelled', 'no answer', 'Owner')`, [orderId]));
const released = (await db.query(`select status, quantity from public.products where id = $1`, [target.id])).rows[0];
ok("cancelling releases the part", released.status === "available" && released.quantity === 1);
const terminal = await as("authenticated", staff, () =>
  rejects(() => db.query(`select public.admin_update_order_status($1, 'confirmed', '', 'Owner')`, [orderId])),
);
ok("closed orders cannot be reopened", !!terminal);

const created = await as("authenticated", staff, () =>
  db.query(
    `insert into public.products (store_id, slug, title_ka, category_id, price) select $1, 'tmp-test', 'ტესტი', id, 10 from public.categories limit 1 returning inventory_code`,
    [store],
  ),
);
ok("inventory code auto-assigned", /^AP-\d{5}$/.test(created.rows[0].inventory_code), created.rows[0].inventory_code);
const outsiderInsert = await as("authenticated", outsider, () =>
  rejects(() =>
    db.query(
      `insert into public.products (store_id, slug, title_ka, category_id, price) select $1, 'tmp-x', 'x', id, 10 from public.categories limit 1`,
      [store],
    ),
  ),
);
ok("non-member cannot add products", !!outsiderInsert);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll database checks passed");
process.exit(failures ? 1 : 0);
