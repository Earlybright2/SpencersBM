# SpencersBM — Server

Express API for the SpencersBM marketplace. Handles authentication, password resets, and proxying of the OneGridHub virtual-number/SMS provider.

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
| `CLIENT_URL` | no | Allowed client origin / base for reset links (default `http://localhost:5173`) |
| `JWT_SECRET` | yes | Secret used to sign auth tokens |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | no | SMTP credentials. If set, password-reset emails are sent. If empty, reset links are logged to the console (dev mode) |
| `ONEGRIDHUB_BASE_URL` | no | OneGridHub API endpoint |
| `ONEGRIDHUB_API_KEY` | yes | OneGridHub API key (never sent to the browser) |

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
│   └── onegridhub.js   # Proxy + order logic for the numbers provider
├── utils/
│   ├── auth.js         # JWT sign/token helpers + requireAuth middleware
│   ├── db.js           # PostgreSQL connection pool (DATABASE_URL)
│   ├── mailer.js       # Nodemailer transport + reset email (or dev console log)
│   ├── onegridhub.js   # Safe provider client (timeouts, retries, error objects)
│   └── store.js        # PostgreSQL-backed persistence for users & orders
```

## API Reference

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check — verifies the data store is readable. Returns `200`/`503` |

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

### Numbers Provider — `/api/onegridhub` (all require Bearer auth)

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | `/servers` | – | Available provider servers |
| GET | `/services` | `server` | SMS services for a server |
| GET | `/countries` | `server` | Countries for a server |
| GET | `/price` | `server, country, service` | Live price check |
| GET | `/balance` | – | OneGridHub wallet balance |
| POST | `/buy` | `{ server, country, service }` | Purchase a virtual number |
| GET | `/status` | `order_ref` | Check SMS/status for an order |
| POST | `/cancel` | `{ order_ref }` | Cancel an active number |
| GET | `/orders` | – | Current user's order history |

## Behavior Notes

- **Data persistence**: users and orders live in a PostgreSQL database configured via `DATABASE_URL` (e.g. a Railway Postgres instance). The `users` table is created automatically on startup.
- **Provider safety**: all OneGridHub calls run through `ogRequest`, which applies a 12s timeout, 2 retries, and never throws — the API returns well-formed error objects so the process stays alive when the provider is down.
- **Error handling**: a global error middleware returns `500` for unexpected failures; provider failures return `502`.
- **CORS**: allowed origin comes from `CLIENT_URL`.