import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pg from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import makeWASocket, { fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';

const { Pool } = pg;
const app = new Hono();

// 🧠 One tiny pool for now. KartClaw's API is intentionally boring here:
// Postgres is the source of truth, Hono is the fast little courier.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const OTP_PEPPER = process.env.OTP_PEPPER || 'dev-kartclaw-otp-pepper-change-me';
const BAILEYS_AUTH_DIR = process.env.BAILEYS_AUTH_DIR || '/data/baileys-auth';
const SESSION_TTL_HOURS = 24 * 14;

let whatsappSocket;
let whatsappStarting;
let latestQr;
let latestQrDataUrl;
let whatsappConnected = false;
let whatsappLastError = '';

// 🌎 Caddy keeps browser traffic same-origin at /api/*, but CORS makes local
// Vite dev servers painless too. Future-us appreciates tiny comforts.
app.use('*', cors());

function cents(value) {
  return Math.round(Number(value) * 100);
}

function normalizePhone(phone) {
  const trimmed = String(phone || '').trim();
  if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
    throw new Error('Enter phone in E.164 format, like +919876543210.');
  }
  return trimmed;
}

function makeOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashOtp(otp) {
  return sha256(`${OTP_PEPPER}:${otp}`);
}

function makeSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function ensureCheckoutSchema() {
  // 🛠️ No migration runner yet, so the API gently creates the checkout tables
  // on boot. The same SQL lives in API/db/migrations/003_checkout.sql for humans.
  const sql = await fs.readFile(new URL('../db/migrations/003_checkout.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

async function startWhatsApp() {
  // 🧯 Important: one Baileys socket at a time. While a QR is waiting to be
  // scanned, `whatsappConnected` is false but the socket is still alive. If
  // every /whatsapp/status refresh creates another socket, WhatsApp sees our
  // own sessions fighting each other and reports "Stream Errored (conflict)".
  if (whatsappSocket) return whatsappSocket;
  if (whatsappStarting) return whatsappStarting;

  whatsappStarting = (async () => {
    await fs.mkdir(BAILEYS_AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(BAILEYS_AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' }),
      browser: ['KartClaw', 'Chrome', '1.0.0']
    });

    whatsappSocket = socket;
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        latestQr = qr;
        latestQrDataUrl = await QRCode.toDataURL(qr);
        whatsappConnected = false;
        console.log('📱 KartClaw WhatsApp QR ready at /api/whatsapp/status');
      }
      if (connection === 'open') {
        latestQr = '';
        latestQrDataUrl = '';
        whatsappConnected = true;
        whatsappLastError = '';
        console.log('✅ KartClaw WhatsApp connected');
      }
      if (connection === 'close') {
        whatsappConnected = false;
        whatsappSocket = undefined;
        whatsappStarting = undefined;
        whatsappLastError = lastDisconnect?.error?.message || 'WhatsApp connection closed';
        console.log(`⚠️ KartClaw WhatsApp disconnected: ${whatsappLastError}`);
        // 🪃 Reconnect shortly. If WhatsApp logged us out, /whatsapp/status will
        // expose a fresh QR after the next start attempt.
        setTimeout(() => startWhatsApp().catch(() => {}), 3000);
      }
    });

    return socket;
  })();

  try {
    return await whatsappStarting;
  } finally {
    whatsappStarting = undefined;
  }
}

async function sendWhatsAppText(phoneE164, text) {
  await startWhatsApp();
  if (!whatsappConnected || !whatsappSocket) {
    const error = new Error('WhatsApp is not connected. Scan the QR code from /api/whatsapp/status first.');
    error.code = 'WHATSAPP_NOT_CONNECTED';
    throw error;
  }
  const jid = `${phoneE164.replace(/\D/g, '')}@s.whatsapp.net`;
  await whatsappSocket.sendMessage(jid, { text });
}

async function generateFiveDigitOrderId(client) {
  // 🎲 Five digits as requested. Try a few times before giving up; at current
  // scale this is plenty, and the DB unique index is the final referee.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const orderId = String(crypto.randomInt(0, 100000)).padStart(5, '0');
    const { rowCount } = await client.query('SELECT 1 FROM orders WHERE order_id = $1', [orderId]);
    if (!rowCount) return orderId;
  }
  throw new Error('Could not generate a unique 5-digit order id. Please try again.');
}

async function getUserFromSessionToken(sessionToken) {
  const tokenHash = sha256(String(sessionToken || ''));
  const { rows } = await pool.query(
    `SELECT users.id, users.phone_e164
     FROM user_sessions
     JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = $1 AND user_sessions.expires_at > now()`,
    [tokenHash]
  );
  return rows[0];
}

function readSessionToken(c) {
  const auth = c.req.header('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return c.req.header('x-kartclaw-session') || '';
}

async function getLatestAddressForUser(userId) {
  const { rows } = await pool.query(
    `SELECT recipient_name, phone_e164, line1, line2, city, region, postal_code, country
     FROM addresses
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getStoreName() {
  // 🏷️ Store branding lives in DB, not hard-coded WhatsApp copy. Today it is
  // Tronez; tomorrow an admin screen can change this without code edits.
  const { rows } = await pool.query("SELECT value FROM store_settings WHERE key = 'store_name'");
  return rows[0]?.value || 'Tronez';
}

app.get('/healthz', (c) => c.json({ ok: true, service: 'kartclaw-api' }));

app.get('/hello/storefront', (c) =>
  c.json({ text: 'Hello World from the KartClaw Storefront API 🛍️' })
);

app.get('/hello/admin', (c) =>
  c.json({ text: 'Hello World from the KartClaw Admin API 🛠️' })
);

app.get('/whatsapp/status', async (c) => {
  await startWhatsApp().catch((error) => {
    whatsappLastError = error.message;
  });

  const status = {
    connected: whatsappConnected,
    qr: latestQr || null,
    qrDataUrl: latestQrDataUrl || null,
    lastError: whatsappLastError || null
  };

  // 📱 Human-friendly QR page for operators opening the URL in a browser.
  // Add ?json=1 if you want the raw machine-readable status payload.
  const wantsJson = c.req.query('json') === '1' || c.req.header('accept')?.includes('application/json');
  if (wantsJson) return c.json(status);

  const qrBlock = status.connected
    ? '<div class="success">✅ WhatsApp is connected. You can close this tab.</div>'
    : status.qrDataUrl
      ? `<img class="qr" src="${status.qrDataUrl}" alt="WhatsApp login QR code" /><p>Open WhatsApp → Linked devices → Link a device, then scan this code.</p>`
      : '<div class="warn">QR is not ready yet. Refresh in a few seconds.</div>';

  return c.html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KartClaw WhatsApp Login</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#020617; color:#e2e8f0; font-family:Inter,system-ui,sans-serif; }
    main { width:min(92vw,560px); border:1px solid #334155; border-radius:8px; background:#0f172a; padding:32px; text-align:center; box-shadow:0 24px 80px rgba(0,0,0,.35); }
    h1 { margin:0 0 10px; color:#22d3ee; }
    p { color:#94a3b8; line-height:1.6; }
    .qr { width:min(78vw,360px); height:min(78vw,360px); margin:22px auto; display:block; border-radius:8px; background:white; padding:14px; }
    .success { border:1px solid #34d39966; background:#10b9811a; color:#bbf7d0; border-radius:8px; padding:18px; }
    .warn { border:1px solid #f59e0b66; background:#f59e0b1a; color:#fde68a; border-radius:8px; padding:18px; }
    a { color:#22d3ee; }
  </style>
</head>
<body>
  <main>
    <h1>KartClaw WhatsApp Login</h1>
    ${qrBlock}
    ${status.lastError ? `<p>Last error: ${String(status.lastError).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))}</p>` : ''}
    <p><a href="/api/whatsapp/status">Refresh</a> · <a href="/api/whatsapp/status?json=1">JSON status</a></p>
  </main>
</body>
</html>`);
});

app.post('/whatsapp/restart', async (c) => {
  whatsappSocket?.end?.(new Error('Manual restart requested'));
  whatsappSocket = undefined;
  whatsappConnected = false;
  await startWhatsApp();
  return c.json({ ok: true });
});

app.get('/auth/me', async (c) => {
  const sessionToken = readSessionToken(c);
  if (!sessionToken) return c.json({ loggedIn: false });

  const user = await getUserFromSessionToken(sessionToken);
  if (!user) return c.json({ loggedIn: false });

  const latestAddress = await getLatestAddressForUser(user.id);
  return c.json({ loggedIn: true, user, latestAddress });
});

app.get('/orders/mine', async (c) => {
  const sessionToken = readSessionToken(c);
  const user = await getUserFromSessionToken(sessionToken);
  if (!user) return c.json({ ok: false, message: 'Please log in to view orders.' }, 401);

  const { rows: orderRows } = await pool.query(
    `SELECT id, uuid, order_id, status, total_cents, payment_method, fulfillment_type, shipping_address_snapshot, created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC`,
    [user.id]
  );

  if (!orderRows.length) return c.json({ orders: [] });

  const { rows: itemRows } = await pool.query(
    `SELECT order_id, product_uuid, name_snapshot, unit_price_cents, qty, row_total_cents
     FROM order_items
     WHERE order_id = ANY($1::bigint[])
     ORDER BY id ASC`,
    [orderRows.map((order) => order.id)]
  );

  const itemsByOrderId = new Map();
  for (const item of itemRows) {
    if (!itemsByOrderId.has(String(item.order_id))) itemsByOrderId.set(String(item.order_id), []);
    itemsByOrderId.get(String(item.order_id)).push({
      productUuid: item.product_uuid,
      name: item.name_snapshot,
      unitPrice: Number(item.unit_price_cents) / 100,
      qty: item.qty,
      rowTotal: Number(item.row_total_cents) / 100
    });
  }

  return c.json({
    orders: orderRows.map((order) => ({
      uuid: order.uuid,
      orderId: order.order_id,
      status: order.status,
      total: Number(order.total_cents) / 100,
      paymentMethod: order.payment_method,
      fulfillmentType: order.fulfillment_type,
      shippingAddress: order.shipping_address_snapshot,
      createdAt: order.created_at,
      items: itemsByOrderId.get(String(order.id)) || []
    }))
  });
});

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

app.get('/checkout/payment-methods', (c) => c.json({
  methods: [
    { id: 'gpay', label: 'GPay', description: 'Online payments coming soon.', enabled: true, availableNow: false },
    { id: 'card', label: 'Card', description: 'Online payments coming soon.', enabled: true, availableNow: false },
    { id: 'cod', label: 'Cash on Delivery', description: 'Place the order now and pay at delivery.', enabled: true, availableNow: true }
  ]
}));

app.post('/checkout/validate-cart', async (c) => {
  const { items = [] } = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ ok: false, errors: [{ code: 'EMPTY_CART', message: 'Your cart is empty.' }], correctedItems: [] }, 409);
  }

  const uuids = items.map((item) => item.uuid);
  const { rows: products } = await pool.query(
    'SELECT id, uuid, name, price, stock, status, image_url FROM products WHERE uuid = ANY($1::uuid[])',
    [uuids]
  );

  const byUuid = new Map(products.map((product) => [String(product.uuid), product]));
  const errors = [];
  const correctedItems = [];

  for (const item of items) {
    const live = byUuid.get(String(item.uuid));
    const qty = Math.max(1, Number.parseInt(item.qty, 10) || 1);
    if (!live || live.status !== 'active') {
      errors.push({ uuid: item.uuid, code: 'UNAVAILABLE', message: 'This item is no longer available.' });
      continue;
    }
    const livePrice = Number(live.price);
    if (Number(livePrice) !== Number(item.price)) {
      errors.push({ uuid: item.uuid, code: 'PRICE_CHANGED', oldPrice: Number(item.price), livePrice, message: `${live.name} price changed.` });
    }
    if (live.stock < qty) {
      errors.push({ uuid: item.uuid, code: 'INSUFFICIENT_STOCK', requested: qty, available: live.stock, message: `${live.name} has only ${live.stock} available.` });
    }
    correctedItems.push({
      productId: live.id,
      uuid: live.uuid,
      name: live.name,
      qty: Math.min(qty, live.stock),
      unitPrice: livePrice,
      rowTotal: livePrice * Math.min(qty, live.stock),
      stock: live.stock,
      image_url: live.image_url
    });
  }

  if (errors.length) return c.json({ ok: false, errors, correctedItems }, 409);

  const total = correctedItems.reduce((sum, item) => sum + item.rowTotal, 0);
  const { rows } = await pool.query(
    `INSERT INTO checkout_sessions (cart_snapshot, status, expires_at)
     VALUES ($1::jsonb, 'payment_method_pending', now() + interval '2 hours')
     RETURNING uuid`,
    [JSON.stringify({ items: correctedItems, total })]
  );

  return c.json({ ok: true, checkoutToken: rows[0].uuid, items: correctedItems, total });
});

app.post('/auth/otp/send', async (c) => {
  try {
    const { phone } = await c.req.json();
    const phoneE164 = normalizePhone(phone);
    const otp = makeOtp();
    const otpHash = hashOtp(otp);

    const { rows } = await pool.query(
      `INSERT INTO otp_challenges (phone_e164, otp_hash, purpose, expires_at)
       VALUES ($1, $2, 'checkout_login', now() + interval '10 minutes')
       RETURNING uuid, expires_at`,
      [phoneE164, otpHash]
    );

    const storeName = await getStoreName();
    await sendWhatsAppText(phoneE164, `Your ${storeName} checkout code is ${otp}. It expires in 10 minutes.`);

    return c.json({ challengeId: rows[0].uuid, expiresAt: rows[0].expires_at });
  } catch (error) {
    const status = error.code === 'WHATSAPP_NOT_CONNECTED' ? 503 : 400;
    return c.json({ ok: false, code: error.code || 'OTP_SEND_FAILED', message: error.message, qrRequired: error.code === 'WHATSAPP_NOT_CONNECTED' }, status);
  }
});

app.post('/auth/otp/verify', async (c) => {
  const { challengeId, otp } = await c.req.json();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM otp_challenges
       WHERE uuid = $1 AND purpose = 'checkout_login'
       FOR UPDATE`,
      [challengeId]
    );
    const challenge = rows[0];
    if (!challenge) throw new Error('OTP challenge not found.');
    if (challenge.verified_at) throw new Error('This OTP was already used.');
    if (new Date(challenge.expires_at).getTime() < Date.now()) throw new Error('OTP expired. Please request a new code.');
    if (challenge.attempt_count >= 5) throw new Error('Too many OTP attempts. Please request a new code.');

    await client.query('UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = $1', [challenge.id]);
    if (hashOtp(String(otp || '')) !== challenge.otp_hash) throw new Error('Incorrect OTP.');

    await client.query('UPDATE otp_challenges SET verified_at = now() WHERE id = $1', [challenge.id]);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (phone_e164)
       VALUES ($1)
       ON CONFLICT (phone_e164) DO UPDATE SET updated_at = now()
       RETURNING id, phone_e164`,
      [challenge.phone_e164]
    );

    const sessionToken = makeSessionToken();
    await client.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + ($3 || ' hours')::interval)`,
      [userRows[0].id, sha256(sessionToken), SESSION_TTL_HOURS]
    );

    const latestAddress = await getLatestAddressForUser(userRows[0].id);

    await client.query('COMMIT');
    return c.json({ sessionToken, user: userRows[0], latestAddress });
  } catch (error) {
    await client.query('ROLLBACK');
    return c.json({ ok: false, message: error.message }, 400);
  } finally {
    client.release();
  }
});

app.post('/checkout/session/:uuid/order', async (c) => {
  const checkoutToken = c.req.param('uuid');
  const body = await c.req.json();
  const { sessionToken, paymentMethod, fulfillmentType, address = {} } = body;

  if (paymentMethod !== 'cod') {
    return c.json({ ok: false, message: 'Online payments are coming soon. Please choose Cash on Delivery for now.' }, 400);
  }
  if (!['shipping', 'pickup'].includes(fulfillmentType)) {
    return c.json({ ok: false, message: 'Choose shipping or pickup.' }, 400);
  }

  const user = await getUserFromSessionToken(sessionToken);
  if (!user) return c.json({ ok: false, message: 'Please verify your phone number again.' }, 401);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: sessionRows } = await client.query(
      `SELECT * FROM checkout_sessions
       WHERE uuid = $1 AND expires_at > now() AND status <> 'completed'
       FOR UPDATE`,
      [checkoutToken]
    );
    const checkout = sessionRows[0];
    if (!checkout) throw new Error('Checkout session expired. Please return to cart and checkout again.');

    const snapshot = checkout.cart_snapshot;
    const items = snapshot.items || [];
    if (!items.length) throw new Error('Checkout cart is empty.');

    let addressId = null;
    let addressSnapshot = null;
    if (fulfillmentType === 'shipping') {
      const required = ['recipientName', 'line1', 'city', 'region', 'postalCode', 'country'];
      const missing = required.filter((field) => !String(address[field] || '').trim());
      if (missing.length) throw new Error('Please fill all required shipping fields.');
      const phoneE164 = address.phone ? normalizePhone(address.phone) : user.phone_e164;
      const { rows: addressRows } = await client.query(
        `INSERT INTO addresses (user_id, recipient_name, phone_e164, line1, line2, city, region, postal_code, country)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [user.id, address.recipientName, phoneE164, address.line1, address.line2 || '', address.city, address.region, address.postalCode, address.country]
      );
      addressId = addressRows[0].id;
      addressSnapshot = addressRows[0];
    } else {
      if (!String(address.recipientName || '').trim()) throw new Error('Please enter pickup contact name.');
      addressSnapshot = { recipient_name: address.recipientName, phone_e164: user.phone_e164, pickup: true };
    }

    const subtotalCents = cents(snapshot.total);
    const orderId = await generateFiveDigitOrderId(client);
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (order_id, user_id, checkout_session_id, status, subtotal_cents, total_cents, payment_method, fulfillment_type, shipping_address_snapshot)
       VALUES ($1,$2,$3,'placed',$4,$5,$6,$7,$8::jsonb)
       RETURNING id, uuid, order_id`,
      [orderId, user.id, checkout.id, subtotalCents, subtotalCents, paymentMethod, fulfillmentType, JSON.stringify(addressSnapshot)]
    );
    const order = orderRows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_uuid, name_snapshot, unit_price_cents, qty, row_total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.productId, item.uuid, item.name, cents(item.unitPrice), item.qty, cents(item.rowTotal)]
      );
      await client.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.qty, item.productId]);
    }

    await client.query(
      `UPDATE checkout_sessions
       SET user_id = $1, status = 'completed', payment_method = $2, fulfillment_type = $3, shipping_address_id = $4, updated_at = now()
       WHERE id = $5`,
      [user.id, paymentMethod, fulfillmentType, addressId, checkout.id]
    );

    await client.query('COMMIT');

    const storeName = await getStoreName();
    await sendWhatsAppText(
      user.phone_e164,
      `Your ${storeName} order #${order.order_id} is placed. Payment method: Cash on Delivery. Total: $${Number(snapshot.total).toFixed(2)}.`
    ).catch((error) => console.log(`⚠️ Order WhatsApp confirmation failed for ${order.order_id}: ${error.message}`));

    return c.json({ ok: true, orderId: order.order_id, orderUuid: order.uuid });
  } catch (error) {
    await client.query('ROLLBACK');
    return c.json({ ok: false, message: error.message }, 400);
  } finally {
    client.release();
  }
});

const port = Number(process.env.PORT || 3000);

ensureCheckoutSchema()
  .then(() => startWhatsApp().catch((error) => {
    whatsappLastError = error.message;
    console.log(`⚠️ WhatsApp did not start yet: ${error.message}`);
  }))
  .then(() => {
    serve({ fetch: app.fetch, port }, () => {
      console.log(`🦞 KartClaw API listening on http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error('💥 KartClaw API failed to start', error);
    process.exit(1);
  });
