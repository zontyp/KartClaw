# KartClaw

KartClaw is a minimal, modern, AI-first ecommerce starter. It is built as a small alternative to heavier ecommerce stacks, with a React storefront, React admin app, Hono API, and PostgreSQL database.

## Stack

- `storefront/` — React + Vite + Tailwind CSS storefront
- `admin/` — React + Vite + Tailwind CSS admin frontend mounted at `/admin`
- `API/` — Hono API server
- `KartClawDB` — PostgreSQL 16 Docker container
- Docker Compose for local/prod-style deployment

## Routes

Production routing is currently handled by Caddy outside this repo:

- `https://tronez.com/` → storefront
- `https://tronez.com/admin` → admin
- `https://tronez.com/api/*` → API

## Requirements

- Docker
- Docker Compose
- Node.js/npm only if you want to run the apps outside Docker

## Installation

Clone the repo:

```bash
git clone https://github.com/zontyp/KartClaw.git
cd KartClaw
```

Start all services:

```bash
docker compose up -d --build
```

This starts:

```text
KartClawDB            PostgreSQL database
kartclaw-api          Hono API server
kartclaw-storefront   Storefront frontend
kartclaw-admin        Admin frontend
```

The API receives this database URL from Docker Compose:

```text
postgres://kartclaw:kartclaw@KartClawDB:5432/kartclaw
```

## Database setup

The repo includes migrations, seeds, and a development DB backup.

Apply migrations manually if needed:

```bash
cat API/db/migrations/001_create_products.sql | docker exec -i KartClawDB psql -U kartclaw -d kartclaw
cat API/db/migrations/002_add_product_image_url.sql | docker exec -i KartClawDB psql -U kartclaw -d kartclaw
```

Seed products manually if needed:

```bash
cat API/db/seeds/001_cyberpunk_products.sql | docker exec -i KartClawDB psql -U kartclaw -d kartclaw
cat API/db/seeds/002_import_pekstore_products.sql | docker exec -i KartClawDB psql -U kartclaw -d kartclaw
```

Restore the included development backup:

```bash
cat db-backups/kartclawdb-latest.sql | docker exec -i KartClawDB psql -U kartclaw -d kartclaw
```

Create a fresh backup:

```bash
docker exec KartClawDB pg_dump -U kartclaw -d kartclaw --no-owner --no-privileges > db-backups/kartclawdb-latest.sql
```

## Development commands

Run API only:

```bash
npm --prefix API run dev
```

Run storefront only:

```bash
npm --prefix storefront run dev
```

Run admin only:

```bash
npm --prefix admin run dev
```

Build frontends:

```bash
npm run build
```

## Notes

- Anonymous cart data is stored in browser `localStorage` under `kartclaw_cart_items`.
- Product data comes from `KartClawDB` through `GET /api/products`.
- The included SQL backup is development/bootstrap data only. Do not commit real customer data, payment data, tokens, or secrets.

## License

MIT
