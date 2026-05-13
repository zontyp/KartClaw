-- 📦 Imported from Pekstore's Postgres product/product_description/product_inventory/product_image tables.
-- Safe to re-run: SKU is the natural upsert key for this starter catalog.

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'CPU Processor',
  'Starter computer-part product for Pekstore.',
  'CPU-PROCESSOR',
  199.99,
  20,
  'cpu',
  'active',
  '/assets/pekstore-parts/cpu.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Graphics Card',
  'Starter computer-part product for Pekstore.',
  'GRAPHICS-CARD',
  399.99,
  8,
  'gpu',
  'active',
  '/assets/pekstore-parts/gpu.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'RAM Memory',
  'Starter computer-part product for Pekstore.',
  'RAM-MEMORY',
  79.99,
  20,
  'ram',
  'active',
  '/assets/pekstore-parts/ram.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'SSD Drive',
  'Starter computer-part product for Pekstore.',
  'SSD-DRIVE',
  99.99,
  20,
  'ssd',
  'active',
  '/assets/pekstore-parts/ssd.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Motherboard',
  'Starter computer-part product for Pekstore.',
  'MOTHERBOARD',
  149.99,
  18,
  'motherboard',
  'active',
  '/assets/pekstore-parts/motherboard.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Power Supply',
  'Starter computer-part product for Pekstore.',
  'POWER-SUPPLY',
  89.99,
  20,
  'psu',
  'active',
  '/assets/pekstore-parts/psu.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'PC Case',
  'Starter computer-part product for Pekstore.',
  'PC-CASE',
  69.99,
  17,
  'case',
  'active',
  '/assets/pekstore-parts/case.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'CPU Cooler',
  'Starter computer-part product for Pekstore.',
  'CPU-COOLER',
  49.99,
  18,
  'cooler',
  'active',
  '/assets/pekstore-parts/cooler.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Monitor',
  'Starter computer-part product for Pekstore.',
  'MONITOR',
  179.99,
  19,
  'monitor',
  'active',
  '/assets/pekstore-parts/monitor-square.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Keyboard',
  'Starter computer-part product for Pekstore.',
  'KEYBOARD',
  39.99,
  17,
  'keyboard',
  'active',
  '/assets/pekstore-parts/keyboard.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Mouse',
  'Starter computer-part product for Pekstore.',
  'MOUSE',
  24.99,
  18,
  'mouse',
  'active',
  '/assets/pekstore-parts/mouse.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

INSERT INTO products (name, description, sku, price, stock, slug, status, image_url)
VALUES (
  'Headset',
  'Starter computer-part product for Pekstore.',
  'HEADSET',
  59.99,
  20,
  'headset',
  'active',
  '/assets/pekstore-parts/headset.jpg'
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  image_url = EXCLUDED.image_url;

