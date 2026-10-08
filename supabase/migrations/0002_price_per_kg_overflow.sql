-- price * 1000 overflowed int4 when a product price exceeded ~2.1M ARS
-- (e.g. a $38M machine); compute in numeric and cast back to int.
alter table products drop column price_per_kg;
alter table products add column price_per_kg int generated always as (trunc(price::numeric * 1000 / nullif(grams, 0))::int) stored;
create index if not exists products_price_per_kg_idx on products (price_per_kg);
