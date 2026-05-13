-- 🖼️ Product image URL for the fast storefront card/detail screens.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
