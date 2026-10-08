-- pro-coffee spec fields; the scrapers fill them only from text the source
-- actually publishes and leave them null otherwise (never inferred).
alter table products add column tasting_notes text;
alter table products add column process text;
alter table products add column roast_level text;
alter table products add column altitude text;
alter table products add column score numeric;
