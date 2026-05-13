-- 🛍️ KartClaw products table
-- Minimal by design, with a few production-friendly basics borrowed from
-- EverShop's product model: stable UUIDs, unique SKU/slug, publish status,
-- and timestamps for syncing, admin audit trails, and AI-generated updates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT products_uuid_unique UNIQUE (uuid),
  CONSTRAINT products_sku_unique UNIQUE (sku),
  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_price_non_negative CHECK (price >= 0),
  CONSTRAINT products_stock_non_negative CHECK (stock >= 0),
  CONSTRAINT products_status_valid CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);
CREATE INDEX IF NOT EXISTS products_name_idx ON products (name);

CREATE OR REPLACE FUNCTION set_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_products_updated_at();
