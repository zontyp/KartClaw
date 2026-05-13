# KartClaw Checkout Plan

## Goal

Build a checkout flow for anonymous carts where KartClaw validates stock/prices at checkout click, collects and verifies a WhatsApp phone number with OTP, creates or reuses a user account, lets the user choose a payment method, collects shipping/pickup details, then accepts payment and creates a final order.

## Core user flow

```text
Product list/detail
      |
      v
LocalStorage cart
      |
      | click Checkout
      v
POST /api/checkout/validate-cart
      |
      +-- invalid --> Cart screen shows price/stock fixes
      |
      +-- valid ----> Checkout screen
                         |
                         v
                 Enter WhatsApp phone
                         |
                         v
                 Send OTP via Baileys
                         |
                         v
                 Verify OTP
                         |
                         v
                 Create/reuse user account
                         |
                         v
                 Choose payment method
                         |
                         v
                 Shipping address OR pickup
                         |
                         v
                 Pay
                         |
                         v
                 Order created + confirmation
```

## Event flow diagrams

### 1. Validate cart before checkout screen

```text
Browser                         KartClaw API                    KartClawDB
   |                                  |                              |
   | cart from localStorage           |                              |
   |--------------------------------->|                              |
   | POST /api/checkout/validate-cart |                              |
   | {items:[{uuid, qty, price}]}     |                              |
   |                                  | SELECT products WHERE uuid IN |
   |                                  |----------------------------->|
   |                                  |<-----------------------------|
   |                                  | compare live price + stock    |
   |<---------------------------------|                              |
   | ok OR corrections/errors         |                              |
```

### 2. WhatsApp OTP with Baileys

```text
Browser                    KartClaw API                Baileys worker/session          WhatsApp
   |                             |                               |                       |
   | POST /auth/otp/send         |                               |                       |
   | {phone}                     |                               |                       |
   |---------------------------->| create otp_challenge          |                       |
   |                             |------------------------------>| sendMessage(phone)    |
   |                             |                               |---------------------->|
   |<----------------------------| {challengeId, expiresAt}      |                       |
   |                             |                               |                       |
   | POST /auth/otp/verify       |                               |                       |
   | {challengeId, otp}          |                               |                       |
   |---------------------------->| validate hash/expiry/attempts |                       |
   |                             | create/reuse user             |                       |
   |<----------------------------| {sessionToken, user}          |                       |
```

### 3. Order + payment flow

```text
Browser                         API                         Payment Provider             DB
   |                              |                                |                       |
   | choose payment method         |                                |                       |
   | choose shipping/pickup        |                                |                       |
   |-----------------------------> | create checkout_session         | INSERT session        |
   |                              | validate cart again             | lock/verify stock     |
   |<----------------------------- | payment instructions/url        |                       |
   |                              |                                |                       |
   | user pays                     |<------------------------------- | webhook/callback      |
   |                              | verify payment                  |                       |
   |                              | create order                    | INSERT order/items    |
   |                              | decrement stock                 | UPDATE products       |
   |<----------------------------- | order complete screen           |                       |
```

## System design

```text
+--------------------------+
| React Storefront         |
| - localStorage cart      |
| - cart screen            |
| - checkout SPA screen    |
+------------+-------------+
             |
             | /api/*
             v
+--------------------------+        +--------------------------+
| Hono API                 |        | Baileys WhatsApp Client  |
| - cart validation        |------->| - logged-in WA session   |
| - OTP challenges         |        | - send OTP messages      |
| - users                  |        +--------------------------+
| - checkout sessions      |
| - orders                 |        +--------------------------+
| - payment webhooks       |------->| Payment provider         |
+------------+-------------+        | Razorpay/Stripe/etc.     |
             |                      +--------------------------+
             v
+--------------------------+
| KartClawDB / PostgreSQL  |
| products, users, otp,    |
| checkout_sessions,       |
| orders, order_items      |
+--------------------------+
```

## Database schema diagram

```text
products
--------
id PK
uuid UNIQUE
name
price
stock
status
image_url

users
-----
id PK
phone_e164 UNIQUE
created_at
updated_at

otp_challenges
--------------
id PK
uuid UNIQUE
phone_e164
otp_hash
purpose              -- checkout_login
attempt_count
expires_at
verified_at nullable
created_at

checkout_sessions
-----------------
id PK
uuid UNIQUE
user_id FK -> users.id nullable until OTP done
status               -- validating, otp_pending, address_pending, payment_pending, paid, expired
cart_snapshot jsonb  -- validated items/prices shown to buyer
payment_method nullable
fulfillment_type     -- shipping | pickup
shipping_address_id FK nullable
created_at
updated_at
expires_at

addresses
---------
id PK
user_id FK -> users.id
recipient_name
phone_e164
line1
line2
city
region
postal_code
country
created_at

orders
------
id PK
uuid UNIQUE
user_id FK -> users.id
checkout_session_id FK -> checkout_sessions.id
status               -- pending_payment, paid, processing, fulfilled, cancelled
subtotal_cents
total_cents
payment_method
payment_reference
fulfillment_type
shipping_address_snapshot jsonb nullable
created_at
paid_at nullable

order_items
-----------
id PK
order_id FK -> orders.id
product_id FK -> products.id
product_uuid
name_snapshot
unit_price_cents
qty
row_total_cents
```

## API endpoints

```text
POST /api/checkout/validate-cart
POST /api/auth/otp/send
POST /api/auth/otp/verify
POST /api/checkout/session
PATCH /api/checkout/session/:uuid/payment-method
PATCH /api/checkout/session/:uuid/fulfillment
POST /api/checkout/session/:uuid/pay
POST /api/payments/webhook
GET  /api/orders/:uuid
```

## Cart validation response shape

```js
// POST /api/checkout/validate-cart
{
  items: [
    { uuid: '...', qty: 2, clientPrice: 129.99 }
  ]
}

// 200 OK
{
  ok: true,
  items: [
    {
      uuid: '...',
      name: 'Cyber Deck GPU',
      qty: 2,
      unitPrice: 129.99,
      rowTotal: 259.98,
      stock: 8,
      image_url: '/assets/...'
    }
  ],
  total: 259.98
}

// 409 Conflict
{
  ok: false,
  errors: [
    { uuid: '...', code: 'PRICE_CHANGED', oldPrice: 129.99, livePrice: 139.99 },
    { uuid: '...', code: 'INSUFFICIENT_STOCK', requested: 3, available: 1 }
  ],
  correctedItems: []
}
```

## Hono cart validation sketch

```js
app.post('/checkout/validate-cart', async (c) => {
  const { items = [] } = await c.req.json();
  const uuids = items.map((item) => item.uuid);

  const { rows: products } = await pool.query(
    'SELECT uuid, name, price, stock, status, image_url FROM products WHERE uuid = ANY($1)',
    [uuids]
  );

  const byUuid = new Map(products.map((product) => [product.uuid, product]));
  const errors = [];
  const correctedItems = [];

  for (const item of items) {
    const live = byUuid.get(item.uuid);
    if (!live || live.status !== 'enabled') {
      errors.push({ uuid: item.uuid, code: 'UNAVAILABLE' });
      continue;
    }
    if (Number(live.price) !== Number(item.price)) {
      errors.push({ uuid: item.uuid, code: 'PRICE_CHANGED', oldPrice: item.price, livePrice: Number(live.price) });
    }
    if (live.stock < item.qty) {
      errors.push({ uuid: item.uuid, code: 'INSUFFICIENT_STOCK', requested: item.qty, available: live.stock });
    }
    correctedItems.push({ ...live, qty: Math.min(item.qty, live.stock), unitPrice: Number(live.price) });
  }

  if (errors.length) return c.json({ ok: false, errors, correctedItems }, 409);

  return c.json({
    ok: true,
    items: correctedItems,
    total: correctedItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  });
});
```

## OTP sketch

```js
import crypto from 'node:crypto';

function makeOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(`${process.env.OTP_PEPPER}:${otp}`).digest('hex');
}

app.post('/auth/otp/send', async (c) => {
  const { phone } = await c.req.json();
  const otp = makeOtp();
  const otpHash = hashOtp(otp);

  const { rows } = await pool.query(
    `INSERT INTO otp_challenges (uuid, phone_e164, otp_hash, purpose, expires_at)
     VALUES (gen_random_uuid(), $1, $2, 'checkout_login', now() + interval '10 minutes')
     RETURNING uuid, expires_at`,
    [phone, otpHash]
  );

  await whatsapp.sendMessage(`${phone.replace('+', '')}@s.whatsapp.net`, {
    text: `Your KartClaw checkout code is ${otp}. It expires in 10 minutes.`
  });

  return c.json({ challengeId: rows[0].uuid, expiresAt: rows[0].expires_at });
});
```

## Files to add/change

```text
API/package.json                         add baileys dependency when OTP is implemented
API/src/index.js                         add checkout/auth/order routes
API/src/whatsapp.js                      Baileys session + sendOtp helper
API/db/migrations/003_checkout.sql       users, otp, checkout, orders schema
storefront/src/main.jsx                  add checkout screen + validation transitions
storefront/src/styles.css                checkout mobile/desktop polish if needed
storefront/public/plans/index.html       public HTML version of this plan
plans/kartclaw-checkout.md               canonical markdown plan
README.md                                document checkout env vars once implemented
```

## Implementation phases

1. **Cart validation**
   - Add `POST /api/checkout/validate-cart`.
   - Checkout button calls API with localStorage cart.
   - If valid, show checkout screen.
   - If invalid, show clear stock/price correction messages.

2. **Checkout screen shell**
   - Phone number step.
   - OTP step.
   - Payment method step.
   - Shipping/pickup step.
   - Payment step.

3. **WhatsApp OTP**
   - Add Baileys worker/helper.
   - Store OTP hash only, never plaintext.
   - Rate-limit by phone/IP.
   - Expire OTPs after 10 minutes.

4. **User account creation**
   - On OTP verify, `INSERT ... ON CONFLICT(phone_e164) DO UPDATE`.
   - Store session/JWT for checkout continuation.

5. **Payment + order creation**
   - Integrate payment provider.
   - Validate cart again before payment/order finalization.
   - Use DB transaction and row locks when decrementing stock.

## Security notes

- Validate cart twice: checkout click and payment/order finalization.
- Store OTP hashes only.
- Add resend throttling and max attempt count.
- Normalize phone numbers to E.164 before sending OTP.
- Keep Baileys auth/session files out of git.
- Payment must be confirmed by provider webhook, not only frontend success.
