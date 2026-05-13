import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pg from 'pg';

const { Pool } = pg;
const app = new Hono();

// 🧠 One tiny pool for now. KartClaw's API is intentionally boring here:
// Postgres is the source of truth, Hono is the fast little courier.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 🌎 Caddy keeps browser traffic same-origin at /api/*, but CORS makes local
// Vite dev servers painless too. Future-us appreciates tiny comforts.
app.use('*', cors());

app.get('/healthz', (c) => c.json({ ok: true, service: 'kartclaw-api' }));

app.get('/hello/storefront', (c) =>
  c.json({ text: 'Hello World from the KartClaw Storefront API 🛍️' })
);

app.get('/hello/admin', (c) =>
  c.json({ text: 'Hello World from the KartClaw Admin API 🛠️' })
);

app.get('/products', async (c) => {
  const { rows } = await pool.query(`
    SELECT
      uuid,
      name,
      description,
      sku,
      price,
      stock,
      slug,
      status,
      image_url
    FROM products
    WHERE status = 'active'
    ORDER BY created_at DESC, id DESC
  `);

  return c.json({
    products: rows.map((product) => ({
      ...product,
      price: Number(product.price),
      inStock: product.stock > 0
    }))
  });
});

const port = Number(process.env.PORT || 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`🦞 KartClaw API listening on http://0.0.0.0:${port}`);
});
