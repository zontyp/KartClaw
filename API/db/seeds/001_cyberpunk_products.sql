-- 🧬 Starter catalog: minimal sci-fi/cypherpunk products so the storefront
-- has something to render immediately. Safe to re-run thanks to SKU upserts.

INSERT INTO products (name, description, sku, price, stock, slug, status)
VALUES
  (
    'Neon Cipher Jacket',
    'A lightweight smart-shell jacket with reflective circuit seams and rainproof midnight fabric.',
    'KC-JACKET-NEON-CIPHER',
    149.00,
    18,
    'neon-cipher-jacket',
    'active'
  ),
  (
    'Ghost Mesh Sneakers',
    'Low-profile street runners with translucent mesh, carbon grip, and quiet-step soles.',
    'KC-SNEAKER-GHOST-MESH',
    119.00,
    31,
    'ghost-mesh-sneakers',
    'active'
  ),
  (
    'Signal Black Cargo Pants',
    'Tapered utility cargos with magnetic pockets, matte hardware, and encrypted-tag styling.',
    'KC-CARGO-SIGNAL-BLACK',
    98.00,
    24,
    'signal-black-cargo-pants',
    'active'
  ),
  (
    'Chrome Veil Hoodie',
    'Oversized thermal hoodie with chrome drawcords and a soft privacy-mask collar.',
    'KC-HOODIE-CHROME-VEIL',
    89.00,
    40,
    'chrome-veil-hoodie',
    'active'
  ),
  (
    'Datastream Utility Vest',
    'Modular vest with quick-access loops and layered panels inspired by server-room geometry.',
    'KC-VEST-DATASTREAM',
    132.00,
    12,
    'datastream-utility-vest',
    'active'
  ),
  (
    'Optic Glitch Sunglasses',
    'Angular smoke-lens sunglasses with mirrored edges and a glitch-cut silhouette.',
    'KC-SUN-OPTIC-GLITCH',
    64.00,
    55,
    'optic-glitch-sunglasses',
    'active'
  )
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status;
