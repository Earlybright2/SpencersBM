import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import { ogRequest, isOgSuccess, ogError, asyncRoute } from '../utils/onegridhub.js';
import { generateReference } from '../utils/flutterwave.js';
import {
  findById,
  getUserOrders,
  addUserOrder,
  updateUserOrder,
  getUserWallet,
  debitWallet,
  getCatalog,
  updateAccountProduct,
  recordSale
} from '../utils/store.js';
import { sendPurchaseSuccessEmail, sendPurchaseFailureEmail } from '../utils/mailer.js';

const router = Router();

router.use(requireAuth);

// Fire-and-forget purchase emails so a slow SMTP never blocks the API response.
const notify = {
  success: (userId, order) => {
    findById(userId)
      .then((user) => user && sendPurchaseSuccessEmail(user, order))
      .catch((err) => console.error('Success email failed:', err.message));
  },
  failure: (userId, order, reason) => {
    findById(userId)
      .then((user) => user && sendPurchaseFailureEmail(user, order, reason))
      .catch((err) => console.error('Failure email failed:', err.message));
  }
};

// Turn raw provider errors into messages a customer can actually understand.
function friendlyProviderError(data) {
  const code = String(data?.code || '');
  const msg = String(data?.message || '').toLowerCase();
  if (code === 'unavailable' || msg.includes('service not found')) {
    return 'This virtual number is temporarily unavailable from our provider. Please try again later or choose another option.';
  }
  if (code === 'insufficient_funds' || msg.includes('insufficient balance') || msg.includes('insufficient_funds')) {
    return 'Our number provider is temporarily low on funds. Please try again shortly or contact support.';
  }
  return data?.message || 'The numbers provider could not complete the purchase. Please try again in a moment.';
}

// GET /api/orders — current user's purchase history (numbers + accounts)
router.get('/', asyncRoute(async (req, res) => {
  const orders = await getUserOrders(req.user.id);
  res.json({ orders });
}));

// GET /api/orders/payments — every money movement for this user (funding + purchases)
router.get('/payments', asyncRoute(async (req, res) => {
  const wallet = await getUserWallet(req.user.id);
  res.json({ transactions: wallet?.transactions || [] });
}));

// GET /api/orders/paid-accounts — purchased social media accounts with credentials
router.get('/paid-accounts', asyncRoute(async (req, res) => {
  const orders = await getUserOrders(req.user.id);
  const accounts = orders.filter((o) => o.type === 'social_account');
  res.json({ accounts });
}));

// GET /api/orders/catalog — the products the user can buy
router.get('/catalog', asyncRoute(async (req, res) => {
  const catalog = await getCatalog();
  const numbers = catalog.products.numbers
    .filter((p) => p.enabled !== false)
    .map(({ id, server, country, countryName, service, serviceName, price, currency }) => ({
      id, server, country, countryName, service, serviceName, price, currency: currency || 'NGN'
    }));
  const accounts = catalog.products.accounts
    .filter((p) => p.enabled !== false)
    .map(({ id, platform, price, currency, desc, inventory }) => ({
      id, platform, price, currency: currency || 'NGN', desc, available: (inventory || []).filter((i) => i.status === 'available').length
    }));
  res.json({ numbers, accounts });
}));

// POST /api/orders/numbers { productId } — buy a virtual number, paid from wallet
router.post('/numbers', asyncRoute(async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const catalog = await getCatalog();
  const product = catalog.products.numbers.find((p) => p.id === productId);
  if (!product || product.enabled === false) {
    notify.failure(req.user.id, { type: 'virtual_number', service: 'virtual number' }, 'The product you tried to buy could not be found. Please refresh the store and try again.');
    return res.status(404).json({ message: 'Number product not found' });
  }

  const cost = Number(product.price) || 0;
  const wallet = await getUserWallet(req.user.id);
  if ((wallet?.balance || 0) < cost) {
    notify.failure(req.user.id, { type: 'virtual_number', service: product.serviceName || product.service, country: product.countryName || product.country, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Place the order with the provider first (holds the number), then debit the wallet.
  const providerData = await ogRequest({
    endpoint: 'buy',
    server: product.server,
    country: product.country,
    service: product.service
  });
  if (!isOgSuccess(providerData)) {
    const reason = friendlyProviderError(providerData);
    notify.failure(req.user.id, { type: 'virtual_number', service: product.serviceName || product.service, country: product.countryName || product.country, price: cost }, reason);
    return res.status(502).json({ status: 'error', message: reason });
  }

  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: cost,
    reference: purchaseRef,
    meta: { type: 'number', productId, serviceName: product.serviceName }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'virtual_number', service: product.serviceName || product.service, country: product.countryName || product.country, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'virtual_number',
    order_ref: providerData.order_ref || providerData.order_id || providerData.ref || providerData.order || purchaseRef,
    number: providerData.number || providerData.phone || providerData.phone_number || providerData.numberid || '',
    server: product.server,
    country_id: product.country,
    country: product.countryName || product.country,
    service_id: product.service,
    service: product.serviceName || product.service,
    price: cost,
    currency: 'NGN',
    status: 'pending',
    purchasedAt: new Date().toISOString(),
    raw: providerData
  };
  await addUserOrder(req.user.id, order);

  const user = await findById(req.user.id);
  await recordSale({
    id: order.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: 'virtual_number',
    productId: product.id,
    productName: `${product.serviceName || product.service} · ${product.countryName || product.country}`,
    price: cost,
    currency: 'NGN',
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  notify.success(req.user.id, order);

  res.status(201).json({ status: 'success', message: 'Number purchased', order, balance: debit.balance });
}));

// POST /api/orders/accounts { productId } — buy a social media account from inventory
router.post('/accounts', asyncRoute(async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const catalog = await getCatalog();
  const product = catalog.products.accounts.find((p) => p.id === productId);
  if (!product || product.enabled === false) {
    notify.failure(req.user.id, { type: 'social_account', platform: 'account' }, 'The product you tried to buy could not be found. Please refresh the store and try again.');
    return res.status(404).json({ message: 'Account product not found' });
  }

  const slot = (product.inventory || []).find((i) => i.status === 'available');
  if (!slot) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform }, `${product.platform} is currently sold out. Please check back soon.`);
    return res.status(409).json({ message: 'This platform is currently sold out. Please check back soon.' });
  }

  const cost = Number(product.price) || 0;
  const wallet = await getUserWallet(req.user.id);
  if ((wallet?.balance || 0) < cost) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: cost,
    reference: purchaseRef,
    meta: { type: 'account', productId, platform: product.platform }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'social_account',
    order_ref: purchaseRef,
    platform: product.platform,
    username: slot.username,
    password: slot.password,
    desc: product.desc || null,
    price: cost,
    currency: 'NGN',
    status: 'completed',
    purchasedAt: new Date().toISOString()
  };
  await addUserOrder(req.user.id, order);

  slot.status = 'sold';
  slot.soldAt = new Date().toISOString();
  slot.buyerId = req.user.id;
  await updateAccountProduct(product.id, { inventory: product.inventory });

  const user = await findById(req.user.id);
  await recordSale({
    id: order.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: 'social_account',
    productId: product.id,
    productName: product.platform,
    price: cost,
    currency: 'NGN',
    status: 'completed',
    createdAt: new Date().toISOString()
  });

  notify.success(req.user.id, order);

  res.status(201).json({ status: 'success', message: 'Account purchased', order, balance: debit.balance });
}));

// GET /api/orders/status?order_ref= — poll SMS for a purchased number
router.get('/status', asyncRoute(async (req, res) => {
  const { order_ref } = req.query;
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });
  const data = await ogRequest({ endpoint: 'status', order_ref });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  const smsCode = data.sms || data.code || data.otp || data.sms_code || data.message || null;
  if (smsCode) {
    await updateUserOrder(req.user.id, order_ref, {
      status: 'received',
      sms: String(smsCode),
      lastCheckedAt: new Date().toISOString()
    });
  }
  res.json(data);
}));

// POST /api/orders/cancel { order_ref }
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

export default router;