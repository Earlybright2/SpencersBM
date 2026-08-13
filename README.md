# SpencersBM

A full-stack marketplace for **virtual phone numbers** and **premium social media accounts**. Buy verification numbers and aged accounts with instant delivery — with wallet-style funding (NGN/USD) coming online via a fintech integration.

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 18, Vite 6, Tailwind CSS 4, React Router 6, lucide-react icons, axios |
| Backend  | Node.js, Express 4, JWT auth, bcrypt, nodemailer |
| Data     | JSON file store (`server/data/users.json`) |
| Provider | OneGridHub API (virtual numbers / SMS verification) proxied server-side |

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
CLIENT_URL=http://localhost:5173
JWT_SECRET=<generate-a-long-random-string>

# Email (optional — if empty, reset links print to the server console in dev mode)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# OneGridHub (virtual numbers / SMS)
ONEGRIDHUB_BASE_URL=https://onegridhub.com/api/v1/index.php
ONEGRIDHUB_API_KEY=<your-onegridhub-api-key>
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
- **Password reset** via email (real SMTP or dev-mode console link)
- Marketplace for **virtual numbers** by country with live provider pricing
- Marketplace for **social media accounts** (Instagram, X, Facebook, TikTok, Gmail)
- **Order history** & live SMS/status checking backed by the OneGridHub API
- Styled **dashboard** with overview, orders, and profile panels
- **Wallet card** with NGN/USD funding UI (payment provider integration pending) and a PAGA transfer account number
- Gold-on-black modern UI with professional lucide icons

## API Overview

| Area | Base path |
|------|-----------|
| Health check | `GET /api/health` |
| Authentication | `/api/auth` |
| Numbers provider | `/api/onegridhub` (auth required) |

Full endpoint reference is in [`server/README.md`](server/README.md).

## Notes

- User passwords are hashed with bcrypt (cost 10).
- Reset links and OneGridHub API keys never leave the server.
- The checkout on the home page is currently **simulated** — payment gateway integration is in progress.
- `server/data/users.json` is the local database and is git-ignored.