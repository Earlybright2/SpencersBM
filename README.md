# SpencerSBM

A full-stack marketplace for **virtual phone numbers** and **premium social media accounts**. Buy verification numbers and aged accounts with instant delivery, funded from a wallet (NGN) via Flutterwave.

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 18, Vite 6, Tailwind CSS 4, React Router 6, lucide-react icons, axios |
| Backend  | Node.js, Express 4, JWT auth, bcrypt, resend |
| Data     | PostgreSQL (`pg`) — e.g. Railway Postgres, via `DATABASE_URL` |
| Provider | Bulnix API (SMS verification numbers, social-account marketplace, followers) proxied server-side |
| Payments | Flutterwave (wallet funding) |

## Repository Layout

```
spencersbm/
├── client/   # React + Vite frontend (runs on :5173)
└── server/   # Express API backend (runs on :5000)
```

> Note: the frontend and backend are **separate, self-contained projects**. There is no root-level workspace script — run each one in its own terminal (see below).

## Prerequisites

- Node.js **18+** (built against Node 20)
- npm

## Getting Started

### 1. Install dependencies

```bash
# Backend
cd server
npm install
cd ..

# Frontend
cd client
npm install
```

### 2. Configure environment variables

Each app has its own `.env` file (already git-ignored). Use the templates above each file as reference.

**Server** — `server/.env`:

```env
PORT=5000
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/railway?sslmode=require
CLIENT_URL=http://localhost:5173
JWT_SECRET=<generate-a-long-random-string>

# Email (optional — if empty, reset links print to the server console in dev mode)
RESEND_API_KEY=<your-resend-api-key>
RESEND_FROM=SpencerSBM <no-reply@your-domain.com>

# Payments (Flutterwave) — required for live wallet funding
FLW_CLIENT_ID=<your-flutterwave-client-id>
FLW_CLIENT_SECRET=<your-flutterwave-client-secret>
FLW_ENCRYPTION_KEY=<your-flutterwave-encryption-key>
FLW_SECRET_HASH=<your-webhook-secret-hash>

# Bulnix (sole provider) — one key per service, all start with blx_
BULNIX_BASE_URL=https://bulnix.com/api/v1
BULNIX_MARKETPLACE_KEY=<bulnix-marketplace-key>   # social accounts
BULNIX_SMS_KEY=<bulnix-sms-key>                   # verification numbers
BULNIX_FOLLOWERS_KEY=<bulnix-followers-key>       # followers growth
BULNIX_MARKUP=1.35
```

**Client** — `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run

Open **two terminals**:

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client
npm run dev
```

## Features

- User **registration, login**, and **JWT-based sessions**
- **Password reset** via email (real Resend or dev-mode console link)
- Marketplace for **virtual numbers** by country with live Bulnix pricing (NGN)
- Marketplace for **social media accounts** (Instagram, X, Facebook, TikTok, Gmail)
- **Order history** & live SMS/status checking backed by the Bulnix API
- Styled **dashboard** with overview, orders, and profile panels
- **Wallet card** with NGN funding via Flutterwave
- Gold-on-black modern UI with professional lucide icons

## API Overview

| Area | Base path |
|------|-----------|
| Health check | `GET /api/health` |
| Authentication | `/api/auth` |
| Wallet & funding | `/api/wallet` |
| Orders | `/api/orders` (auth required) |
| Provider (Bulnix) | `/api/bulnix` |

Full endpoint reference is in [`server/README.md`](server/README.md).

## Notes

- User passwords are hashed with bcrypt (cost 10).
- Reset links, Bulnix API keys, and payment secrets never leave the server.
- Wallet funding is handled by **Flutterwave**; Bulnix purchases debit the NGN wallet balance.
- `DATABASE_URL` points at a PostgreSQL instance (e.g. Railway). The `users` table is auto-created on startup.