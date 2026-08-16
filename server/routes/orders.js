import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import { ogRequest, ogDigitalBuy, ogDigitalOrder, isOgSuccess, ogError, asyncRoute } from '../utils/onegridhub.js';
import { generateReference } from '../utils/flutterwave.js';
import {
  findById,
  getUserOrders,
  addUserOrder,
  updateUserOrder,
  getUserWallet,
  debitWallet,
  creditWallet,
  getCatalog,
  updateAccountProduct,
  recordSale
} from '../utils/store.js';
import { sendPurchaseSuccessEmail, sendPurchaseFailureEmail, sendRefundEmail } from '../utils/mailer.js';

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
  },
  refund: (userId, order, balance) => {
    findById(userId)
      .then((user) => user && sendRefundEmail(user, order, balance))
      .catch((err) => console.error('Refund email failed:', err.message));
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
    .map(({ id, platform, country, countryName, price, currency, desc }) => ({
      id, platform, country: country || '', countryName: countryName || '', price, currency: currency || 'NGN', desc
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
    expiresAt: new Date(Date.now() + NUMBER_EXPIRY_MS).toISOString(),
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

// POST /api/orders/accounts { productId } — buy a social media account from the provider
router.post('/accounts', asyncRoute(async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const catalog = await getCatalog();
  const product = catalog.products.accounts.find((p) => p.id === productId);
  if (!product || product.enabled === false) {
    notify.failure(req.user.id, { type: 'social_account', platform: 'account' }, 'The product you tried to buy could not be found. Please refresh the store and try again.');
    return res.status(404).json({ message: 'Account product not found' });
  }

  // Provider-backed products are bought through OneGridHub. If a product has no
  // provider link (legacy manual inventory), fall back to the old inventory flow.
  if (product.providerServer && product.providerProductId) {
    return buyProviderAccount(req, res, catalog, product);
  }

  return buyInventoryAccount(req, res, catalog, product);
}));

// Provider-backed purchase: digital_buy then digital_order to retrieve credentials.
async function buyProviderAccount(req, res, catalog, product) {
  const cost = Number(product.price) || 0;
  const wallet = await getUserWallet(req.user.id);
  if ((wallet?.balance || 0) < cost) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Place the order with the provider first, then debit the wallet.
  const buyRes = await ogDigitalBuy({
    server: product.providerServer,
    product: product.providerProductId,
    quantity: 1
  });
  if (!isOgSuccess(buyRes)) {
    const reason = buyRes.message || 'The account provider could not complete your purchase. Please try again shortly.';
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, reason);
    return res.status(502).json({ status: 'error', message: reason });
  }

  const providerOrderId = normalizeProviderOrderId(
    buyRes.order || buyRes.order_id || buyRes.orderid || buyRes.orderId || buyRes.id || ''
  );

  // Retrieve the delivered account details from the provider. If the order query
  // fails but the buy succeeded, proceed with a pending order rather than erroring.
  let detail = buyRes;
  if (providerOrderId) {
    try {
      const res = await ogDigitalOrder(providerOrderId);
      if (isOgSuccess(res)) detail = res;
    } catch {
      // ignore — order will be marked pending and can be polled later
    }
  }
  const account = extractAccountCredentials(detail, buyRes);

  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: cost,
    reference: purchaseRef,
    meta: { type: 'account', productId: product.id, platform: product.platform, providerOrderId }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'social_account',
    order_ref: purchaseRef,
    provider_order: providerOrderId,
    platform: product.platform,
    username: account.username,
    password: account.password,
    email: account.email || null,
    account_raw: account.account_raw || null,
    desc: product.desc || null,
    price: cost,
    currency: 'NGN',
    status: account.ready ? 'completed' : 'pending',
    expiresAt: account.ready ? null : new Date(Date.now() + ACCOUNT_DELIVERY_MS).toISOString(),
    purchasedAt: new Date().toISOString()
  };
  await addUserOrder(req.user.id, order);

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
    status: order.status,
    createdAt: new Date().toISOString()
  });

  notify.success(req.user.id, order);

  res.status(201).json({ status: 'success', message: 'Account purchased', order, balance: debit.balance });
}

// Legacy purchase from manually-entered inventory.
async function buyInventoryAccount(req, res, catalog, product) {
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
    meta: { type: 'account', productId: product.id, platform: product.platform }
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
}

// OneGridHub displays digital order references as "DG-23843", but the
// digital_order endpoint only accepts the bare numeric id ("23843").
function normalizeProviderOrderId(raw) {
  const s = String(raw || '').trim();
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/(\d+)/);
  return m ? m[1] : s;
}

// Best-effort extraction of delivered account credentials from the provider's
// digital_order / digital_buy response, tolerating unknown response shapes.
function extractAccountCredentials(detail, buyRes = {}) {
  const candidates = [detail, buyRes].filter(Boolean);

  const LOGIN_KEYS = ['username', 'user', 'login', 'email', 'account_username', 'data_username', 'id', 'mail'];
  const PASS_KEYS = ['password', 'pass', 'pwd', 'account_password', 'data_password', 'secret', 'code'];

  const deepFind = (obj, keys, seen = new Set()) => {
    if (obj == null) return '';
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return '';
    }
    if (seen.has(obj)) return '';
    seen.add(obj);
    // Array of {name/key, value} pairs — a common provider shape.
    if (Array.isArray(obj)) {
      const pairs = {};
      for (const item of obj) {
        if (item && typeof item === 'object') {
          const k = item.name || item.key || item.label || item.field || item.type || '';
          const v = item.value ?? item.data ?? item.result ?? '';
          if (k && v !== undefined && v !== null) pairs[String(k).toLowerCase()] = v;
        }
      }
      for (const key of keys) {
        if (pairs[key] !== undefined) return String(pairs[key]);
      }
      for (const item of obj) {
        const r = deepFind(item, keys, seen);
        if (r) return r;
      }
      return '';
    }
    // Plain object: try direct keys, then recurse into nested values.
    for (const key of keys) {
      const v = obj[key];
      if (v !== undefined && v !== null && (typeof v === 'string' || typeof v === 'number') && String(v) !== '') {
        return String(v);
      }
    }
    for (const v of Object.values(obj)) {
      const r = deepFind(v, keys, seen);
      if (r) return r;
    }
    return '';
  };

  let username = '';
  let password = '';
  let email = '';
  let accountRaw = '';

  const isScalar = (v) => typeof v === 'string' || typeof v === 'number';

  // First pass: look at top-level keys of each candidate response.
  for (const d of candidates) {
    for (const k of LOGIN_KEYS) {
      if (d[k] !== undefined && isScalar(d[k]) && String(d[k]) !== '') { username = String(d[k]); break; }
    }
    if (username) break;
  }
  for (const d of candidates) {
    for (const k of PASS_KEYS) {
      if (d[k] !== undefined && isScalar(d[k]) && String(d[k]) !== '') { password = String(d[k]); break; }
    }
    if (password) break;
  }

  // OneGridHub delivers accounts as a multi-line `accounts` string whose last
  // line is a JSON blob: {"account":"user|pass|email|emailpass|recovery|..."}.
  if (!username || !password) {
    for (const d of candidates) {
      const accountsBlob = d?.accounts;
      if (typeof accountsBlob === 'string' && accountsBlob.trim()) {
        const lines = accountsBlob.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const raw = parsed?.account || parsed?.credentials || parsed?.data || parsed?.details || parsed?.accounts;
            if (typeof raw === 'string' && raw.includes('|')) {
              accountRaw = raw;
              const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
              // Standard pipe layout: login|password|email|emailpass|recovery|...
              if (parts.length >= 2) {
                username = parts[0];
                password = parts[1];
                // The email is usually the next pipe field (or the first @ field).
                const mail = parts.slice(2).find((p) => /@/.test(p) && !/^M\./.test(p) && p.length < 60);
                email = mail || '';
              } else if (parts.length === 1) {
                username = parts[0];
              }
              if (username && password) break;
            }
          } catch {
            // line isn't JSON — keep scanning
          }
        }
        if (username && password) break;
      }
    }
  }

  // Second pass: deep-search for credentials nested in objects / arrays.
  if (!username || !password) {
    for (const d of candidates) {
      if (!username) username = deepFind(d, LOGIN_KEYS);
      if (!password) password = deepFind(d, PASS_KEYS);
      if (username && password) break;
    }
  }

  // Some providers hand back a single string blob: "user:pass" or "user|pass".
  if (!username || !password) {
    for (const d of candidates) {
      const blob = d?.account ?? d?.details ?? d?.credentials ?? d?.data ?? d?.info;
      if (typeof blob === 'string' && (blob.includes(':') || blob.includes('|') || blob.includes('\n'))) {
        const parts = blob.split(/[:|\n]/).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          if (!username) username = parts[0];
          if (!password) password = parts[1];
        }
        break;
      }
    }
  }

  const completed =
    String(detail?.status || '').toLowerCase() === 'completed' ||
    String(detail?.state || '').toLowerCase() === 'completed' ||
    String(detail?.status || '').toLowerCase() === 'success' ||
    String(detail?.status || '').toLowerCase() === 'delivered' ||
    String(detail?.status || '').toLowerCase() === 'fulfilled';

  // Only mark ready when we actually have credentials (or a status that clearly
  // confirms delivery alongside at least one credential). Blank creds should
  // stay pending so the account-status poll can retrieve them.
  const ready = Boolean(username && password) || (completed && Boolean(username || password));

  if (!ready && (detail || buyRes)) {
    console.warn('[digital-account] credentials not ready. raw:', JSON.stringify(detail || buyRes).slice(0, 800));
  }

  return { username, password, email, ready, account_raw: accountRaw || (username && password ? `${username}|${password}` : '') };
}

// How long a number stays active waiting for its SMS (mirrors the provider's window).
const NUMBER_EXPIRY_MS = (Number(process.env.NUMBER_EXPIRY_MINUTES) || 20) * 60 * 1000;

// Expected window for a provider to prepare and deliver a social media account
// (credentials arrive by email and in Paid Accounts). Configurable via env.
const ACCOUNT_DELIVERY_MS = (Number(process.env.ACCOUNT_DELIVERY_MINUTES) || 10) * 60 * 1000;

// GET /api/orders/status?order_ref= — poll SMS for a purchased number
router.get('/status', asyncRoute(async (req, res) => {
  const { order_ref } = req.query;
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });
  const data = await ogRequest({ endpoint: 'status', order_ref });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  const smsCode = data.sms || data.code || data.otp || data.sms_code || null;
  if (smsCode) {
    await updateUserOrder(req.user.id, order_ref, {
      status: 'received',
      sms: String(smsCode),
      lastCheckedAt: new Date().toISOString()
    });
  } else if (data.state && !['pending', 'active', 'waiting', 'rented'].includes(String(data.state).toLowerCase())) {
    // The provider has closed the number without delivering a code.
    await updateUserOrder(req.user.id, order_ref, {
      status: 'expired',
      lastCheckedAt: new Date().toISOString()
    });
  }
  res.json(data);
}));

// POST /api/orders/cancel { order_ref }
router.post('/cancel', asyncRoute(async (req, res) => {
  const { order_ref } = req.body || {};
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });

  const orders = await getUserOrders(req.user.id);
  const order = orders.find((o) => o.order_ref === order_ref || o.ref === order_ref);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status === 'cancelled') return res.status(409).json({ message: 'Order is already cancelled' });

  // Social accounts: only refundable while still processing (no credentials
  // delivered yet). Once the account is completed it belongs to the buyer.
  if (order.type === 'social_account') {
    const delivered = Boolean(order.username && order.password);
    if (delivered || order.status === 'completed') {
      return res.status(409).json({ message: 'This account has already been delivered and cannot be refunded.' });
    }
    const refund = await creditWallet(req.user.id, {
      amount: Number(order.price) || 0,
      reference: `refund-${order_ref}`,
      meta: { type: 'refund', orderRef: order_ref, service: order.platform }
    });
    await updateUserOrder(req.user.id, order_ref, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      refundedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString()
    });
    notify.refund(req.user.id, { ...order, status: 'cancelled' }, refund?.balance);
    return res.json({ status: 'success', refunded: true, balance: refund?.balance });
  }

  if (order.status === 'received') {
    return res.status(409).json({ message: 'This order already received its SMS code and cannot be refunded.' });
  }

  const data = await ogRequest({ endpoint: 'cancel', order_ref });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));

  const refund = await creditWallet(req.user.id, {
    amount: Number(order.price) || 0,
    reference: `refund-${order_ref}`,
    meta: { type: 'refund', orderRef: order_ref, service: order.service || order.platform }
  });

  await updateUserOrder(req.user.id, order_ref, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    refundedAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString()
  });

  notify.refund(req.user.id, { ...order, status: 'cancelled' }, refund?.balance);

  res.json({ ...data, refunded: true, balance: refund?.balance });
}));

// GET /api/orders/account-status?order_ref= — poll the provider for a pending
// digital (social media account) purchase and store the delivered credentials.
router.get('/account-status', asyncRoute(async (req, res) => {
  const { order_ref } = req.query;
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });

  const orders = await getUserOrders(req.user.id);
  const order = orders.find((o) => o.order_ref === order_ref || o.ref === order_ref);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.type !== 'social_account') {
    return res.status(400).json({ message: 'Not a social account order' });
  }

  const providerOrderId = normalizeProviderOrderId(order.provider_order);
  if (!providerOrderId) {
    return res.json({ status: order.status, order });
  }

  const detail = await ogDigitalOrder(providerOrderId);
  if (!isOgSuccess(detail)) {
    return res.status(502).json(ogError(detail));
  }

  const account = extractAccountCredentials(detail, {});
  const isDone = Boolean(account.username && account.password);

  if (isDone) {
    await updateUserOrder(req.user.id, order_ref, {
      status: 'completed',
      username: account.username,
      password: account.password,
      email: account.email || order.email || null,
      account_raw: account.account_raw || order.account_raw || null,
      expiresAt: null,
      lastCheckedAt: new Date().toISOString()
    });
    return res.json({ status: 'completed', order: { ...order, username: account.username, password: account.password, email: account.email, account_raw: account.account_raw, status: 'completed', expiresAt: null } });
  }

  await updateUserOrder(req.user.id, order_ref, {
    status: 'pending',
    lastCheckedAt: new Date().toISOString()
  });
  res.json({ status: 'pending', order });
}));

export default router;