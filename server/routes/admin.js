import { Router } from 'express';
import { requireAdmin } from '../utils/auth.js';
import { asyncRoute, ogDigitalProducts } from '../utils/onegridhub.js';
import { syncDigitalProducts } from '../utils/digital-sync.js';
import { pool } from '../utils/db.js';
import {
  getUsers,
  getCatalog,
  getSales,
  addNumberProduct,
  updateNumberProduct,
  removeNumberProduct,
  addAccountProduct,
  updateAccountProduct,
  removeAccountProduct,
  findById
} from '../utils/store.js';

const router = Router();

router.use(requireAdmin);

const genId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// GET /api/admin/stats
router.get('/stats', asyncRoute(async (req, res) => {
  const users = await getUsers();
  const sales = await getSales();
  const catalog = await getCatalog();
  const revenue = sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const activeInventory = catalog.products.accounts.reduce(
    (sum, p) => sum + (p.inventory || []).filter((i) => i.status === 'available').length,
    0
  );
  res.json({
    totalUsers: users.users.length,
    totalSales: sales.length,
    revenue,
    numbersSold: sales.filter((s) => s.type === 'virtual_number').length,
    accountsSold: sales.filter((s) => s.type === 'social_account').length,
    numberProducts: catalog.products.numbers.length,
    accountProducts: catalog.products.accounts.length,
    availableAccounts: activeInventory,
    currency: 'NGN'
  });
}));

// GET /api/admin/sales
router.get('/sales', asyncRoute(async (req, res) => {
  const sales = await getSales();
  res.json({ sales });
}));

// GET /api/admin/users
router.get('/users', asyncRoute(async (req, res) => {
  const db = await getUsers();
  const users = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || 'user',
    balance: Number(u.wallet?.balance) || 0,
    orders: (u.orders || []).length,
    createdAt: u.createdAt
  }));
  res.json({ users });
}));

// GET /api/admin/products
router.get('/products', asyncRoute(async (req, res) => {
  const catalog = await getCatalog();
  res.json(catalog);
}));

// POST /api/admin/products/numbers { server, country, countryName, service, serviceName, price }
router.post('/products/numbers', asyncRoute(async (req, res) => {
  const { server, country, countryName, service, serviceName, price } = req.body || {};
  if (!server || !country || !service) {
    return res.status(400).json({ message: 'server, country and service are required' });
  }
  const cost = Number(price);
  if (!Number.isFinite(cost) || cost <= 0) {
    return res.status(400).json({ message: 'A valid positive price is required' });
  }
  const product = {
    id: genId('np'),
    server,
    country,
    countryName: countryName || country,
    service,
    serviceName: serviceName || service,
    price: cost,
    currency: 'NGN',
    enabled: true,
    createdAt: new Date().toISOString()
  };
  await addNumberProduct(product);
  res.status(201).json({ product });
}));

// PUT /api/admin/products/numbers/:id { price?, enabled? }
router.put('/products/numbers/:id', asyncRoute(async (req, res) => {
  const updates = {};
  if (req.body.price !== undefined) {
    const cost = Number(req.body.price);
    if (!Number.isFinite(cost) || cost <= 0) return res.status(400).json({ message: 'Invalid price' });
    updates.price = cost;
  }
  if (req.body.enabled !== undefined) updates.enabled = Boolean(req.body.enabled);
  const product = await updateNumberProduct(req.params.id, updates);
  if (!product) return res.status(404).json({ message: 'Number product not found' });
  res.json({ product });
}));

// DELETE /api/admin/products/numbers/:id
router.delete('/products/numbers/:id', asyncRoute(async (req, res) => {
  await removeNumberProduct(req.params.id);
  res.json({ deleted: true });
}));

// GET /api/admin/digital/products?server=&category=&search=
// Lists digital (social media account) products directly from OneGridHub.
router.get('/digital/products', asyncRoute(async (req, res) => {
  const { server, category, search, limit } = req.query;
  const data = await ogDigitalProducts({ server, category, search, limit: limit || 50 });
  res.json(data);
}));

// POST /api/admin/digital/sync { server, category?, search?, margin? }
// Syncs OneGridHub digital products into account_products with a sell price.
router.post('/digital/sync', asyncRoute(async (req, res) => {
  const { server, category, search, margin } = req.body || {};
  if (!server) return res.status(400).json({ message: 'server is required' });
  const results = await syncDigitalProducts({ server, category, search, margin });
  res.json(results);
}));

// POST /api/admin/products/accounts { platform, price, desc?, server?, country?, countryName?, providerProductId?, stock?, category? }
// Creates (or updates) an account product. When providerProductId is supplied
// the product is linked to a specific OneGridHub digital product so purchases
// are fulfilled directly by the provider.
router.post('/products/accounts', asyncRoute(async (req, res) => {
  const { platform, price, desc, server, country, countryName, providerProductId, stock, category } = req.body || {};
  if (!platform) return res.status(400).json({ message: 'platform is required' });
  const cost = Number(price);
  if (!Number.isFinite(cost) || cost <= 0) return res.status(400).json({ message: 'A valid positive price is required' });

  if (providerProductId) {
    const existing = await pool.query(
      'SELECT id FROM account_products WHERE provider_product_id = $1 AND provider_server = $2',
      [String(providerProductId), server || null]
    );
    if (existing.rows[0]) {
      const product = await updateAccountProduct(existing.rows[0].id, {
        price: cost,
        desc: desc || undefined,
        platform,
        country: country || '',
        countryName: countryName || '',
        providerServer: server || null,
        providerCategory: category || null,
        stock: Number(stock) || 0,
        enabled: true
      });
      return res.json({ product, updated: true });
    }
  }

  const product = {
    id: genId('ap'),
    platform,
    country: country || '',
    countryName: countryName || '',
    price: cost,
    currency: 'NGN',
    desc: desc || '',
    enabled: true,
    inventory: [],
    providerServer: server || null,
    providerProductId: providerProductId || null,
    providerCategory: category || null,
    stock: Number(stock) || 0,
    createdAt: new Date().toISOString()
  };
  await addAccountProduct(product);
  res.status(201).json({ product });
}));

// PUT /api/admin/products/accounts/:id { price?, desc?, enabled? }
router.put('/products/accounts/:id', asyncRoute(async (req, res) => {
  const updates = {};
  if (req.body.price !== undefined) {
    const cost = Number(req.body.price);
    if (!Number.isFinite(cost) || cost <= 0) return res.status(400).json({ message: 'Invalid price' });
    updates.price = cost;
  }
  if (req.body.desc !== undefined) updates.desc = String(req.body.desc);
  if (req.body.enabled !== undefined) updates.enabled = Boolean(req.body.enabled);
  const product = await updateAccountProduct(req.params.id, updates);
  if (!product) return res.status(404).json({ message: 'Account product not found' });
  res.json({ product });
}));

// DELETE /api/admin/products/accounts/:id
router.delete('/products/accounts/:id', asyncRoute(async (req, res) => {
  await removeAccountProduct(req.params.id);
  res.json({ deleted: true });
}));

// POST /api/admin/products/accounts/:id/inventory { username, password }
router.post('/products/accounts/:id/inventory', asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password are required' });
  const catalog = await getCatalog();
  const product = catalog.products.accounts.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: 'Account product not found' });
  const slot = { id: genId('inv'), username, password, status: 'available', createdAt: new Date().toISOString() };
  product.inventory.push(slot);
  await updateAccountProduct(product.id, { inventory: product.inventory });
  res.status(201).json({ slot });
}));

// DELETE /api/admin/products/accounts/:id/inventory/:invId
router.delete('/products/accounts/:id/inventory/:invId', asyncRoute(async (req, res) => {
  const catalog = await getCatalog();
  const product = catalog.products.accounts.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: 'Account product not found' });
  product.inventory = (product.inventory || []).filter((i) => i.id !== req.params.invId);
  await updateAccountProduct(product.id, { inventory: product.inventory });
  res.json({ deleted: true });
}));

// POST /api/admin/orders/sms { userId, orderRef, sms }
// Manually correct/backfill an order's SMS code. OneGridHub's API sometimes
// returns a truncated code (e.g. "447" instead of the full "447684" that shows
// on the OneGridHub dashboard), so admins can paste the complete code here.
router.post('/orders/sms', asyncRoute(async (req, res) => {
  const { userId, orderRef, sms } = req.body || {};
  if (!userId || !orderRef || !sms) {
    return res.status(400).json({ message: 'userId, orderRef and sms are required' });
  }
  const code = String(sms).trim();
  if (!code) return res.status(400).json({ message: 'sms is required' });

  const user = await findById(userId);
  if (!user || !Array.isArray(user.orders)) return res.status(404).json({ message: 'User not found' });
  const idx = user.orders.findIndex((o) => o.order_ref === orderRef || o.ref === orderRef);
  if (idx === -1) return res.status(404).json({ message: 'Order not found' });

  user.orders[idx] = {
    ...user.orders[idx],
    sms: code,
    status: 'received',
    lastCheckedAt: new Date().toISOString()
  };
  await pool.query('UPDATE users SET orders = $1 WHERE id = $2', [JSON.stringify(user.orders), userId]);
  res.json({ order: user.orders[idx] });
}));

export default router;