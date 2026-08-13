import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import { ogRequest, isOgSuccess, ogError, asyncRoute } from '../utils/onegridhub.js';
import { addUserOrder, getUserOrders, updateUserOrder } from '../utils/store.js';

const router = Router();

// All reads/proxies require a logged-in user so the provider API key
// never reaches the browser.
router.use(requireAuth);

// GET /api/onegridhub/servers
router.get('/servers', asyncRoute(async (req, res) => {
  const data = await ogRequest({ endpoint: 'servers' });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/services?server=
router.get('/services', asyncRoute(async (req, res) => {
  const { server } = req.query;
  if (!server) return res.status(400).json({ message: 'server is required' });
  const data = await ogRequest({ endpoint: 'services', server });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/countries?server=
router.get('/countries', asyncRoute(async (req, res) => {
  const { server } = req.query;
  if (!server) return res.status(400).json({ message: 'server is required' });
  const data = await ogRequest({ endpoint: 'countries', server });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/price?server=&country=&service=
router.get('/price', asyncRoute(async (req, res) => {
  const { server, country, service } = req.query;
  if (!server || !country || !service) {
    return res.status(400).json({ message: 'server, country and service are required' });
  }
  const data = await ogRequest({ endpoint: 'price', server, country, service });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/balance
router.get('/balance', asyncRoute(async (req, res) => {
  const data = await ogRequest({ endpoint: 'balance' });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// POST /api/onegridhub/buy  { server, country, service }
router.post('/buy', asyncRoute(async (req, res) => {
  const { server, country, service, serviceName, countryName } = req.body || {};
  if (!server || !country || !service) {
    return res.status(400).json({ message: 'server, country and service are required' });
  }
  const data = await ogRequest({ endpoint: 'buy', server, country, service });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data, 'Provider could not complete the purchase'));

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'virtual_number',
    order_ref: data.order_ref || data.order_id || data.ref || data.order || null,
    number: data.number || data.phone || data.phone_number || data.numberid || '',
    server,
    country: countryName || country,
    country_id: country,
    service: serviceName || service,
    price: data.price,
    currency: data.currency,
    status: 'pending',
    purchasedAt: new Date().toISOString(),
    raw: data
  };

  await addUserOrder(req.user.id, order);

  res.status(201).json({ status: 'success', message: 'Number purchased', order });
}));

// GET /api/onegridhub/status?order_ref=
router.get('/status', asyncRoute(async (req, res) => {
  const { order_ref } = req.query;
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });
  const data = await ogRequest({ endpoint: 'status', order_ref });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  if (data.sms || data.code || data.message) {
    await updateUserOrder(req.user.id, order_ref, {
      status: 'received',
      sms: data.sms || data.code || null,
      lastCheckedAt: new Date().toISOString()
    });
  }
  res.json(data);
}));

// POST /api/onegridhub/cancel { order_ref }
router.post('/cancel', asyncRoute(async (req, res) => {
  const { order_ref } = req.body || {};
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });
  const data = await ogRequest({ endpoint: 'cancel', order_ref });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  await updateUserOrder(req.user.id, order_ref, {
    status: 'cancelled',
    lastCheckedAt: new Date().toISOString()
  });
  res.json(data);
}));

// GET /api/onegridhub/orders — current user's purchase history
router.get('/orders', asyncRoute(async (req, res) => {
  const orders = await getUserOrders(req.user.id);
  res.json({ orders });
}));

export default router;