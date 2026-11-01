-- ═══════════════════════════════════════════════════════════════════
-- AutoParts Hub — initial schema
-- Multi-vendor ready: every inventory/order row belongs to a store.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ── Enums ───────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'store_staff', 'store_owner', 'platform_admin');
create type public.store_member_role as enum ('owner', 'staff');
create type public.store_status as enum ('pending', 'active', 'suspended');
create type public.product_condition as enum ('new', 'like_new', 'used', 'damaged');
create type public.product_status as enum ('draft', 'available', 'reserved', 'sold', 'archived');
create type public.order_status as enum ('new', 'awaiting_confirmation', 'confirmed', 'processing', 'completed', 'cancelled');
create type public.vin_status as enum ('new', 'in_progress', 'answered', 'closed');

-- ── Helpers ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Users / profiles ────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Stores ──────────────────────────────────────────────────────────
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (length(name) between 2 and 120),
  phone text not null,
  city text not null default 'Tbilisi',
  address text,
  owner_id uuid references auth.users (id) on delete set null,
  status public.store_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

create table public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.store_member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_members_user_idx on public.store_members (user_id);

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'platform_admin');
$$;

create or replace function public.is_store_member(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or exists (select 1 from public.store_members where store_id = p_store and user_id = auth.uid());
$$;

-- ── Catalog taxonomy ────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  parent_id uuid references public.categories (id) on delete set null,
  name_ka text not null,
  name_en text not null,
  name_ru text not null,
  icon text not null default 'generic',
  sort_order int not null default 0
);

create table public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes (id) on delete cascade,
  slug text not null unique,
  name text not null
);
create index vehicle_models_make_idx on public.vehicle_models (make_id);

create table public.vehicle_generations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models (id) on delete cascade,
  slug text not null unique,
  name text not null,
  code text not null,
  year_from int not null check (year_from between 1950 and 2100),
  year_to int check (year_to is null or year_to >= year_from)
);
create index vehicle_generations_model_idx on public.vehicle_generations (model_id);

-- ── Products ────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  inventory_code text not null default '',
  slug text not null unique,
  title_ka text not null check (length(title_ka) between 2 and 200),
  title_en text not null default '',
  title_ru text not null default '',
  description_ka text not null default '',
  description_en text not null default '',
  description_ru text not null default '',
  category_id uuid not null references public.categories (id),
  condition public.product_condition not null default 'used',
  status public.product_status not null default 'available',
  price numeric(10, 2) not null check (price >= 0),
  currency char(3) not null default 'GEL',
  quantity int not null default 1 check (quantity >= 0),
  oem_number text,
  featured boolean not null default false,
  search_text text generated always as (
    lower(title_ka || ' ' || title_en || ' ' || title_ru || ' ' || coalesce(oem_number, '') || ' ' || inventory_code)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, inventory_code)
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create index products_store_status_idx on public.products (store_id, status);
create index products_status_created_idx on public.products (status, created_at desc);
create index products_status_price_idx on public.products (status, price);
create index products_category_idx on public.products (category_id);
create index products_search_trgm_idx on public.products using gin (search_text gin_trgm_ops);

-- Per-store inventory counter → codes like AP-00042.
create table public.store_counters (
  store_id uuid primary key references public.stores (id) on delete cascade,
  inventory_seq int not null default 0
);

create or replace function public.assign_inventory_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_seq int;
begin
  if new.inventory_code is null or new.inventory_code = '' then
    insert into public.store_counters (store_id, inventory_seq) values (new.store_id, 1)
    on conflict (store_id) do update set inventory_seq = store_counters.inventory_seq + 1
    returning inventory_seq into v_seq;
    new.inventory_code := 'AP-' || lpad(v_seq::text, 5, '0');
  end if;
  return new;
end $$;
create trigger products_inventory_code before insert on public.products
  for each row execute function public.assign_inventory_code();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_compatibility (
  product_id uuid not null references public.products (id) on delete cascade,
  generation_id uuid not null references public.vehicle_generations (id) on delete cascade,
  year_from int not null,
  year_to int not null check (year_to >= year_from),
  primary key (product_id, generation_id)
);
create index product_compat_generation_idx on public.product_compatibility (generation_id, year_from, year_to);

-- ── Customers & orders ──────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, phone)
);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('AP-' || nextval('public.order_number_seq')),
  store_id uuid not null references public.stores (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null,
  customer_notes text,
  locale text not null default 'ka' check (locale in ('ka', 'en', 'ru')),
  status public.order_status not null default 'new',
  total numeric(10, 2) not null check (total >= 0),
  currency char(3) not null default 'GEL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create index orders_store_status_idx on public.orders (store_id, status, created_at desc);
create index orders_phone_idx on public.orders (phone);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_slug text,
  title text not null,
  inventory_code text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  author_id uuid references auth.users (id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);

-- ── VIN requests ────────────────────────────────────────────────────
create table public.vin_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  vin text not null check (vin ~ '^[A-HJ-NPR-Z0-9]{11,17}$'),
  vehicle_model text not null check (length(vehicle_model) between 2 and 120),
  part_description text not null check (length(part_description) between 2 and 1000),
  phone text not null check (length(phone) between 6 and 20),
  customer_name text,
  image_path text,
  status public.vin_status not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger vin_requests_updated_at before update on public.vin_requests
  for each row execute function public.set_updated_at();
create index vin_requests_store_status_idx on public.vin_requests (store_id, status, created_at desc);

-- ── Inventory history (audit trail) ─────────────────────────────────
create table public.inventory_history (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_label text not null,
  action text not null,
  note text,
  user_id uuid references auth.users (id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);
create index inventory_history_product_idx on public.inventory_history (product_id, created_at desc);
create index inventory_history_store_idx on public.inventory_history (store_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.store_counters enable row level security;
alter table public.categories enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_generations enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_compatibility enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_notes enable row level security;
alter table public.vin_requests enable row level security;
alter table public.inventory_history enable row level security;

-- Profiles: users see/edit their own row; the role column is not user-writable.
create policy profiles_select_own on public.profiles for select using (id = auth.uid() or public.is_platform_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- Stores
create policy stores_public_read on public.stores for select using (status = 'active' or public.is_store_member(id));
create policy stores_owner_update on public.stores for update using (public.is_store_member(id)) with check (public.is_store_member(id));
create policy stores_admin_insert on public.stores for insert with check (public.is_platform_admin());

create policy store_members_read on public.store_members for select using (user_id = auth.uid() or public.is_store_member(store_id));
create policy store_members_admin on public.store_members for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Taxonomy: public read, platform-admin write.
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy makes_read on public.vehicle_makes for select using (true);
create policy makes_write on public.vehicle_makes for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy models_read on public.vehicle_models for select using (true);
create policy models_write on public.vehicle_models for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy generations_read on public.vehicle_generations for select using (true);
create policy generations_write on public.vehicle_generations for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Products: public sees listed parts; store members manage their own store.
create policy products_public_read on public.products for select
  using (status in ('available', 'reserved', 'sold') or public.is_store_member(store_id));
create policy products_member_insert on public.products for insert with check (public.is_store_member(store_id));
create policy products_member_update on public.products for update
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));
create policy products_member_delete on public.products for delete using (public.is_store_member(store_id));

create policy product_images_read on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id
                 and (p.status in ('available', 'reserved', 'sold') or public.is_store_member(p.store_id))));
create policy product_images_write on public.product_images for all
  using (exists (select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)));

create policy product_compat_read on public.product_compatibility for select
  using (exists (select 1 from public.products p where p.id = product_id
                 and (p.status in ('available', 'reserved', 'sold') or public.is_store_member(p.store_id))));
create policy product_compat_write on public.product_compatibility for all
  using (exists (select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_store_member(p.store_id)));

-- Customers / orders: store members only. Customers create orders via place_order().
create policy customers_member on public.customers for all
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));
create policy orders_member_read on public.orders for select using (public.is_store_member(store_id));
create policy orders_member_update on public.orders for update
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));
create policy order_items_member_read on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_store_member(o.store_id)));
create policy order_history_member_read on public.order_status_history for select
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_store_member(o.store_id)));
create policy order_notes_member on public.order_notes for all
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_store_member(o.store_id)))
  with check (exists (select 1 from public.orders o where o.id = order_id and public.is_store_member(o.store_id)));

-- VIN requests: anyone may submit a new one; only members read/update.
create policy vin_public_insert on public.vin_requests for insert to anon, authenticated
  with check (status = 'new' and admin_notes is null
              and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active'));
create policy vin_member_read on public.vin_requests for select using (public.is_store_member(store_id));
create policy vin_member_update on public.vin_requests for update
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

create policy inventory_history_member on public.inventory_history for all
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));

-- ═══════════════════════════════════════════════════════════════════
-- RPC functions
-- ═══════════════════════════════════════════════════════════════════

-- Catalog search with vehicle/year filters. SECURITY INVOKER → RLS applies.
create or replace function public.search_products(
  p_q text default null,
  p_model text default null,
  p_generation text default null,
  p_year int default null,
  p_category text default null,
  p_condition public.product_condition default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_statuses public.product_status[] default array['available', 'reserved']::public.product_status[],
  p_featured boolean default null,
  p_store uuid default null,
  p_sort text default 'newest',
  p_limit int default 12,
  p_offset int default 0
) returns table (id uuid, total_count bigint)
language sql stable as $$
  with filtered as (
    select p.id, p.price, p.created_at
    from public.products p
    where p.status = any (p_statuses)
      and (p_store is null or p.store_id = p_store)
      and (p_featured is null or p.featured = p_featured)
      and (p_condition is null or p.condition = p_condition)
      and (p_min_price is null or p.price >= p_min_price)
      and (p_max_price is null or p.price <= p_max_price)
      and (p_category is null or p.category_id = (select c.id from public.categories c where c.slug = p_category))
      and (p_q is null or p_q = '' or not exists (
            select 1 from unnest(string_to_array(lower(trim(p_q)), ' ')) as t(token)
            where t.token <> '' and position(t.token in p.search_text) = 0))
      and (
        (p_model is null and p_generation is null and p_year is null)
        or exists (
          select 1
          from public.product_compatibility pc
          join public.vehicle_generations g on g.id = pc.generation_id
          join public.vehicle_models m on m.id = g.model_id
          where pc.product_id = p.id
            and (p_generation is null or g.slug = p_generation)
            and (p_model is null or m.slug = p_model)
            and (p_year is null or p_year between pc.year_from and pc.year_to)
        )
      )
  )
  select f.id, count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'price_asc' then f.price end asc,
    case when p_sort = 'price_desc' then f.price end desc,
    f.created_at desc
  limit greatest(1, least(p_limit, 60)) offset greatest(0, p_offset);
$$;

-- Public checkout. Prices/stock are read from the database, never trusted
-- from the client. Items are locked, reserved, and split into one order per store.
create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_notes text,
  p_locale text,
  p_items jsonb
) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_item record;
  v_product public.products%rowtype;
  v_store uuid;
  v_customer uuid;
  v_order uuid;
  v_number text;
  v_numbers text[] := '{}';
  v_total numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;
  if length(coalesce(p_customer_name, '')) < 2 or length(coalesce(p_phone, '')) < 6 or length(coalesce(p_address, '')) < 3 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  create temporary table _lines (product_id uuid, store_id uuid, qty int, price numeric) on commit drop;

  for v_item in
    select (e ->> 'product_id')::uuid as product_id, greatest(1, least(coalesce((e ->> 'quantity')::int, 1), 99)) as qty
    from jsonb_array_elements(p_items) e
  loop
    select * into v_product from public.products where id = v_item.product_id for update;
    if not found or v_product.status <> 'available' then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_item.product_id using errcode = 'P0001';
    end if;
    if v_product.quantity < v_item.qty then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.product_id using errcode = 'P0001';
    end if;
    insert into _lines values (v_product.id, v_product.store_id, v_item.qty, v_product.price);
  end loop;

  for v_store in select distinct store_id from _lines loop
    insert into public.customers (store_id, name, phone, address)
    values (v_store, p_customer_name, p_phone, p_address)
    on conflict (store_id, phone) do update set name = excluded.name, address = excluded.address
    returning id into v_customer;

    select sum(qty * price) into v_total from _lines where store_id = v_store;

    insert into public.orders (store_id, customer_id, customer_name, phone, address, customer_notes, locale, total)
    values (v_store, v_customer, p_customer_name, p_phone, p_address, nullif(p_notes, ''),
            case when p_locale in ('ka', 'en', 'ru') then p_locale else 'ka' end, v_total)
    returning id, order_number into v_order, v_number;

    insert into public.order_items (order_id, product_id, product_slug, title, inventory_code, unit_price, quantity)
    select v_order, p.id, p.slug, p.title_ka, p.inventory_code, l.price, l.qty
    from _lines l join public.products p on p.id = l.product_id
    where l.store_id = v_store;

    insert into public.order_status_history (order_id, from_status, to_status) values (v_order, null, 'new');

    update public.products p
       set quantity = p.quantity - l.qty,
           status = case when p.quantity - l.qty <= 0 then 'reserved'::public.product_status else p.status end
      from _lines l
     where l.product_id = p.id and l.store_id = v_store;

    insert into public.inventory_history (store_id, product_id, product_label, action, note)
    select v_store, p.id, p.title_ka, 'reserved_by_order', v_number
    from _lines l join public.products p on p.id = l.product_id
    where l.store_id = v_store;

    v_numbers := array_append(v_numbers, v_number);
  end loop;

  return v_numbers;
end $$;

-- Admin status change with inventory side effects (release on cancel, sold on complete).
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text,
  p_author text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if not public.is_store_member(v_order.store_id) then raise exception 'FORBIDDEN' using errcode = 'P0001'; end if;
  if v_order.status in ('completed', 'cancelled') or v_order.status = p_status then
    raise exception 'FORBIDDEN:transition' using errcode = 'P0001';
  end if;

  if p_status = 'cancelled' then
    update public.products p
       set quantity = p.quantity + i.quantity,
           status = case when p.status = 'reserved' then 'available'::public.product_status else p.status end
      from public.order_items i
     where i.order_id = p_order_id and i.product_id = p.id;
    insert into public.inventory_history (store_id, product_id, product_label, action, note, user_id, author_name)
    select v_order.store_id, i.product_id, i.title, 'released_by_order', v_order.order_number, auth.uid(), p_author
    from public.order_items i where i.order_id = p_order_id and i.product_id is not null;
  elsif p_status = 'completed' then
    update public.products p
       set status = 'sold'
      from public.order_items i
     where i.order_id = p_order_id and i.product_id = p.id and p.quantity = 0;
    insert into public.inventory_history (store_id, product_id, product_label, action, note, user_id, author_name)
    select v_order.store_id, i.product_id, i.title, 'sold_by_order', v_order.order_number, auth.uid(), p_author
    from public.order_items i join public.products p on p.id = i.product_id
    where i.order_id = p_order_id and p.quantity = 0;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by, author_name)
  values (p_order_id, v_order.status, p_status, nullif(p_note, ''), auth.uid(), p_author);
end $$;

revoke all on function public.place_order(text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, text, jsonb) to anon, authenticated;
revoke all on function public.admin_update_order_status(uuid, public.order_status, text, text) from public;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text, text) to authenticated;
grant execute on function public.search_products to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- Storage
-- ═══════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('vin-attachments', 'vin-attachments', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- product-images/<store_id>/<product_id>/<file>
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product images member write" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_store_member(((storage.foldername(name))[1])::uuid));
create policy "product images member delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_store_member(((storage.foldername(name))[1])::uuid));

-- vin-attachments/<store_id>/<file>: anyone uploads, only store members read.
create policy "vin attachments public upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'vin-attachments');
create policy "vin attachments member read" on storage.objects for select to authenticated
  using (bucket_id = 'vin-attachments' and public.is_store_member(((storage.foldername(name))[1])::uuid));
