create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  store        text not null,
  external_id  text not null,
  name         text not null,
  url          text not null,
  image_url    text,
  roaster      text not null,
  origin       text,
  variety      text,
  category     text,
  grind        text,
  grams        int,
  price        int not null,
  price_per_kg int generated always as (trunc(price::numeric * 1000 / nullif(grams, 0))::int) stored,
  in_stock     boolean not null default true,
  fetched_at   timestamptz not null default now(),
  unique (store, external_id)
);
create index if not exists products_roaster_idx on products (roaster);
create index if not exists products_price_per_kg_idx on products (price_per_kg);
alter table products enable row level security;
create policy "public read" on products for select using (true);
