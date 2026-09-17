import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import { asyncRoute } from '../utils/http.js';
import { sms, isBxSuccess, bxData } from '../utils/bulnix.js';
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
  recordSale,
  pushNotification
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

// GET /api/orders/paid-accounts — purchased social media accounts with credentials.
// Marketplace accounts are delivered synchronously by Bulnix at purchase time, so
// this simply returns the stored orders.
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

// POST /api/orders/accounts { productId, quantity } — buy social media accounts
// from manually-stocked inventory. (Marketplace/provider accounts are bought
// directly through Bulnix at /api/bulnix/*.)
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

  return buyInventoryAccount(req, res, catalog, product, qty);
}));

// Purchase from manually-entered inventory.
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
  pushNotification(req.user.id, {
    title: 'Order completed',
    body: `Your purchase of ${qty > 1 ? `${qty} × ` : ''}${product.platform} is ready. Open My Orders to view the credentials.`,
    type: 'success',
    meta: { kind: 'order', orders: orders.map((o) => o.order_ref) }
  }).catch(() => {});

  res.status(201).json({
    status: 'success',
    message: qty > 1 ? `${qty} accounts purchased` : 'Account purchased',
    orders,
    quantity: qty,
    balance: debit.balance
  });
}

// A complete verification code for these services is normally 4–8 digits.
// A provider's short/partial code (e.g. "447" instead of the full "447684") is
// treated as incomplete — we keep the order pending instead of marking it received.
function isPlausibleOtp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4;
}

// Pull the delivered SMS code out of a Bulnix verification-order payload,
// tolerating a few possible field names.
function bulnixSmsCode(d) {
  if (!d || typeof d !== 'object') return '';
  const direct = d.code || d.sms || d.otp || d.sms_code || d.value || d.message_code;
  if (direct) return String(direct);
  const msgs = d.messages || d.sms_messages || d.received;
  if (Array.isArray(msgs) && msgs.length) {
    const m = msgs[msgs.length - 1];
    if (m == null) return '';
    if (typeof m === 'string') return m;
    return String(m.code || m.otp || m.text || m.message || '');
  }
  return '';
}

// GET /api/orders/status?order_ref= — poll SMS for a purchased number.
// Lifecycle is time-based (the number's own expiry window); we only auto-refund
// once that window has closed with no usable code, or when Bulnix explicitly
// reports the number dead. A number is never expired early while it could still
// deliver a code.
router.get('/status', asyncRoute(async (req, res) => {
  const { order_ref } = req.query;
  if (!order_ref) return res.status(400).json({ message: 'order_ref is required' });

  const orders = await getUserOrders(req.user.id);
  const order = orders.find((o) => o.order_ref === order_ref || o.ref === order_ref);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  // Poll Bulnix for the latest code / lifecycle where possible.
  let code = order.sms ? String(order.sms) : '';
  let explicitDead = false;
  if (order.provider === 'bulnix') {
    const providerId = order.provider_order || order.order_ref;
    const resp = await sms.status(providerId, { channel: order.channel || 'worldwide' });
    if (isBxSuccess(resp)) {
      const d = bxData(resp) || {};
      const fresh = bulnixSmsCode(d);
      // Never downgrade a longer, complete code with a shorter one.
      if (fresh && fresh.length >= code.length) code = fresh;
      const st = String(d.status || d.order_status || d.state || '').toLowerCase();
      explicitDead = ['cancelled', 'canceled', 'refunded', 'failed', 'expired', 'dead'].includes(st);
    }
  }

  const timeExpired = order.expiresAt ? Date.now() > new Date(order.expiresAt).getTime() : false;
  const alreadyRefunded = order.status === 'cancelled' || order.status === 'expired';

  if (code) {
    await updateUserOrder(req.user.id, order_ref, {
      status: isPlausibleOtp(code) ? 'received' : 'pending',
      sms: code,
      lastCheckedAt: new Date().toISOString()
    });
  } else {
    await updateUserOrder(req.user.id, order_ref, { lastCheckedAt: new Date().toISOString() });
  }

  // The number is dead when the provider says so, or its window elapsed with no
  // usable code. Auto-refund once (creditWallet dedupes by reference).
  const usable = isPlausibleOtp(code);
  if (!usable && (explicitDead || timeExpired) && !alreadyRefunded) {
    let refundResult = null;
    if (order.price) {
      refundResult = await creditWallet(req.user.id, {
        amount: Number(order.price) || 0,
        reference: `refund-${order_ref}`,
        meta: { type: 'refund', orderRef: order_ref, service: order.service || order.platform, reason: 'SMS number closed without delivering a usable code — auto-refund' }
      });
    }
    await updateUserOrder(req.user.id, order_ref, {
      status: 'expired',
      expiredAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString()
    });
    notify.refund(req.user.id, { ...order, status: 'expired', sms: code }, refundResult?.balance);
    pushNotification(req.user.id, {
      title: 'Number refunded',
      body: `Your ${order.service || 'virtual number'} order went dead without a code. ₦${Number(order.price || 0).toLocaleString()} has been refunded to your wallet.`,
      type: 'refund',
      meta: { kind: 'refund', orderRef: order_ref }
    }).catch(() => {});
    return res.json({
      status: 'success',
      sms: code,
      code,
      order_status: 'expired',
      _expired: true,
      _refunded: Boolean(refundResult?.ok),
      _refundBalance: refundResult?.balance ?? null,
      message: 'This number went dead without delivering a usable SMS code. You have been automatically refunded.'
    });
  }

  res.json({
    status: 'success',
    sms: code,
    code,
    order_status: usable ? 'received' : 'pending'
  });
}));

// POST /api/orders/cancel { order_ref }
// Bulnix verification numbers have no provider-side cancel; a pending number is
// simply refunded and left to lapse on the provider's own timer.
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
    pushNotification(req.user.id, {
      title: 'Order cancelled',
      body: `Your ${order.platform || 'account'} order was cancelled. ₦${Number(order.price || 0).toLocaleString()} has been refunded to your wallet.`,
      type: 'refund',
      meta: { kind: 'refund', orderRef: order_ref }
    }).catch(() => {});
    return res.json({ status: 'success', refunded: true, balance: refund?.balance });
  }

  // A "received" order that got a usable code is non-refundable. A truncated
  // code (e.g. "447" instead of "447684") delivered nothing usable, so allow it.
  if (order.status === 'received' && isPlausibleOtp(order.sms)) {
    return res.status(409).json({ message: 'This order already received its SMS code and cannot be refunded.' });
  }

  // Any other pending/expired virtual number: refund and mark cancelled. The
  // provider releases the number on its own timer, so there is nothing to cancel
  // on their side.
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
  pushNotification(req.user.id, {
    title: 'Order cancelled',
    body: `Your ${order.service || order.platform || 'order'} was cancelled. ₦${Number(order.price || 0).toLocaleString()} has been refunded to your wallet.`,
    type: 'refund',
    meta: { kind: 'refund', orderRef: order_ref }
  }).catch(() => {});

  res.json({ status: 'success', refunded: true, balance: refund?.balance });
}));

export default router;
