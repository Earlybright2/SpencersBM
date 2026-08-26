import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import { ogRequest, ogDigitalProducts, ogDigitalBuy, ogDigitalOrder, isOgSuccess, ogError, asyncRoute } from '../utils/onegridhub.js';
import { generateReference } from '../utils/flutterwave.js';
import { findById, debitWallet, addUserOrder, recordSale } from '../utils/store.js';
import { sendPurchaseSuccessEmail, sendPurchaseFailureEmail, sendRefundEmail } from '../utils/mailer.js';
import { normalizeDigitalProduct, getDigitalServers } from '../utils/digital-catalog.js';

const router = Router();

// Markup applied on top of the provider's cost price.
const NUMBER_MARKUP = Number(process.env.NUMBER_MARKUP) || 1.35;
const DIGITAL_MARKUP = Number(process.env.DIGITAL_MARKUP) || 1.35;

// In-memory cache for the expensive /prices endpoint.
// Each server's prices are cached for PRICE_CACHE_TTL_MS (default 10 min).
const PRICE_CACHE_TTL_MS = Number(process.env.PRICE_CACHE_TTL_MS) || 10 * 60 * 1000;
const priceCache = new Map(); // key: server id, value: { data, expiresAt }

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

// Helper to apply markup and round up to the nearest 100 NGN.
function applyMarkup(cost, markup = NUMBER_MARKUP) {
  const n = Number(cost) || 0;
  if (n <= 0) return 0;
  return Math.ceil((n * markup) / 100) * 100;
}

// ----- Public browsing endpoints (no auth required) -----

// GET /api/servers — list all available OneGridHub servers (SMS + digital)
router.get('/', asyncRoute(async (_req, res) => {
  const [smsRes, digitalServers] = await Promise.allSettled([
    ogRequest({ endpoint: 'servers' }),
    getDigitalServers()
  ]);

  const smsServers = (smsRes.status === 'fulfilled' && isOgSuccess(smsRes.value))
    ? (smsRes.value.servers || []).map((s) => ({
        ...s,
        type: 'sms',
        label: s.name || s.label || s.id || String(s),
        id: s.id || String(s)
      }))
    : [];

  const digServers = (digitalServers.status === 'fulfilled')
    ? (digitalServers.value || []).map((s) => ({
        ...s,
        type: 'digital',
        label: s.label || `Server ${s.id}`
      }))
    : [];

  res.json({ status: 'success', servers: [...smsServers, ...digServers] });
}));

// GET /api/servers/:server/services — list services for a server
router.get('/:server/services', asyncRoute(async (req, res) => {
  const { server } = req.params;
  const data = await ogRequest({ endpoint: 'services', server });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/servers/:server/countries — list countries for a server
router.get('/:server/countries', asyncRoute(async (req, res) => {
  const { server } = req.params;
  const data = await ogRequest({ endpoint: 'countries', server });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/servers/:server/price?service=&country= — get price for a specific combo
router.get('/:server/price', asyncRoute(async (req, res) => {
  const { server } = req.params;
  const { service, country } = req.query;
  if (!service || !country) {
    return res.status(400).json({ message: 'service and country are required' });
  }
  const data = await ogRequest({ endpoint: 'price', server, service, country });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));

  const cost = Number(data.price) || 0;
  const sell = applyMarkup(cost, NUMBER_MARKUP);
  res.json({ status: 'success', price: sell, cost, currency: 'NGN' });
}));

// GET /api/servers/:server/prices — get prices for all service+country combos on a server
// This fetches services, countries, then prices in batches. Returns the full catalog
// for the server with markup applied.
// Results are cached in memory for PRICE_CACHE_TTL_MS to avoid repeated heavy lookups.
router.get('/:server/prices', asyncRoute(async (req, res) => {
  const { server } = req.params;

  // Serve from cache when available
  const cached = priceCache.get(server);
  if (cached && Date.now() < cached.expiresAt) {
    return res.json(cached.data);
  }

  // Fetch services and countries in parallel
  const [servicesRes, countriesRes] = await Promise.all([
    ogRequest({ endpoint: 'services', server }),
    ogRequest({ endpoint: 'countries', server })
  ]);

  if (!isOgSuccess(servicesRes)) return res.status(502).json(ogError(servicesRes));
  if (!isOgSuccess(countriesRes)) return res.status(502).json(ogError(countriesRes));

  const services = servicesRes.services || [];
  const countries = countriesRes.countries || [];

  // Fetch prices in batches of 10 to avoid hammering the provider
  const BATCH_SIZE = 10;
  const results = [];
  const combos = [];

  for (const service of services) {
    for (const country of countries) {
      combos.push({ service, country });
    }
  }

  for (let i = 0; i < combos.length; i += BATCH_SIZE) {
    const batch = combos.slice(i, i + BATCH_SIZE);
    const priceResults = await Promise.allSettled(
      batch.map(({ service, country }) =>
        ogRequest({ endpoint: 'price', server, service: service.id, country: country.id })
          .then((data) => {
            if (!isOgSuccess(data)) return null;
            const cost = Number(data.price) || 0;
            if (cost <= 0) return null;
            return {
              service: service.id,
              serviceName: service.name,
              country: country.id,
              countryName: country.name,
              cost,
              price: applyMarkup(cost, NUMBER_MARKUP),
              currency: 'NGN'
            };
          })
          .catch(() => null)
      )
    );

    for (const result of priceResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }
  }

  const responsePayload = { status: 'success', server, count: results.length, items: results };

  // Store in cache
  priceCache.set(server, { data: responsePayload, expiresAt: Date.now() + PRICE_CACHE_TTL_MS });

  res.json(responsePayload);
}));

// ----- Social / digital accounts -----

// GET /api/servers/:server/digital — list social account products for a server
router.get('/:server/digital', asyncRoute(async (req, res) => {
  const { server } = req.params;
  const all = [];
  let page = 1;

  while (page <= 20) {
    const data = await ogDigitalProducts({ server, limit: 200, page });
    const list = data?.products || data?.data || data?.items || data?.list || data?.result || data?.digital_products || data?.records || [];
    if (!Array.isArray(list) || !list.length) break;
    all.push(...list);
    const total = Number(data?.total) || all.length;
    if (all.length >= total) break;
    page += 1;
  }

  // Normalize products and apply markup
  const products = all
    .map((raw) => {
      const n = normalizeDigitalProduct(raw);
      const cost = Number(raw?.price) || 0;
      if (cost <= 0) return null;
      return {
        id: raw?.id || raw?.product_id || raw?.product || raw?.pid || raw?.sku || '',
        platform: n.platform,
        country: n.country,
        countryName: n.countryName,
        name: n.name,
        cost,
        price: applyMarkup(cost, DIGITAL_MARKUP),
        stock: n.stock,
        currency: 'NGN'
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${a.platform} ${a.countryName}`.localeCompare(`${b.platform} ${b.countryName}`));

  res.json({ status: 'success', server, count: products.length, products });
}));

// ----- Purchase endpoints (auth required) -----

const MAX_QUANTITY = 10;

function parseQuantity(q) {
  if (q === undefined || q === null || q === '') return 1;
  const n = Number(q);
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUANTITY) return null;
  return n;
}

function friendlyProviderError(data) {
  const code = String(data?.code || '');
  const msg = String(data?.message || '').toLowerCase();
  if (code === 'unavailable' || msg.includes('service not found') || msg.includes('not available') || msg.includes('out of stock') || msg.includes('sold out')) {
    return 'This product is temporarily unavailable from our provider. Please try again later or choose another option.';
  }
  if (code === 'insufficient_funds' || msg.includes('insufficient balance') || msg.includes('insufficient_funds')) {
    return 'Our provider is temporarily low on funds. Please try again shortly or contact support.';
  }
  if (msg.includes('order has been created successfully') || msg.includes('order has been created')) {
    return 'Your order was placed with the provider but could not be confirmed immediately. We are processing it now — check back in a moment.';
  }
  return data?.message || 'The provider could not complete your purchase. Please try again in a moment.';
}

// POST /api/servers/buy-number { server, service, country, quantity }
// Buy a virtual number directly from a live provider server.
router.post('/buy-number', requireAuth, asyncRoute(async (req, res) => {
  const { server, service, country, quantity } = req.body || {};
  if (!server || !service || !country) {
    return res.status(400).json({ message: 'server, service, and country are required' });
  }

  const qty = parseQuantity(quantity);
  if (qty === null) return res.status(400).json({ message: 'quantity must be a whole number between 1 and 10' });

  // Get the live price from the provider
  const priceRes = await ogRequest({ endpoint: 'price', server, service, country });
  if (!isOgSuccess(priceRes)) {
    return res.status(502).json({ status: 'error', message: 'Could not fetch pricing for this product. Please try again.' });
  }

  const cost = Number(priceRes.price) || 0;
  if (cost <= 0) {
    return res.status(502).json({ status: 'error', message: 'This product is not currently available.' });
  }

  const unitPrice = applyMarkup(cost, NUMBER_MARKUP);
  const totalCost = unitPrice * qty;

  // Check wallet
  const wallet = await getUserWalletSafe(req.user.id);
  if ((wallet?.balance || 0) < totalCost) {
    notify.failure(req.user.id, { type: 'virtual_number', service, country, price: totalCost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Place orders with the provider
  const providerResults = [];
  for (let i = 0; i < qty; i += 1) {
    const providerData = await ogRequest({ endpoint: 'buy', server, country, service });
    if (!isOgSuccess(providerData)) {
      // Release any numbers already held
      for (const held of providerResults) {
        const heldRef = held.order_ref || held.order_id || held.ref || held.order;
        if (heldRef) await ogRequest({ endpoint: 'cancel', order_ref: heldRef }).catch(() => {});
      }
      const reason = friendlyProviderError(providerData);
      notify.failure(req.user.id, { type: 'virtual_number', service, country, price: totalCost }, reason);
      return res.status(502).json({ status: 'error', message: reason });
    }
    providerResults.push(providerData);
  }

  // Debit wallet
  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: totalCost,
    reference: purchaseRef,
    meta: { type: 'number_live', server, service, country, quantity: qty }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'virtual_number', service, country, price: totalCost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  const NUMBER_EXPIRY_MS = 20 * 60 * 1000;
  const orders = providerResults.map((providerData) => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'virtual_number',
    order_ref: providerData.order_ref || providerData.order_id || providerData.ref || providerData.order || purchaseRef,
    number: providerData.number || providerData.phone || providerData.phone_number || providerData.numberid || '',
    server,
    country_id: country,
    country,
    service_id: service,
    service,
    price: unitPrice,
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
      productId: `live-${server}-${service}-${country}`,
      productName: `${service} · ${country}`,
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

// POST /api/servers/buy-digital { server, productId, quantity }
// Buy a social media account directly from a live provider server.
router.post('/buy-digital', requireAuth, asyncRoute(async (req, res) => {
  const { server, productId, quantity } = req.body || {};
  if (!server || !productId) {
    return res.status(400).json({ message: 'server and productId are required' });
  }

  const qty = parseQuantity(quantity);
  if (qty === null) return res.status(400).json({ message: 'quantity must be a whole number between 1 and 10' });

  // First, fetch the live product list to find the matching product and its cost
  const all = [];
  let page = 1;
  while (page <= 20) {
    const data = await ogDigitalProducts({ server, limit: 200, page });
    const list = data?.products || data?.data || data?.items || data?.list || data?.result || data?.digital_products || data?.records || [];
    if (!Array.isArray(list) || !list.length) break;
    all.push(...list);
    const total = Number(data?.total) || all.length;
    if (all.length >= total) break;
    page += 1;
  }

  const rawProduct = all.find((p) => {
    const pid = p?.id || p?.product_id || p?.product || p?.pid || p?.sku || '';
    return String(pid) === String(productId);
  });

  if (!rawProduct) {
    return res.status(404).json({ message: 'Product not found on this server. Please refresh and try again.' });
  }

  const cost = Number(rawProduct?.price) || 0;
  if (cost <= 0) {
    return res.status(502).json({ message: 'This product is not currently available.' });
  }

  const unitPrice = applyMarkup(cost, DIGITAL_MARKUP);
  const totalCost = unitPrice * qty;

  // Check wallet
  const wallet = await getUserWalletSafe(req.user.id);
  if ((wallet?.balance || 0) < totalCost) {
    notify.failure(req.user.id, { type: 'social_account', platform: productId, price: totalCost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Place orders with the provider
  const providerResults = [];
  for (let i = 0; i < qty; i += 1) {
    const providerData = await ogDigitalBuy({ server, product: productId, quantity: 1 });
    if (!isOgSuccess(providerData)) {
      const reason = friendlyProviderError(providerData);
      notify.failure(req.user.id, { type: 'social_account', platform: productId, price: totalCost }, reason);
      return res.status(502).json({ status: 'error', message: reason });
    }
    providerResults.push(providerData);
  }

  // Debit wallet
  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: totalCost,
    reference: purchaseRef,
    meta: { type: 'account_live', server, productId, quantity: qty }
  });
  if (!debit.ok) {
    notify.failure(req.user.id, { type: 'social_account', platform: productId, price: totalCost }, 'Insufficient wallet balance. Please fund your wallet first.');
    return res.status(402).json({ message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // Build order objects
  const user = await findById(req.user.id);
  const n = normalizeDigitalProduct(rawProduct);
  const orders = providerResults.map((providerData) => {
    const providerOrderId = providerData.order || providerData.order_id || providerData.id || '';
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'social_account',
      order_ref: providerData.order_ref || providerData.order_id || providerData.ref || purchaseRef,
      platform: n.platform,
      country: n.country || '',
      countryName: n.countryName || '',
      desc: n.name || '',
      price: unitPrice,
      currency: 'NGN',
      status: providerOrderId ? 'pending' : 'completed',
      server,
      provider_order: providerOrderId || null,
      purchasedAt: new Date().toISOString(),
      raw: providerData
    };
  });

  for (const order of orders) {
    await addUserOrder(req.user.id, order);
    await recordSale({
      id: order.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      type: 'social_account',
      productId: `live-${server}-${productId}`,
      productName: `${n.platform} · ${n.countryName || n.country}`,
      price: order.price,
      currency: 'NGN',
      status: order.status,
      createdAt: new Date().toISOString()
    });
  }

  notify.success(req.user.id, orders);

  // For provider-backed orders, try to get credentials immediately
  const finalOrders = [...orders];
  for (const order of finalOrders) {
    if (order.provider_order) {
      try {
        const providerOrderId = normalizeProviderOrderId(order.provider_order);
        if (!providerOrderId) continue;
        const detail = await ogDigitalOrder(providerOrderId);
        if (!isOgSuccess(detail)) continue;
        const acct = extractAccountCredentials(detail, {});
        if (acct.username && acct.password) {
          order.status = 'completed';
          order.username = acct.username;
          order.password = acct.password;
          order.email = acct.email || null;
          order.email_password = acct.emailPassword || null;
          order.recovery = acct.recovery || null;
          order.extra = acct.extra || [];
          order.account_raw = acct.account_raw || null;
          await addUserOrder(req.user.id, order);
        }
      } catch {
        // credential fetch failed — leave as pending
      }
    }
  }

  res.status(201).json({
    status: 'success',
    message: qty > 1 ? `${qty} accounts purchased` : 'Account purchased',
    orders: finalOrders,
    quantity: qty,
    balance: debit.balance
  });
}));

// ----- Helpers shared with orders.js -----

async function getUserWalletSafe(userId) {
  try {
    const user = await findById(userId);
    return user?.wallet || null;
  } catch {
    return null;
  }
}

function normalizeProviderOrderId(raw) {
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return String(n);
  return String(raw).trim() || null;
}

function extractAccountCredentials(detail, order) {
  const data = detail?.data || detail?.order || detail;
  if (!data) return {};

  const username = data.username || data.email || data.login || data.user || '';
  const password = data.password || data.pass || data.pwd || '';
  const email = data.email_address || data.emailAccount || data.email_account || data.mail || '';
  const emailPassword = data.email_password || data.emailPassword || data.email_pass || '';
  const recovery = data.recovery || data.recovery_email || data.recoveryEmail || '';
  const extra = Array.isArray(data.extra) ? data.extra.filter(Boolean) : [];
  const accountRaw = JSON.stringify(data).slice(0, 2000);

  return {
    username: username || order?.username || '',
    password: password || order?.password || '',
    email: email || order?.email || '',
    emailPassword: emailPassword || order?.email_password || order?.emailPassword || '',
    recovery: recovery || order?.recovery || '',
    extra: extra.length ? extra : (order?.extra || []),
    account_raw: accountRaw
  };
}

export default router;
