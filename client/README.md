# SpencersBM — Client

React frontend for the SpencersBM marketplace — the storefront, authentication screens, and the member dashboard.

## Quick Start

```bash
npm install
cp .env .env  # fill in your values (see Environment Variables)
npm run dev   # starts Vite dev server
```

Dev server runs on **http://localhost:5173** and proxies API calls to the backend.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | yes | Backend API base URL (e.g. `http://localhost:5000/api`) |

> Prefix your variable with `VITE_` so Vite exposes it to the browser, and restart the dev server after changing it.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server (HMR) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |

## Tech Stack

- **React 18** + React DOM
- **Vite 6** + `@vitejs/plugin-react`
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **React Router 6** — client-side routing & protected routes
- **axios** — API client with automatic JWT bearer headers
- **lucide-react** — professional icon set

## Project Structure

```
client/src/
├── App.jsx              # Routes: Home, auth pages, dashboard (Protected wrapper)
├── main.jsx             # Entry point
├── api.js               # Axios instance, token storage, interceptors, error helper
├── index.css            # Tailwind theme, brand colors, global styles
├── context/
│   └── AuthContext.jsx  # Auth state, login/register/logout/changePassword
├── pages/
│   ├── Home.jsx         # Landing: hero, categories, features, numbers, pricing, FAQ, contact
│   ├── Login.jsx        # Sign in
│   ├── Register.jsx     # Create account
│   ├── ForgotPassword.jsx
│   ├── ResetPassword.jsx
│   ├── ChangePassword.jsx
│   └── Dashboard.jsx    # Overview, numbers, accounts, orders, profile tabs
├── components/
│   ├── Navbar.jsx       # Sticky nav with Pricing hover dropdown
│   ├── Footer.jsx
│   ├── AuthLayout.jsx   # Split-screen layout for auth pages
│   ├── FormField.jsx    # Input with icon + password toggle
│   ├── DashboardLayout.jsx   # Sidebar + topbar + content shell
│   ├── WalletCard.jsx   # Balance card + PAGA transfer account
│   ├── FundWalletModal.jsx   # NGN/USD funding UI (gateway pending)
│   └── Modal, ServiceModal, AccountsModal, CheckoutModal, SuccessModal
└── data/
    └── marketplace.js   # Countries, services, social accounts + receipt helpers
```

## Pages / Routes

| Route | Description |
|-------|-------------|
| `/` | Storefront landing page (single-page sections) |
| `/login` | Sign in |
| `/register` | Create an account |
| `/forgot-password` | Request a password reset link |
| `/reset-password?token=…` | Choose a new password from a reset email |
| `/change-password` | Change password (requires login) |
| `/dashboard` | Member dashboard (`?tab=overview\|numbers\|accounts\|orders\|profile`) |

## Notes

- **Auth**: the JWT is stored in `localStorage` (`spencersbm_token`) and attached automatically by an axios interceptor. A `401` clears the token.
- **Checkout**: currently **simulated** on the storefront — no real charge is made until the payment gateway is connected.
- **Wallet**: the dashboard wallet card shows the balance, a copyable PAGA transfer account, and a **Fund Wallet** modal (NGN/USD). The payment-provider integration is coming soon; the modal shows a notice until then.
- The dashboard uses a `wide` layout for Order History/Profile so content fills the screen, while Overview stays constrained.