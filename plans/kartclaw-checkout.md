# KartClaw Checkout Plan

## Goal

Build a checkout flow for anonymous carts where KartClaw validates stock/prices at checkout click, keeps the buyer on the cart screen if fixes are needed, moves clean carts into checkout, shows available payment methods first, collects and verifies a WhatsApp phone number with OTP, creates or reuses a user account, collects shipping/pickup details, accepts payment, creates a final order, and sends a WhatsApp order confirmation through Baileys.

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
      +-- invalid --> stay on Cart screen
      |                show price/stock/cart errors inline
      |
      +-- valid ----> Checkout screen
                         |
                         v
                 Show available payment methods
                 (GPay / card / COD / enabled options)
                         |
                         | user clicks Continue
                         v
                 Enter WhatsApp phone
                         |
                         v
                 Send OTP via Baileys
                         |
                         v
                 Verify OTP
                         |
               +---------+----------+
               | invalid/error      | valid
               v                    v
        Show checkout error   Login existing user
                              OR sign up new user
                                      |
                                      v
                              Shipping address OR pickup
                                      |
                                      v
                              Pay using selected method
                                      |
                            +-+------------------+
                            | error              | success
                            v                    v
                    Show checkout error   Order placed screen
                                          Show order id
                                          WhatsApp confirmation
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
   |                                  |                              |
   | if errors: stay on cart screen   |                              |
   | and show inline cart errors      |                              |
   |                                  |                              |
   | if ok: navigate to checkout      |                              |
```

### 2. Payment-method preview, then WhatsApp OTP with Baileys

```text
Browser                    KartClaw API                Baileys worker/session          WhatsApp
   |                             |                               |                       |
   | checkout screen loads       |                               |                       |
   |---------------------------->| GET /checkout/payment-methods |                       |
   |<----------------------------| GPay/card/COD/enabled options |                       |
   | show methods + Continue     |                               |                       |
   |                             |                               |                       |
   | user clicks Continue        |                               |                       |
   | enter phone                 |                               |                       |
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
   |<----------------------------| {sessionToken, user} OR error |                       |
   | show checkout error on fail |                               |                       |
```

### 3. Order + payment flow

```text
Browser                         API                         Payment Provider             DB / WhatsApp
   |                              |                                |                       |
   | selected payment method       |                                |                       |
   | choose shipping/pickup        |                                |                       |
   |-----------------------------> | create checkout_session         | INSERT session        |
   |                              | validate cart again             | lock/verify stock     |
   |<----------------------------- | payment instructions/url        |                       |
   |                              |                                |                       |
   | user pays / confirms COD      |<------------------------------- | webhook/callback      |
   |                              | verify payment or COD choice    |                       |
   |                              | create order                    | INSERT order/items    |
   |                              | decrement stock                 | UPDATE products       |
   |                              | send order placed WhatsApp      | Baileys sendMessage   |
   |<----------------------------- | order placed + order id         |                       |
   |                              |                                |                       |
   | payment/order error           |                                | no order finalization |
   |<----------------------------- | checkout-screen error message   |                       |
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
| - users                  |        | - send order confirmations|
| - payment methods        |        +--------------------------+
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
payment_method nullable -- selected after buyer sees available methods first
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
GET  /api/whatsapp/status          -- returns connected + qrDataUrl for Baileys login
POST /api/whatsapp/restart         -- operator helper to restart Baileys socket
POST /api/checkout/validate-cart
GET  /api/checkout/payment-methods
GET  /api/auth/me                  -- sessionToken lookup + latest saved address
POST /api/auth/otp/send
POST /api/auth/otp/verify
POST /api/checkout/session
PATCH /api/checkout/session/:uuid/payment-method
PATCH /api/checkout/session/:uuid/fulfillment
POST /api/checkout/session/:uuid/pay
POST /api/payments/webhook
GET  /api/orders/:uuid
GET  /api/orders/mine              -- logged-in account screen past orders
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

## Checkout transition rules

- Checkout click always calls `POST /api/checkout/validate-cart` before navigation.
- If validation returns any error, the storefront stays on the cart screen and shows readable inline errors next to the affected cart items or in a cart-level error banner.
- If validation succeeds, the storefront navigates to the checkout screen and keeps the validated cart snapshot for the rest of checkout.
- The first checkout step shows available payment methods before asking for phone/OTP. This lets COD-only buyers see immediately that COD is available and lets online-payment buyers know GPay/card options exist before they spend time entering OTP.
- The buyer chooses a payment method and clicks Continue.
- If the browser has a valid saved `sessionToken`, checkout identifies the user with `GET /api/auth/me`, skips phone/OTP, and pre-fills the latest shipping address.
- Once logged in, the storefront shows an account/person icon beside the cart button. Clicking it opens the account screen with past orders listed one below another: order id, date, status, items, and total amount.
- If no valid session exists, checkout asks for phone + OTP and then saves the returned `sessionToken` in `localStorage` for future checkouts.
- OTP, address, and payment errors are shown on the checkout screen without sending the buyer back to cart unless the cart itself becomes invalid during final validation.
- A successful payment or confirmed COD order shows an order placed screen with the order id and triggers a WhatsApp confirmation message through Baileys.

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
API/src/index.js                         add checkout/auth/order routes + Baileys QR/status/send helpers
API/db/migrations/003_checkout.sql       users, otp, checkout, orders schema
storefront/src/main.jsx                  add cart validation, payment-method preview, checkout screen, account orders screen + error transitions
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
   - First step shows available payment methods: GPay, card, COD, and any enabled provider options.
   - Buyer selects one payment method and clicks Continue before phone/OTP.
   - Phone number step.
   - OTP step.
   - Shipping/pickup step.
   - Payment step using the selected method.
   - Checkout-screen error banner/inline state for OTP, address, payment, and order errors.

3. **WhatsApp OTP**
   - Add Baileys worker/helper.
   - Expose QR login through `GET /api/whatsapp/status` so the operator can scan and connect the WhatsApp session.
   - Store OTP hash only, never plaintext.
   - Rate-limit by phone/IP.
   - Expire OTPs after 10 minutes.

4. **User account creation**
   - On OTP verify, `INSERT ... ON CONFLICT(phone_e164) DO UPDATE`.
   - Store session/JWT for checkout continuation.

5. **Payment + order creation**
   - Integrate payment provider and COD finalization path.
   - Validate cart again before payment/order finalization.
   - Use DB transaction and row locks when decrementing stock.
   - On success, show order placed screen with order id.
   - Send WhatsApp order placed confirmation through Baileys.
   - On failure, keep buyer on checkout screen and show the payment/order error.

## Security notes

- Validate cart twice: checkout click and payment/order finalization.
- Store OTP hashes only.
- Add resend throttling and max attempt count.
- Normalize phone numbers to E.164 before sending OTP.
- Keep Baileys auth/session files out of git.
- Payment must be confirmed by provider webhook, not only frontend success.
- COD must still create an auditable order event and should not pretend to be paid online.
- WhatsApp order confirmation should be sent only after the order row exists.
