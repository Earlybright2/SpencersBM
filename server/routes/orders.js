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

// Cap how many of the same product a user can buy in one go.
const MAX_QUANTITY = 10;

// Parse the +/- stepper quantity from a request body. Returns null when invalid.
function parseQuantity(q) {
  if (q === undefined || q === null || q === '') return 1;
  const n = Number(q);
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUANTITY) return null;
  return n;
}

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

// POST /api/orders/numbers { productId, quantity } — buy virtual numbers, paid from wallet
router.post('/numbers', asyncRoute(async (req, res) => {
  const { productId, quantity } = req.body || {};
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const qty = parseQuantity(quantity);
  if (qty === null) return res.status(400).json({ message: 'quantity must be a whole number between 1 and 10' });

  const catalog = await getCatalog();
  const product = catalog.products.numbers.find((p) => p.id === productId);
  if (!product || product.enabled === false) {
    notify.failure(req.user.id, { type: 'virtual_number', service: 'virtual number' }, 'The product you tried to buy could not be found. Please refresh the store and try again.');
    return res.status(404).json({ message: 'Number product not found' });
  }

  const unitCost = Number(product.price) || 0;
  const cost = unitCost * qty;
  const wallet = await getUserWallet(req.user.id);
  if ((wallet?.balance || 0) < cost) {
    notify.failure(req.user.id, { type: 'virtual_number', service: product.serviceName || product.service, country: product.countryName || product.country, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Place each order with the provider first (holds the number), then debit the wallet once.
  const providerResults = [];
  for (let i = 0; i < qty; i += 1) {
    const providerData = await ogRequest({
      endpoint: 'buy',
      server: product.server,
      country: product.country,
      service: product.service
    });
    if (!isOgSuccess(providerData)) {
      // Best-effort release any numbers already held so they aren't wasted.
      for (const held of providerResults) {
        const heldRef = held.order_ref || held.order_id || held.ref || held.order;
        if (heldRef) await ogRequest({ endpoint: 'cancel', order_ref: heldRef }).catch(() => {});
      }
      const reason = friendlyProviderError(providerData);
      notify.failure(req.user.id, { type: 'virtual_number', service: product.serviceName || product.service, country: product.countryName || product.country, price: cost }, reason);
      return res.status(502).json({ status: 'error', message: reason });
    }
    providerResults.push(providerData);
  }

  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: cost,
    reference: purchaseRef,
    meta: { type: 'number', productId, quantity: qty, serviceName: product.serviceName }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'virtual_number', service: product.serviceName || product.service, country: product.countryName || product.country, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const orders = providerResults.map((providerData) => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'virtual_number',
    order_ref: providerData.order_ref || providerData.order_id || providerData.ref || providerData.order || purchaseRef,
    number: providerData.number || providerData.phone || providerData.phone_number || providerData.numberid || '',
    server: product.server,
    country_id: product.country,
    country: product.countryName || product.country,
    service_id: product.service,
    service: product.serviceName || product.service,
    price: unitCost,
    currency: 'NGN',
    status: 'pending',
    purchasedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + NUMBER_EXPIRY_MS).toISOString(),
    raw: providerData
  }));

  const user = await findById(req.user.id);
  for (const order of orders) {
    await addUserOrder(req.user.id, order);
    await recordSale({
      id: order.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      type: 'virtual_number',
      productId: product.id,
      productName: `${product.serviceName || product.service} · ${product.countryName || product.country}`,
      price: order.price,
      currency: 'NGN',
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  notify.success(req.user.id, orders);

  res.status(201).json({
    status: 'success',
    message: qty > 1 ? `${qty} numbers purchased` : 'Number purchased',
    orders,
    quantity: qty,
    balance: debit.balance
  });
}));

// POST /api/orders/accounts { productId, quantity } — buy social media accounts
router.post('/accounts', asyncRoute(async (req, res) => {
  const { productId, quantity } = req.body || {};
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const qty = parseQuantity(quantity);
  if (qty === null) return res.status(400).json({ message: 'quantity must be a whole number between 1 and 10' });

  const catalog = await getCatalog();
  const product = catalog.products.accounts.find((p) => p.id === productId);
  if (!product || product.enabled === false) {
    notify.failure(req.user.id, { type: 'social_account', platform: 'account' }, 'The product you tried to buy could not be found. Please refresh the store and try again.');
    return res.status(404).json({ message: 'Account product not found' });
  }

  // Provider-backed products are bought through OneGridHub. If a product has no
  // provider link (legacy manual inventory), fall back to the old inventory flow.
  if (product.providerServer && product.providerProductId) {
    return buyProviderAccount(req, res, catalog, product, qty);
  }

  return buyInventoryAccount(req, res, catalog, product, qty);
}));

// Provider-backed purchase: digital_buy then digital_order to retrieve credentials.
async function buyProviderAccount(req, res, catalog, product, qty = 1) {
  const unitCost = Number(product.price) || 0;
  const cost = unitCost * qty;
  const wallet = await getUserWallet(req.user.id);
  if ((wallet?.balance || 0) < cost) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Place each order with the provider first, then debit the wallet once.
  const buyResults = [];
  for (let i = 0; i < qty; i += 1) {
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
    buyResults.push(buyRes);
  }

  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: cost,
    reference: purchaseRef,
    meta: { type: 'account', productId: product.id, platform: product.platform, quantity: qty }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const orders = [];
  for (const buyRes of buyResults) {
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

    const order = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'social_account',
      order_ref: generateReference(),
      provider_order: providerOrderId,
      platform: product.platform,
      username: account.username,
      password: account.password,
      email: account.email || null,
      email_password: account.emailPassword || null,
      recovery: account.recovery || null,
      extra: account.extra || [],
      account_raw: account.account_raw || null,
      desc: product.desc || null,
      price: unitCost,
      currency: 'NGN',
      status: account.ready ? 'completed' : 'pending',
      expiresAt: account.ready ? null : new Date(Date.now() + ACCOUNT_DELIVERY_MS).toISOString(),
      purchasedAt: new Date().toISOString()
    };
    orders.push(order);
  }

  const user = await findById(req.user.id);
  for (const order of orders) {
    await addUserOrder(req.user.id, order);
    await recordSale({
      id: order.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      type: 'social_account',
      productId: product.id,
      productName: product.platform,
      price: order.price,
      currency: 'NGN',
      status: order.status,
      createdAt: new Date().toISOString()
    });
  }

  notify.success(req.user.id, orders);

  res.status(201).json({
    status: 'success',
    message: qty > 1 ? `${qty} accounts purchased` : 'Account purchased',
    orders,
    quantity: qty,
    balance: debit.balance
  });
}

// Legacy purchase from manually-entered inventory.
async function buyInventoryAccount(req, res, catalog, product, qty = 1) {
  const slots = (product.inventory || []).filter((i) => i.status === 'available');
  if (slots.length < qty) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform }, `${product.platform} is currently sold out. Please check back soon.`);
    return res.status(409).json({ message: 'This platform is currently sold out. Please check back soon.' });
  }
  const chosen = slots.slice(0, qty);

  const unitCost = Number(product.price) || 0;
  const cost = unitCost * qty;
  const wallet = await getUserWallet(req.user.id);
  if ((wallet?.balance || 0) < cost) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: cost,
    reference: purchaseRef,
    meta: { type: 'account', productId: product.id, platform: product.platform, quantity: qty }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform, price: cost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const orders = chosen.map((slot) => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'social_account',
    order_ref: generateReference(),
    platform: product.platform,
    username: slot.username,
    password: slot.password,
    email: slot.email || null,
    email_password: slot.emailPassword || slot.email_password || null,
    recovery: slot.recovery || null,
    extra: slot.extra || [],
    account_raw: slot.account_raw || null,
    desc: product.desc || null,
    price: unitCost,
    currency: 'NGN',
    status: 'completed',
    purchasedAt: new Date().toISOString()
  }));

  for (const order of orders) await addUserOrder(req.user.id, order);

  for (const slot of chosen) {
    slot.status = 'sold';
    slot.soldAt = new Date().toISOString();
    slot.buyerId = req.user.id;
  }
  await updateAccountProduct(product.id, { inventory: product.inventory });

  const user = await findById(req.user.id);
  for (const order of orders) {
    await recordSale({
      id: order.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      type: 'social_account',
      productId: product.id,
      productName: product.platform,
      price: order.price,
      currency: 'NGN',
      status: 'completed',
      createdAt: new Date().toISOString()
    });
  }

  notify.success(req.user.id, orders);

  res.status(201).json({
    status: 'success',
    message: qty > 1 ? `${qty} accounts purchased` : 'Account purchased',
    orders,
    quantity: qty,
    balance: debit.balance
  });
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
  const EMAIL_PASS_KEYS = ['email_password', 'emailpass', 'email_pass', 'mail_password', 'mailpass', 'mail_pass', 'password_email', 'email_password_'];
  const RECOVERY_KEYS = ['recovery', 'recovery_email', 'recovery_code', 'rec_email', 'twofa', 'two_fa', '2fa', 'phone', 'phone_number'];

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

  // Parse a pipe-delimited provider credential blob:
  //   login|password|email|emailpass|recovery|extra...
  // into named fields, tolerating missing / extra segments.
  function parsePipeCredentials(raw) {
    const parts = String(raw || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const out = { username: '', password: '', email: '', emailPassword: '', recovery: '', extra: [] };
    if (parts.length >= 1) out.username = parts[0];
    if (parts.length >= 2) out.password = parts[1];
    if (parts.length <= 2) return out;

    const rest = parts.slice(2);
    const emailIdx = rest.findIndex((p) => /@/.test(p) && !/^M\./.test(p) && p.length < 60);
    if (emailIdx < 0) {
      out.extra = rest;
      return out;
    }
    out.email = rest[emailIdx];
    const after = rest[emailIdx + 1];
    if (after && !/@/.test(after)) {
      out.emailPassword = after;
      out.recovery = rest[emailIdx + 2] || '';
      out.extra = [...rest.slice(0, emailIdx), ...rest.slice(emailIdx + 3)].filter(Boolean);
    } else {
      out.recovery = rest[emailIdx + 1] || '';
      out.extra = [...rest.slice(0, emailIdx), ...rest.slice(emailIdx + 2)].filter(Boolean);
    }
    return out;
  }

  let username = '';
  let password = '';
  let email = '';
  let emailPassword = '';
  let recovery = '';
  let extra = [];
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
  for (const d of candidates) {
    for (const k of ['email', 'account_email', 'mail', 'data_email']) {
      const v = d[k];
      if (v !== undefined && isScalar(v) && /@/.test(String(v))) { email = String(v); break; }
    }
    if (email) break;
  }

  // OneGridHub delivers accounts as a multi-line `accounts` string whose last
  // line is a JSON blob: {"account":"user|pass|email|emailpass|recovery|..."}.
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
            const creds = parsePipeCredentials(raw);
            if (!username) username = creds.username;
            if (!password) password = creds.password;
            if (!email) email = creds.email;
            if (!emailPassword) emailPassword = creds.emailPassword;
            if (!recovery) recovery = creds.recovery;
            if (extra.length === 0) extra = creds.extra;
            if (username && password) break;
          }
        } catch {
          // line isn't JSON — keep scanning
        }
      }
      if (username && password) break;
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
        if (!accountRaw && blob.includes('|')) accountRaw = blob;
        break;
      }
    }
  }

  // Fill any remaining named fields from deep keys (email password / recovery).
  if (!emailPassword || !recovery) {
    for (const d of candidates) {
      if (!emailPassword) {
        const mail = deepFind(d, EMAIL_PASS_KEYS);
        if (mail && !/@/.test(mail)) emailPassword = mail;
      }
      if (!recovery) recovery = deepFind(d, RECOVERY_KEYS);
      if (emailPassword && recovery) break;
    }
  }

  // If a plain pipe blob was stored but not parsed for the full fields, parse it now.
  if (accountRaw && (!email || !emailPassword) && accountRaw.includes('|')) {
    const creds = parsePipeCredentials(accountRaw);
    if (!email) email = creds.email;
    if (!emailPassword) emailPassword = creds.emailPassword;
    if (!recovery) recovery = creds.recovery;
    if (extra.length === 0) extra = creds.extra;
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

  return {
    username,
    password,
    email,
    emailPassword,
    recovery,
    extra,
    ready,
    account_raw: accountRaw || (username && password ? `${username}|${password}` : '')
  };
}

// How long a number stays active waiting for its SMS (mirrors the provider's window).
const NUMBER_EXPIRY_MS = (Number(process.env.NUMBER_EXPIRY_MINUTES) || 20) * 60 * 1000;

// Expected window for a provider to prepare and deliver a social media account
// (credentials arrive by email and in Paid Accounts). Configurable via env.
const ACCOUNT_DELIVERY_MS = (Number(process.env.ACCOUNT_DELIVERY_MINUTES) || 10) * 60 * 1000;

// A complete verification code for these services is normally 4–8 digits.
// OneGridHub's `otp` field sometimes only contains part of the code (e.g. "447"
// instead of the full "447684"), so codes shorter than 4 digits are treated as
// incomplete — we keep the order pending instead of marking it received.
function isPlausibleOtp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4;
}

// GET /api/orders/status?order_ref= — poll SMS for a purchased number
router.get('/status', asyncRoute(async (req, res) => {
  const { order_ref } = req.query;
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });

  const data = await ogRequest({ endpoint: 'status', order_ref });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));

  const smsCode = data.sms || data.code || data.otp || data.sms_code || null;
  if (smsCode) {
    const code = String(smsCode);
    const orders = await getUserOrders(req.user.id);
    const existing = orders.find((o) => o.order_ref === order_ref || o.ref === order_ref);
    const existingCode = existing?.sms ? String(existing.sms) : '';
    // Never downgrade a longer, complete code with a shorter one the provider
    // returns later (its `otp` extraction can be truncated).
    const stored = code.length >= existingCode.length ? code : existingCode;

    // A truncated code (e.g. "447" instead of "447684") is not a usable code.
    // Keep the order pending so the user can keep checking or cancel for a refund.
    await updateUserOrder(req.user.id, order_ref, {
      status: isPlausibleOtp(stored) ? 'received' : 'pending',
      sms: stored,
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

  // A "received" order is normally non-refundable, but if the code the provider
  // delivered was truncated (e.g. "447" instead of "447684") the user got nothing
  // usable, so let them cancel and get their money back.
  if (order.status === 'received' && isPlausibleOtp(order.sms)) {
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
    const updated = {
      status: 'completed',
      username: account.username,
      password: account.password,
      email: account.email || order.email || null,
      email_password: account.emailPassword || order.email_password || null,
      recovery: account.recovery || order.recovery || null,
      extra: (account.extra && account.extra.length ? account.extra : order.extra) || [],
      account_raw: account.account_raw || order.account_raw || null,
      expiresAt: null,
      lastCheckedAt: new Date().toISOString()
    };
    await updateUserOrder(req.user.id, order_ref, updated);
    return res.json({ status: 'completed', order: { ...order, ...updated } });
  }

  await updateUserOrder(req.user.id, order_ref, {
    status: 'pending',
    lastCheckedAt: new Date().toISOString()
  });
  res.json({ status: 'pending', order });
}));

export default router;