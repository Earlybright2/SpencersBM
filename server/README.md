# SpencerSBM — Server

Express API for the SpencerSBM marketplace. Handles authentication, password resets, wallet funding (Flutterwave), and proxying of the **Bulnix** provider (virtual-number SMS verification, social-account marketplace, and followers growth).

## Quick Start

```bash
npm install
cp .env .env  # fill in your values (see Environment Variables)
npm run dev   # starts with file watching
# or
npm start     # single run
```

Server runs on **http://localhost:5000**.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Port to listen on (default `5000`) |
| `DATABASE_URL` | yes | PostgreSQL connection string (e.g. from Railway). Schema is created automatically on startup |
| `CLIENT_URL` | no | Allowed client origin(s), comma-separated / base for reset links (default `http://localhost:5173`) |
| `JWT_SECRET` | yes | Secret used to sign auth tokens |
| `RESEND_API_KEY` | no | Resend API key. If set, transactional emails are sent via Resend. If empty, reset links / emails are logged to the console (dev mode) |
| `RESEND_FROM` | no | Sender address on your verified Resend domain, e.g. `SpencerSBM <no-reply@spencersbm.com.ng>` |
| `FLW_CLIENT_ID` / `FLW_CLIENT_SECRET` / `FLW_ENCRYPTION_KEY` | for payments | Flutterwave credentials for wallet funding |
| `FLW_SECRET_HASH` | for payments | Verifies incoming Flutterwave webhook signatures |
| `BULNIX_BASE_URL` | no | Bulnix API base (default `https://bulnix.com/api/v1`) |
| `BULNIX_MARKETPLACE_KEY` | for accounts | Bulnix key for the social-account marketplace (never sent to the browser) |
| `BULNIX_SMS_KEY` | for numbers | Bulnix key for SMS verification numbers (never sent to the browser) |
| `BULNIX_FOLLOWERS_KEY` | for followers | Bulnix key for followers-growth services (never sent to the browser) |
| `BULNIX_MARKUP` | no | Markup factor applied on top of Bulnix's USD cost (default `1.35`). Legacy `DIGITAL_MARKUP` is honored as a fallback |
| `BULNIX_TIMEOUT_MS` | no | Per-request Bulnix timeout in ms (default `12000`) |
| `NUMBER_EXPIRY_MINUTES` | no | SMS window for virtual numbers (default `20`) |

> Each Bulnix service uses a **separate `blx_` key** but shares one base URL and one reseller wallet. A service whose key is absent degrades gracefully — its helpers return a normalized "not configured" object and the client simply shows that service as coming soon, so the live site is never affected.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run with `node --watch` (auto-restart on change) |
| `npm start` | Run once |

## Project Structure

```
server/
├── index.js            # App bootstrap: cors, json, routes, global error handler
├── routes/
│   ├── auth.js         # Register, login, me, change/forgot/reset password
│   ├── wallet.js       # Wallet balance + Flutterwave funding
│   ├── orders.js       # Purchase history, catalog, inventory accounts, SMS status/cancel
│   ├── admin.js        # Admin stats, sales, users, product & inventory management
│   ├── bulnix.js       # Bulnix proxy: marketplace, SMS verification, followers
│   └── webhook.js      # Flutterwave payment webhook
├── utils/
│   ├── auth.js         # JWT sign/token helpers + requireAuth / requireAdmin middleware
│   ├── db.js           # PostgreSQL connection pool (DATABASE_URL)
│   ├── mailer.js       # Resend transport + email templates (or dev console log)
│   ├── flutterwave.js  # Flutterwave client + reference helpers
│   ├── bulnix.js       # Safe Bulnix client (timeouts, retries, error objects, markup)
│   ├── rates.js        # Live USD→NGN rate used for NGN pricing
│   └── store.js        # PostgreSQL-backed persistence for users, orders & products
```

## API Reference

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check — verifies the data store is readable. Returns `200`/`503` |
| GET | `/api/config` | Client-facing runtime flags (no secrets) |

### Authentication — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | – | Create account `{ name, email, password }` → `{ token, user }` |
| POST | `/login` | – | Log in `{ email, password }` → `{ token, user }` |
| GET | `/me` | Bearer | Current user from a valid token |
| POST | `/change-password` | Bearer | `{ currentPassword, newPassword }` |
| POST | `/forgot-password` | – | `{ email }` — sends reset link (or logs it in dev) |
| POST | `/reset-password` | – | `{ token, newPassword }` — completes a reset |

Validation rules: valid email format, password **≥ 8 characters**, duplicate emails rejected.

### Bulnix Provider — `/api/bulnix`

Bulnix quotes in USD; the server converts to NGN with a markup (see `applyBulnixMarkup`). Purchase/status routes require Bearer auth; browse routes are public so the store can render before login.

**Marketplace (social accounts)** — delivered synchronously at purchase time.

| Method | Path | Auth | Params | Description |
|--------|------|------|--------|-------------|
| GET | `/status` | – | – | Which Bulnix services are configured (no secrets) |
| GET | `/marketplace/categories` | – | – | Product categories |
| GET | `/marketplace/products` | – | `category`, `search`, `page` | Browse products (NGN prices) |
| GET | `/marketplace/products/:id` | – | – | Single product detail |
| POST | `/marketplace/order` | Bearer | `{ productId, quantity? }` | Buy account(s); wallet debited, credentials stored on the order |
| GET | `/marketplace/order/:id/status` | Bearer | – | Poll a marketplace order |

**SMS verification (virtual numbers)** — `worldwide` channel is the live purchase route.

| Method | Path | Auth | Params | Description |
|--------|------|------|--------|-------------|
| GET | `/sms/countries` | – | `channel` | Countries for a channel |
| GET | `/sms/services` | – | `channel`, `country_code` | Verification services + NGN prices for a country |
| POST | `/sms/order` | Bearer | `{ channel, countryCode, serviceSlug }` | Activate a number (price-locked, wallet debited) |
| GET | `/sms/order/:id` | Bearer | – | Refresh number / delivered code / lifecycle |

**Followers growth** — provider client is wired up (`/followers/services`); no customer UI is shipped yet.

### Orders — `/api/orders` (all require Bearer auth)

| Method | Path | Body/Params | Description |
|--------|------|-------------|-------------|
| GET | `/` | – | Current user's purchase history (numbers + accounts) |
| GET | `/payments` | – | All wallet money movements (funding + purchases) |
| GET | `/paid-accounts` | – | Purchased social media accounts with credentials |
| GET | `/catalog` | – | Locally-stocked buyable products (numbers + accounts) |
| POST | `/accounts` | `{ productId, quantity? }` | Buy a social account from manually-stocked inventory (wallet debited) |
| GET | `/status` | `order_ref` | Poll the SMS code for a purchased number (Bulnix-aware; time-based expiry + auto-refund) |
| POST | `/cancel` | `{ order_ref }` | Cancel and refund an order (blocked once a usable SMS code / account has been delivered) |

### Admin — `/api/admin` (all require Admin auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` `/sales` `/users` `/products` | Dashboard data |
| POST/PUT/DELETE | `/products/numbers[/:id]` | Manage number products |
| POST/PUT/DELETE | `/products/accounts[/:id]` | Manage account products |
| POST/DELETE | `/products/accounts/:id/inventory[/:invId]` | Add / remove account inventory slots |
| POST | `/orders/sms` | Manually backfill a truncated SMS code for a user's order |

### Webhook — `/api/webhook`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/flutterwave` | Signature | Credits a user's wallet when a funding charge succeeds |

## Behavior Notes

- **Data persistence**: users, orders, and products live in a PostgreSQL database configured via `DATABASE_URL` (e.g. a Railway Postgres instance). Schema is created automatically on startup.
- **Provider safety**: every Bulnix call runs through `bxRequest`, which applies a timeout, a retry, and **never throws** — it returns well-formed error objects (`isBxSuccess` / `bxError` / `bxData` helpers) so the process stays alive when the provider is down or a key is missing.
- **Pricing**: `applyBulnixMarkup(usdCost, ngnRate, markup)` multiplies the USD cost by the live USD→NGN rate and the markup, then rounds up to the nearest ₦100.
- **SMS lifecycle** is time-based: a number is refunded automatically only once its expiry window closes without a usable code, or Bulnix reports it dead — a live number is never expired early.
- **Error handling**: a global error middleware returns `500` for unexpected failures; Bulnix handler failures return `502`.
- **CORS**: allowed origin(s) come from `CLIENT_URL`.
