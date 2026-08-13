import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import onegridhubRoutes from './routes/onegridhub.js';
import walletRoutes from './routes/wallet.js';
import webhookRoutes from './routes/webhook.js';
import { getUsers, ensureSchema } from './utils/store.js';

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
app.use('/api/webhook', webhookRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SpencersBM API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });