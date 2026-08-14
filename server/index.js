import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import onegridhubRoutes from './routes/onegridhub.js';
import walletRoutes from './routes/wallet.js';
import webhookRoutes from './routes/webhook.js';
import ordersRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import { getUsers, ensureAdmin } from './utils/store.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);

// GET / — welcome + available APIs
app.get('/', (req, res) => {
  res.json({
    name: 'SpencersBM Backend API',
    message: 'Welcome to SpencersBM Backend API',
    version: '1.0.0',
    baseUrl: req.protocol + '://' + req.get('host'),
    endpoints: {
      health: { method: 'GET', path: '/api/health', auth: 'none' },
      auth: {
        register: { method: 'POST', path: '/api/auth/register', auth: 'none', body: { name: 'string', email: 'string', password: 'string' } },
        login: { method: 'POST', path: '/api/auth/login', auth: 'none', body: { email: 'string', password: 'string' } },
        me: { method: 'GET', path: '/api/auth/me', auth: 'user' },
        changePassword: { method: 'POST', path: '/api/auth/change-password', auth: 'user', body: { currentPassword: 'string', newPassword: 'string' } },
        forgotPassword: { method: 'POST', path: '/api/auth/forgot-password', auth: 'none' },
        resetPassword: { method: 'POST', path: '/api/auth/reset-password', auth: 'none' }
      },
      wallet: {
        wallet: { method: 'GET', path: '/api/wallet', auth: 'user' },
        fund: { method: 'POST', path: '/api/wallet/fund', auth: 'user', body: { currency: 'NGN|USD', amount: 'number', method: 'opay|card', phone: 'string?', card: 'object?' } },
        bankAccount: { method: 'POST', path: '/api/wallet/virtual-account', auth: 'user' },
        authorize: { method: 'POST', path: '/api/wallet/authorize', auth: 'user' },
        fundStatus: { method: 'GET', path: '/api/wallet/fund-status?reference=', auth: 'user' },
        chargeStatus: { method: 'GET', path: '/api/wallet/charge-status?charge_id=', auth: 'user' }
      },
      orders: {
        catalog: { method: 'GET', path: '/api/orders/catalog', auth: 'user' },
        buyNumber: { method: 'POST', path: '/api/orders/numbers', auth: 'user', body: { productId: 'string' } },
        buyAccount: { method: 'POST', path: '/api/orders/accounts', auth: 'user', body: { productId: 'string' } },
        orders: { method: 'GET', path: '/api/orders', auth: 'user' },
        payments: { method: 'GET', path: '/api/orders/payments', auth: 'user' },
        paidAccounts: { method: 'GET', path: '/api/orders/paid-accounts', auth: 'user' },
        smsStatus: { method: 'GET', path: '/api/orders/status?order_ref=', auth: 'user' },
        cancel: { method: 'POST', path: '/api/orders/cancel', auth: 'user' }
      },
      admin: {
        stats: { method: 'GET', path: '/api/admin/stats', auth: 'admin' },
        sales: { method: 'GET', path: '/api/admin/sales', auth: 'admin' },
        users: { method: 'GET', path: '/api/admin/users', auth: 'admin' },
        products: { method: 'GET', path: '/api/admin/products', auth: 'admin' },
        addNumber: { method: 'POST', path: '/api/admin/products/numbers', auth: 'admin' },
        updateNumber: { method: 'PUT', path: '/api/admin/products/numbers/:id', auth: 'admin' },
        deleteNumber: { method: 'DELETE', path: '/api/admin/products/numbers/:id', auth: 'admin' },
        addAccount: { method: 'POST', path: '/api/admin/products/accounts', auth: 'admin' },
        updateAccount: { method: 'PUT', path: '/api/admin/products/accounts/:id', auth: 'admin' },
        deleteAccount: { method: 'DELETE', path: '/api/admin/products/accounts/:id', auth: 'admin' },
        addInventory: { method: 'POST', path: '/api/admin/products/accounts/:id/inventory', auth: 'admin' },
        removeInventory: { method: 'DELETE', path: '/api/admin/products/accounts/:id/inventory/:invId', auth: 'admin' },
        providerServers: { method: 'GET', path: '/api/onegridhub/servers', auth: 'admin' },
        providerServices: { method: 'GET', path: '/api/onegridhub/services?server=', auth: 'admin' },
        providerCountries: { method: 'GET', path: '/api/onegridhub/countries?server=', auth: 'admin' },
        providerPrice: { method: 'GET', path: '/api/onegridhub/price?server=&country=&service=', auth: 'admin' },
        providerBalance: { method: 'GET', path: '/api/onegridhub/balance', auth: 'admin' }
      },
      webhook: {
        flutterwave: { method: 'POST', path: '/api/webhook/flutterwave', auth: 'signature' }
      }
    }
  });
});

app.get('/api/health', async (req, res) => {
  const checks = {};

  try {
    await getUsers();
    checks.dataStore = 'ok';
  } catch {
    checks.dataStore = 'error';
  }

  const healthy = Object.values(checks).every((s) => s === 'ok');

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'spencersbm-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/onegridhub', onegridhubRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhook', webhookRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

ensureAdmin()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SpencersBM API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });