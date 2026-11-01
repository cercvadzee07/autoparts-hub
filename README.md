# AutoParts Hub

A Georgian marketplace for used auto parts. It starts as a single store (a Toyota/Camry dismantling shop in Tbilisi) and the data model is already set up for many vendors later.

- **Storefront** in Georgian (default), English and Russian: catalog with vehicle, year, category, condition and price filters, product pages, cart, checkout (the shop confirms by phone, no online payment yet) and VIN requests.
- **Admin panel** that works on desktop and phones: dashboard, products (photos, fitment, translations, stock status), orders (status workflow, internal notes, history) and VIN requests.
- **Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Storage), deployed on Vercel.

---

## Quick start (demo mode, no credentials needed)

```bash
npm install
cp .env.example .env.local      # leave the Supabase values empty
npm run dev                     # http://localhost:3000
```

If the Supabase variables are empty, the app runs in **demo mode**. It uses a local JSON database at `.data/demo-db.json`, filled with 59 sample Camry parts, and stores uploads in `.data/uploads/`. Every feature works in demo mode, so you can try the whole app before you create a Supabase project.

- Admin: `http://localhost:3000/ka/admin`, using the `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` values from `.env.local`.
- Reset the demo data: `npm run reset:demo`.
- In production mode (`next start`), demo login only works if `DEMO_ADMIN_PASSWORD` and a 32+ character `SESSION_SECRET` are set.

> Demo mode is for local development only. On Vercel the filesystem is temporary, so production needs Supabase.

---

## Production setup (Supabase + Vercel)

### 1. Create the Supabase project
1. Create a project at [supabase.com](https://supabase.com). The Frankfurt (eu-central-1) region is closest to Georgia.
2. Apply the schema. Use **one** of these:
   - **SQL editor:** paste and run `supabase/migrations/20261102000000_init.sql`, then `supabase/seed.sql`.
   - **CLI:** `npx supabase link --project-ref <ref>`, then `npx supabase db push`. Run `seed.sql` in the SQL editor afterwards.
3. Leave `seed.sql` out if you don't want the sample products. You still need the store, category and vehicle rows, so remove only the `products` / `product_images` / `product_compatibility` lines.

### 2. Create the shop owner account
1. Go to Supabase Dashboard → Authentication → Users → **Add user** and enter an email and password.
2. In the SQL editor, give that user access to the store:
   ```sql
   insert into public.store_members (store_id, user_id, role)
   select '11111111-1111-4111-8111-111111111111', id, 'owner'
   from auth.users where email = 'owner@your-shop.ge';
   ```
   Optional, for platform-wide access to every store:
   `update public.profiles set role = 'platform_admin' where id = (select id from auth.users where email = '…');`
3. Under Authentication → Providers, turn off public sign-ups if only staff should log in.

### 3. Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | all | e.g. `https://autoparts.ge`. Used for canonical URLs, the sitemap and Open Graph. |
| `NEXT_PUBLIC_SUPABASE_URL` | all | Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | The anon/publishable key. It is safe in the browser because RLS protects every table. |
| `SESSION_SECRET` | demo only | 32+ random characters. |
| `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` | demo only | Ignored once Supabase is configured. |

The **service-role key is not used** anywhere. Customer checkout goes through a `SECURITY DEFINER` function (`place_order`) that reads prices and stock from the database itself.

### 4. Deploy to Vercel
1. Push the repository to GitHub and import it in Vercel. The framework is detected automatically.
2. Add the environment variables above for Production (and Preview if you use it).
3. Deploy, then set your domain and update `NEXT_PUBLIC_SITE_URL`.
4. In Supabase → Authentication → URL Configuration, set the Site URL to your domain.
5. Submit `https://your-domain/sitemap.xml` in Google Search Console.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:verify` | Applies the migration and seed to an in-process Postgres (PGlite) and checks the RPCs and RLS policies (23 checks) |
| `npm run seed:sql` | Regenerates `supabase/seed.sql` from `src/lib/data/seed.ts` |
| `npm run icons` | Regenerates the placeholder part illustrations in `public/parts/` |
| `npm run reset:demo` | Deletes the local demo database and uploads |

---

## Architecture

```
src/
  app/
    [locale]/                 ← ka | en | ru (every URL is localized; / redirects by cookie/Accept-Language)
      (shop)/                 ← storefront: home, catalog, parts/[slug], cart, checkout, vin-request
      admin/login             ← staff sign in
      admin/(panel)/          ← protected: dashboard, products, orders, vin-requests
    actions/shop.ts           ← public server actions (checkout, VIN, cart re-check)
    actions/admin.ts          ← staff server actions (all call assertAdmin + ownership checks)
    api/uploads/[...path]     ← serves demo-mode uploads (VIN photos are staff-only)
    sitemap.ts, robots.ts, icon.svg
  config/brand.ts             ← name, contacts, prefixes, hero image (edit this to rebrand)
  i18n/                       ← dictionaries (ka/en/ru), provider, config
  lib/
    data/repository.ts        ← data-access interface used by every page/action
    data/supabase-repository.ts
    data/demo-repository.ts
    data/seed.ts              ← sample catalog (shared by demo mode and seed.sql)
    auth.ts                   ← Supabase Auth or signed demo cookie; requireAdmin / assertAdmin
    validation.ts             ← zod schemas (server-side validation, localized error keys)
    files.ts                  ← upload validation (magic-byte check, 8 MB, JPEG/PNG/WebP only)
  proxy.ts                    ← locale redirect + Supabase session refresh (Next 16 “proxy”)
supabase/
  migrations/…_init.sql       ← schema, indexes, RLS, RPCs, storage buckets & policies
  seed.sql                    ← generated
```

**Data access.** Pages and actions only use the `Repository` interface. `getRepository()` returns the Supabase implementation when credentials exist and the demo implementation otherwise.

**Database (PostgreSQL).** Tables: `profiles` (users and roles), `stores`, `store_members`, `categories`, `vehicle_makes`, `vehicle_models`, `vehicle_generations`, `products` (every row has a `store_id`), `product_images`, `product_compatibility`, `customers` (per store), `orders`, `order_items`, `order_status_history`, `order_notes`, `vin_requests` and `inventory_history`.

- **RPCs:**
  - `search_products` runs as the caller, so RLS still applies.
  - `place_order` locks rows, re-checks price and stock, reserves the parts, and splits the cart into one order per store.
  - `admin_update_order_status`: cancelling returns parts to stock, and completing marks them sold. Completed and cancelled orders are final.
- **RLS:**
  - The public can read listed products and the category/vehicle lists.
  - Staff can read and change only their own store's data (`is_store_member`).
  - Anyone can submit a VIN request, but only staff can read them.
  - Users cannot change their own `role`.
- **Storage:**
  - `product-images` is public to read. Only members of the store in the path (`<store_id>/…`) can write.
  - `vin-attachments` is private. Staff view the photos through signed URLs that expire after an hour.

**Inventory lifecycle.** `available` → order placed → `reserved` → order completed → `sold`. If the order is cancelled, the part goes back to `available`. The admin can also mark parts sold or available by hand, and every change is written to `inventory_history`.

**Rendering & caching.** Shop pages always render on request (`connection()`), so prices and stock are never stale. `cacheComponents` is deliberately off because nearly every page depends on request data. The sitemap is regenerated hourly.

---

## Customizing

- **Brand name, phone, address, hours, order/inventory prefixes:** `src/config/brand.ts`
- **Colors:** the `--brand`, `--bg`, `--surface` and related tokens at the top of `src/app/globals.css`
- **Logo:** `src/components/brand/logo.tsx` and `src/app/icon.svg`
- **Homepage photos:** these are picked up automatically after you restart `npm run dev` or rebuild:
  - `public/images/hero.jpg` is the hero background. A wide, dark Camry photo works best.
  - `public/images/categories/<slug>.jpg` is a category card photo, e.g. `lighting.jpg`, `engine.jpg`, `body.jpg`, `mirrors.jpg`.
  - `.png`, `.webp` and `.avif` work too. Until a photo exists, the built-in illustration is shown.
- **Logo tagline / wordmark:** `brand.tagline` and `brand.wordmark` in `src/config/brand.ts`
- **Text / translations:** `src/i18n/dictionaries/{ka,en,ru}.ts`. `en.ts` defines the shape, and TypeScript fails the build if a key is missing in another language.
- **Add a language:** add it to `locales` in `src/i18n/config.ts`, create a dictionary, then add `title_xx`/`description_xx` columns, or move the translations into a separate table.
- **Vehicles & categories:** edit them in the database, or in `seed.ts` and then run `npm run seed:sql`.

---

## Toward multi-vendor

Already in place:
- Every product, order, customer, VIN request and history row has a `store_id`.
- Staff access is set per store through `store_members`, and RLS checks it.
- Checkout already splits a cart into one order per store.
- Dashboard numbers and lists are already filtered by store.

Still to build when that phase starts:
- Vendor registration and onboarding (`stores.status = 'pending'` → admin approval)
- Store pages and seller names on product cards
- Per-store sales reports
- Notifications to each vendor (email/SMS) when an order comes in
- Payments and payouts, if online payment is added

## Known limitations / next steps

- **No online payment yet.** Orders are confirmed by phone. `orders.total` and `currency` are already stored, so a payment step can be added later.
- **Order notifications.** Admins see new orders on the dashboard. An SMS or Telegram alert is a good next step.
- **The Supabase code path has not been run against a live project.** The schema, RLS and RPCs were checked with `npm run db:verify` (Postgres via PGlite), and every UI workflow was tested end to end in demo mode. Do one full order → status → completion run on your Supabase project before launch.
- **Rate limiting** on the checkout, VIN and login forms is kept in memory per server instance. Add Vercel Firewall rules for stronger protection.
