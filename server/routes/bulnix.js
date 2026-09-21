import { Router } from 'express';
import { requireAuth, requireAdmin } from '../utils/auth.js';
import {
  marketplace, sms, followers,
  isBxSuccess, bxError, bxData, bxPagination, bxIdempotencyKey, bxConfiguredMap,
  applyBulnixMarkup, bxNgnRate
} from '../utils/bulnix.js';
import { generateReference } from '../utils/flutterwave.js';
import {
  findById, debitWallet, creditWallet,
  addUserOrder, updateUserOrder, recordSale, getUserWallet,
  getBulnixOverrides, pushNotification
} from '../utils/store.js';
import { sendPurchaseSuccessEmail, sendPurchaseFailureEmail } from '../utils/mailer.js';

const router = Router();

const MAX_ACCOUNT_QTY = 10;          // marketplace accounts per order
const NUMBER_EXPIRY_MS = 20 * 60 * 1000; // SMS number lifetime
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Apply admin price overrides to a list of items.
// items: array of objects with .id and .price fields
// serviceType: 'marketplace' | 'sms' | 'followers'
// overrideKey: function to extract the provider_id from an item (defaults to item.id)
function applyOverrides(items, serviceType, overrideKey) {
  return getBulnixOverrides(serviceType)
    .then((rows) => {
      const map = new Map();
      rows.forEach((r) => map.set(String(r.provider_id), r));
      return items.map((item) => {
        const key = overrideKey ? overrideKey(item) : item.id;
        const override = map.get(String(key));
        if (override) {
          return { ...item, price: Number(override.admin_price), adminOverridden: true, overrideId: override.id };
        }
        return item;
      });
    })
    .catch(() => items);
}

// Fetch overrides map for a service type (used in order endpoints)
async function getOverridesMap(serviceType) {
  try {
    const rows = await getBulnixOverrides(serviceType);
    const map = new Map();
    rows.forEach((r) => map.set(String(r.provider_id), r));
    return map;
  } catch {
    return new Map();
  }
}

/* ============================================================
   Small utilities
   ============================================================ */

function parseAccountQty(q) {
  if (q === undefined || q === null || q === '') return 1;
  const n = Number(q);
  if (!Number.isInteger(n) || n < 1 || n > MAX_ACCOUNT_QTY) return null;
  return n;
}

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Decode a few HTML entities + strip tags; Bulnix names/descriptions contain both.
function stripHtml(input, cap = 600) {
  if (!input) return '';
  const text = String(input)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > cap ? `${text.slice(0, cap - 1)}…` : text;
}

function num(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// slug → Title Case ("netflix-accounts" → "Netflix Accounts").
function humanizeSlug(slug) {
  if (!slug) return '';
  return String(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Bulnix reuses the literal name "Account" across many distinct categories; the
// slug is the descriptive one. Treat these names as non-informative.
const GENERIC_CATEGORY_NAMES = new Set(['', 'account', 'accounts', 'other', 'others', 'general', 'misc']);

// Fire-and-forget purchase emails + in-app notifications (never block the API response).
const notify = {
  success: (userId, order) => {
    findById(userId)
      .then((user) => user && sendPurchaseSuccessEmail(user, order))
      .catch((err) => console.error('Bulnix success email failed:', err.message));
    const list = Array.isArray(order) ? order : [order];
    const first = list[0] || {};
    pushNotification(userId, {
      title: first.type === 'virtual_number' ? 'Number activated' : 'Order completed',
      body: first.type === 'virtual_number'
        ? `Your ${first.service || 'virtual number'} order was activated. Watch for the SMS code under My Orders.`
        : `Your ${first.platform || 'account'} purchase is ${first.status === 'pending' ? 'processing' : 'ready'} — details are in My Orders.`,
      type: 'success',
      meta: { kind: 'order', orders: list.map((o) => o.order_ref || o.id) }
    }).catch(() => {});
  },
  failure: (userId, order, reason) => {
    findById(userId)
      .then((user) => user && sendPurchaseFailureEmail(user, order, reason))
      .catch((err) => console.error('Bulnix failure email failed:', err.message));
    const o = order || {};
    pushNotification(userId, {
      title: 'Order failed',
      body: `Your ${o.platform || o.service || 'order'} could not be completed${reason ? `: ${reason}` : '.'} Any reserved funds have been returned to your wallet.`,
      type: 'error',
      meta: { kind: 'order_failed' }
    }).catch(() => {});
  }
};

// Turn a normalized bulnix error into an HTTP status + JSON body.
function sendProviderError(res, data, fallback = 'This service is temporarily unavailable. Please try again shortly.') {
  const err = bxError(data, fallback);
  // not_configured is a setup state, not a fault — 503 keeps it out of error monitors as a bug.
  const status = err.code === 'not_configured' ? 503 : (data?._http && data._http < 500 ? 400 : 502);
  return res.status(status).json(err);
}

/* ============================================================
   Marketplace normalizers (verified field names, Sept 2026)
   product: { id, name, short_description, description, price_usd,
              in_stock, stock_quantity, orderable, is_digital,
              is_subscription, image_url, category_id }
   category: { id, name, slug, product_count, parent_id, image_url }
   ============================================================ */

function mapCategory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.category_id ?? raw.slug;
  if (id === undefined || id === null || id === '') return null;
  const rawName = stripHtml(raw.name ?? raw.title ?? raw.label ?? '', 80);
  const slug = raw.slug ?? null;
  // Prefer a humanized slug when the provider's name is generic/uninformative.
  const name = (!rawName || GENERIC_CATEGORY_NAMES.has(rawName.toLowerCase()))
    ? (humanizeSlug(slug) || rawName || `Category ${id}`)
    : rawName;
  return {
    id: String(id),
    name,
    slug,
    parentId: raw.parent_id ?? raw.parentId ?? null,
    icon: raw.image_url ?? raw.icon ?? raw.image ?? null,
    count: Number(raw.product_count ?? raw.products_count ?? raw.count ?? 0) || 0
  };
}

function mapProduct(raw, rate) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.product_id ?? raw.sku;
  if (id === undefined || id === null || id === '') return null;
  const priceUsd = num(raw.price_usd, raw.price, raw.unit_price_usd, raw.cost);

  const inStock = raw.in_stock !== false;
  const stockQ = raw.stock_quantity ?? raw.stock ?? raw.available;
  const stock = !inStock
    ? 0
    : (stockQ === undefined || stockQ === null ? null : (Number(stockQ) || 0));

  return {
    id: String(id),
    name: stripHtml(raw.name ?? raw.title ?? raw.product_name ?? 'Account', 200),
    category: raw.category_name ?? raw.category ?? null,
    categoryId: raw.category_id != null ? String(raw.category_id) : null,
    platform: raw.category_name ?? raw.platform ?? null,
    description: stripHtml(raw.short_description ?? raw.description ?? '', 400),
    priceUsd,
    price: applyBulnixMarkup(priceUsd, rate),
    currency: 'NGN',
    stock,
    inStock,
    orderable: raw.orderable !== false,
    isDigital: raw.is_digital !== false,
    isSubscription: Boolean(raw.is_subscription),
    image: raw.image_url ?? raw.image ?? raw.logo ?? null
  };
}

/**
 * Extract per-account credentials from a delivered marketplace order.
 *
 * The RAW `delivery` array is authoritative: it is
 *   [ [ "login:password:email:email_password:...trailing (URL/2FA)..." ], ... ]
 * one sub-array per account. Bulnix's own `labelled_delivery` mis-splits any
 * trailing URL on ":" (2FA/ID come out as "https" / "//host/..."), so we parse
 * the raw line positionally for the four simple fields and keep the remainder
 * verbatim. `labelled_delivery` is only a fallback when a raw line is missing.
 *
 * Returns one object per account:
 *   { username, password, email, email_password, recovery, extra[], account_raw }
 */
function extractDeliveries(orderData) {
  const data = orderData || {};
  const rawDelivery = Array.isArray(data.delivery) ? data.delivery : [];
  const labelled = Array.isArray(data.labelled_delivery) ? data.labelled_delivery : [];
  const count = Math.max(rawDelivery.length, labelled.length);
  const out = [];

  for (let i = 0; i < count; i += 1) {
    const rawArr = rawDelivery[i];
    const rawLine = Array.isArray(rawArr)
      ? rawArr.filter((s) => s != null && String(s).trim()).map(String).join('\n')
      : (rawArr != null ? String(rawArr) : '');

    let account;
    if (rawLine) {
      // Positional parse — first four tokens are simple (no embedded colons).
      const parts = rawLine.split(':');
      const trailing = parts.slice(4).join(':').trim(); // rejoined URL / 2FA / id
      account = {
        username: (parts[0] || '').trim(),
        password: (parts[1] || '').trim(),
        email: (parts[2] || '').trim(),
        email_password: (parts[3] || '').trim(),
        recovery: '',
        extra: trailing ? [trailing] : [],
        account_raw: rawLine
      };
    } else {
      // Fallback: build from the labelled credentials.
      const creds = Array.isArray(labelled[i]?.credentials) ? labelled[i].credentials : [];
      const map = {};
      creds.forEach((c) => { if (c && c.key) map[String(c.key).toLowerCase()] = c.value; });
      const known = new Set(['login', 'username', 'password', 'email', 'email_password']);
      const extra = creds
        .filter((c) => c && !known.has(String(c.key).toLowerCase()) && String(c.value ?? '').trim())
        .map((c) => `${c.label || c.key}: ${c.value}`);
      account = {
        username: (map.login || map.username || '').toString().trim(),
        password: (map.password || '').toString().trim(),
        email: (map.email || '').toString().trim(),
        email_password: (map.email_password || '').toString().trim(),
        recovery: (map.recovery || '').toString().trim(),
        extra,
        account_raw: creds.map((c) => c.value).filter(Boolean).join(':')
      };
    }
    out.push(account);
  }
  return out;
}

const isFulfilled = (s) => /fulfil|complete|deliver|success|done/i.test(String(s || ''));

// Provider order id from a create/detail payload (multiple shapes tolerated).
function providerOrderIdOf(data) {
  if (!data || typeof data !== 'object') return null;
  const id = data.order_id ?? data.id ?? data.order?.order_id ?? data.order?.id ?? data.order_number;
  return id != null ? String(id) : null;
}

// Self-describing marketplace order ref → lets /status recover (providerOrderId, lineIndex).
const marketRef = (providerOrderId, lineIndex) => `bx-${providerOrderId}-${lineIndex}`;
function parseMarketRef(ref) {
  const m = /^bx-(.+)-(\d+)$/.exec(String(ref || ''));
  if (!m) return null;
  return { providerOrderId: m[1], lineIndex: Number(m[2]) };
}

/* ============================================================
   Status — which Bulnix services are connected (no secrets)
   ============================================================ */
router.get('/status', (_req, res) => {
  res.json({ status: 'success', services: bxConfiguredMap(), provider: 'bulnix' });
});

/* ============================================================
   Marketplace — browse (public)
   ============================================================ */

router.get('/marketplace/categories', async (_req, res) => {
  const data = await marketplace.categories();
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not load categories right now.');
  const list = bxData(data);
  const categories = (Array.isArray(list) ? list : []).map(mapCategory).filter(Boolean);
  res.json({ status: 'success', count: categories.length, categories });
});

router.get('/marketplace/products', async (req, res) => {
  const { category, search, page, limit } = req.query;
  const [data, rate] = await Promise.all([
    marketplace.products({
      categoryId: category || undefined,
      search: search || undefined,
      page: page || undefined,
      limit: limit || undefined
    }),
    bxNgnRate()
  ]);
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not load products right now.');
  const list = bxData(data);
  let products = (Array.isArray(list) ? list : []).map((p) => mapProduct(p, rate)).filter(Boolean);
  // Apply admin price overrides
  try {
    const overrideMap = await getOverridesMap('marketplace');
    products = products.map((item) => {
      const override = overrideMap.get(String(item.id));
      if (override) {
        return { ...item, price: Number(override.admin_price), adminOverridden: true };
      }
      return item;
    });
  } catch { /* ignore override errors */ }
  const pag = bxPagination(data);
  res.json({
    status: 'success',
    count: products.length,
    total: pag?.total ?? products.length,
    page: pag?.page ?? (Number(page) || 1),
    pages: pag?.pages ?? 1,
    products
  });
});

router.get('/marketplace/products/:id', async (req, res) => {
  const [data, rate] = await Promise.all([marketplace.product(req.params.id), bxNgnRate()]);
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not load this product right now.');
  const product = mapProduct(bxData(data), rate);
  if (!product) return res.status(404).json({ status: 'error', message: 'Product not found.' });
  res.json({ status: 'success', product });
});

// Reseller wallet balance — ADMIN only (this is our float with Bulnix).
router.get('/marketplace/balance', requireAdmin, async (_req, res) => {
  const data = await marketplace.balance();
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not fetch provider balance.');
  res.json({ status: 'success', balance: bxData(data) });
});

/* ============================================================
   Marketplace — purchase (auth, wallet-backed)

   Wallet-first with refund-on-failure: reserve funds, place ONE
   provider order (items[]), then fetch delivery. If the provider
   rejects, the debit is refunded immediately. Digital delivery is
   effectively instant, so we briefly poll the order detail in-request
   and return completed accounts with credentials.
   ============================================================ */
router.post('/marketplace/order', requireAuth, async (req, res) => {
  if (!marketplace.configured()) {
    return res.status(503).json(bxError({ code: 'not_configured' }, 'The marketplace is being connected and will be live shortly.'));
  }

  const { productId, quantity } = req.body || {};
  if (!productId) return res.status(400).json({ status: 'error', message: 'productId is required' });

  const qty = parseAccountQty(quantity);
  if (qty === null) return res.status(400).json({ status: 'error', message: `Quantity must be a whole number between 1 and ${MAX_ACCOUNT_QTY}.` });

  // 1) Live price + availability from the provider (never trust the client).
  const rate = await bxNgnRate();
  const productRes = await marketplace.product(productId);
  if (!isBxSuccess(productRes)) return sendProviderError(res, productRes, 'Could not verify this product. Please try again.');
  const product = mapProduct(bxData(productRes), rate);
  if (!product || product.price <= 0 || !product.orderable) {
    return res.status(409).json({ status: 'error', message: 'This product is not currently available.' });
  }
  if (product.stock !== null && product.stock < qty) {
    return res.status(409).json({ status: 'error', message: `Only ${product.stock} left in stock.` });
  }

  // Check for admin price override
  let unitPrice = product.price;
  try {
    const overrideMap = await getOverridesMap('marketplace');
    const override = overrideMap.get(String(productId));
    if (override) {
      unitPrice = Number(override.admin_price);
    }
  } catch { /* ignore */ }
  const totalCost = unitPrice * qty;

  // 2) Reserve funds up-front (atomic balance check inside debitWallet).
  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: totalCost,
    reference: purchaseRef,
    meta: { type: 'bulnix_marketplace', productId: String(productId), quantity: qty, provider: 'bulnix' }
  });
  if (!debit.ok) {
    return res.status(402).json({ status: 'error', message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // 3) Place ONE provider order carrying the full quantity.
  const placed = await marketplace.placeOrder({ productId, quantity: qty });
  if (!isBxSuccess(placed)) {
    await creditWallet(req.user.id, {
      amount: totalCost,
      reference: `${purchaseRef}-refund`,
      meta: { type: 'bulnix_marketplace_refund', reason: bxError(placed).code, provider: 'bulnix' }
    });
    pushNotification(req.user.id, {
      title: 'Order failed',
      body: `Your ${product.platform || product.name || 'order'} could not be completed: ${bxError(placed).message}. Your wallet was not charged.`,
      type: 'error',
      meta: { kind: 'order_failed' }
    }).catch(() => {});
    const reason = bxError(placed).message;
    notify.failure(req.user.id, { type: 'social_account', platform: product.platform || product.name, price: totalCost }, reason);
    return sendProviderError(res, placed, reason);
  }

  const providerOrderId = providerOrderIdOf(bxData(placed));
  if (!providerOrderId) {
    // Placed but untrackable — refund and flag for manual reconciliation rather than charge blindly.
    await creditWallet(req.user.id, {
      amount: totalCost,
      reference: `${purchaseRef}-refund`,
      meta: { type: 'bulnix_marketplace_refund', reason: 'no_order_id', provider: 'bulnix' }
    });
    console.error('[bulnix] marketplace order placed but no order id in response:', JSON.stringify(bxData(placed)).slice(0, 300));
    return res.status(502).json({ status: 'error', message: 'The order was placed but could not be confirmed. Your wallet was not charged — please try again.' });
  }

  // 4) Fetch delivery (digital = near-instant). Brief in-request poll.
  let detail = null;
  let deliveries = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const detRes = await marketplace.order(providerOrderId);
    if (isBxSuccess(detRes)) {
      detail = bxData(detRes) || {};
      deliveries = extractDeliveries(detail);
      if (isFulfilled(detail.status ?? detail.delivery_status) || deliveries.length >= qty) break;
    }
    if (attempt < 3) await sleep(1500);
  }

  // 5) Build + persist one social_account order per line (delivered or pending).
  const user = await findById(req.user.id);
  const now = new Date().toISOString();
  const orders = [];
  for (let i = 0; i < qty; i += 1) {
    const creds = deliveries[i];
    const delivered = Boolean(creds && (creds.username || creds.account_raw));
    const ref = marketRef(providerOrderId, i);
    const order = {
      id: ref,
      type: 'social_account',
      provider: 'bulnix',
      order_ref: ref,
      provider_order: providerOrderId,
      line_index: i,
      platform: product.platform || product.category || product.name || 'Account',
      desc: product.name,
      country: product.country || '',
      countryName: product.country || '',
      price: unitPrice,
      currency: 'NGN',
      status: delivered ? 'completed' : 'pending',
      purchasedAt: now,
      ...(delivered
        ? {
            username: creds.username || undefined,
            password: creds.password || undefined,
            email: creds.email || undefined,
            email_password: creds.email_password || undefined,
            recovery: creds.recovery || undefined,
            extra: creds.extra && creds.extra.length ? creds.extra : undefined,
            account_raw: creds.account_raw || undefined
          }
        : {})
    };
    orders.push(order);
    await addUserOrder(req.user.id, order);
    await recordSale({
      id: order.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      type: 'social_account',
      productId: `bulnix-${productId}`,
      productName: product.name,
      price: order.price,
      currency: 'NGN',
      status: order.status,
      createdAt: now
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
});

// Poll a pending marketplace account for delivery/credentials.
router.get('/marketplace/order/:id/status', requireAuth, async (req, res) => {
  const ref = req.params.id;
  const parsed = parseMarketRef(ref);
  const providerOrderId = parsed?.providerOrderId ?? ref;
  const lineIndex = parsed?.lineIndex ?? 0;

  const detRes = await marketplace.order(providerOrderId);
  if (!isBxSuccess(detRes)) return sendProviderError(res, detRes, 'Could not check this order right now.');
  const detail = bxData(detRes) || {};
  const deliveries = extractDeliveries(detail);
  const creds = deliveries[lineIndex];
  const delivered = Boolean(creds && (creds.username || creds.account_raw));

  let updated = null;
  if (delivered) {
    updated = await updateUserOrder(req.user.id, ref, {
      status: 'completed',
      username: creds.username || undefined,
      password: creds.password || undefined,
      email: creds.email || undefined,
      email_password: creds.email_password || undefined,
      recovery: creds.recovery || undefined,
      extra: creds.extra && creds.extra.length ? creds.extra : undefined,
      account_raw: creds.account_raw || undefined
    });
  }

  res.json({
    status: 'success',
    order_status: detail.status ?? detail.delivery_status ?? 'pending',
    delivered,
    order: updated || undefined,
    credentials: delivered ? creds : null
  });
});

/* ============================================================
   Followers Growth (auth, wallet-backed)
   Upstream occasionally answers SERVICE_REQUEST_FAILED; the catalog
   is cached briefly and fetched with retry so browse + pricing stay
   reliable. Pricing is derived from the USD rate-per-1000, marked up
   once on the order total.
   ============================================================ */

let flCatalogCache = { at: 0, rows: null };
async function fetchFollowersCatalog() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await followers.catalog({});
    if (isBxSuccess(res)) {
      const data = bxData(res);
      const rows = Array.isArray(data) ? data : [];
      flCatalogCache = { at: Date.now(), rows };
      return rows;
    }
    // Only retry genuine provider failures; "not configured" never recovers.
    if (!isBxSuccess(res) && res?.code === 'not_configured') return null;
    if (attempt < 2) await sleep(900);
  }
  return null; // signals provider failure to the caller
}

// Browse path: a short cache keeps the catalog snappy and reliable.
async function getFollowersCatalog() {
  if (flCatalogCache.rows && Date.now() - flCatalogCache.at < 60_000) return flCatalogCache.rows;
  return fetchFollowersCatalog();
}

// Order path: the provider price-locks orders against its CURRENT rate. A
// cached row can carry a stale price and make the upstream reject with
// SERVICE_REQUEST_FAILED — so orders always resolve against a FRESH catalog
// (falling back to the cache only if the provider is momentarily unreachable).
async function getFollowersCatalogForOrder() {
  const fresh = await fetchFollowersCatalog();
  if (fresh && fresh.length) return fresh;
  return flCatalogCache.rows;
}

const flRateUsdPer1000 = (raw) => num(raw.retailRatePerThousandUSD, raw.rate, raw.price_per_1000, raw.rate_per_1000);

function mapFlService(raw, rate) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ?? raw.service_id ?? raw.service;
  if (id === undefined || id === null || id === '') return null;
  const rateUsd = flRateUsdPer1000(raw);
  return {
    id: String(id),
    name: stripHtml(raw.name ?? raw.title ?? raw.service ?? `Service ${id}`, 160),
    platform: raw.platform ?? '',
    category: stripHtml(raw.category ?? '', 120),
    description: stripHtml(raw.description ?? raw.details ?? raw.about ?? '', 400),
    min: Number(raw.min ?? raw.min_quantity ?? 0) || 0,
    max: Number(raw.max ?? raw.max_quantity ?? 0) || 0,
    dripfeed: Boolean(raw.dripfeedSupported ?? raw.dripfeed),
    refill: Boolean(raw.refillSupported ?? raw.refill),
    rateUsdPer1000: rateUsd,
    priceNgnPer1000: applyBulnixMarkup(rateUsd, rate)
  };
}

router.get('/followers/platforms', async (_req, res) => {
  const data = await followers.platforms();
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Followers Growth is being connected.');
  const list = bxData(data);
  const platforms = (Array.isArray(list) ? list : []).map((p) => ({
    id: String(p.id ?? p.slug ?? p.platform ?? ''),
    label: p.label ?? p.name ?? String(p.id ?? ''),
    serviceCount: Number(p.serviceCount ?? p.service_count ?? 0) || 0
  })).filter((p) => p.id);
  res.json({ status: 'success', count: platforms.length, platforms });
});

router.get('/followers/services', async (req, res) => {
  const rows = await getFollowersCatalog();
  if (!rows) {
    return res.status(502).json(bxError({ code: 'provider_unreachable', retryable: true }, 'Followers Growth is busy. Please refresh in a moment.'));
  }
  const rate = await bxNgnRate();
  const platform = req.query.platform ? String(req.query.platform).toLowerCase() : '';
  const q = req.query.search ? String(req.query.search).toLowerCase() : '';
  let services = rows.map((r) => mapFlService(r, rate)).filter(Boolean);
  if (platform) services = services.filter((s) => s.platform.toLowerCase() === platform);
  if (q) services = services.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  // Apply admin price overrides
  try {
    const overrideMap = await getOverridesMap('followers');
    services = services.map((item) => {
      const override = overrideMap.get(String(item.id));
      if (override) {
        return { ...item, priceNgnPer1000: Number(override.admin_price), adminOverridden: true };
      }
      return item;
    });
  } catch { /* ignore override errors */ }
  res.json({ status: 'success', count: services.length, services });
});

router.post('/followers/order', requireAuth, async (req, res) => {
  if (!followers.configured()) {
    return res.status(503).json(bxError({ code: 'not_configured' }, 'Followers Growth is being connected and will be live shortly.'));
  }

  const { serviceId, link, quantity } = req.body || {};
  const target = typeof link === 'string' ? link.trim() : '';
  if (!serviceId || !target) {
    return res.status(400).json({ status: 'error', message: 'Select a service and paste the link to your profile or post.' });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ status: 'error', message: 'Quantity must be a whole number.' });
  }

  // 1) Resolve the service against a FRESH catalog (authoritative price + bounds).
  // Price-locked upstream: quoting from a cached row gets the order rejected.
  const rows = await getFollowersCatalogForOrder();
  if (!rows) {
    return res.status(502).json(bxError({ code: 'provider_unreachable', retryable: true }, 'Followers Growth is busy. Please try again in a moment.'));
  }
  const rawSvc = rows.find((r) => String(r.id ?? r.service_id ?? r.service) === String(serviceId));
  if (!rawSvc) {
    return res.status(409).json({ status: 'error', message: 'That service is no longer available. Please refresh and pick again.' });
  }
  const min = Number(rawSvc.min ?? rawSvc.min_quantity ?? 0) || 0;
  const max = Number(rawSvc.max ?? rawSvc.max_quantity ?? 0) || 0;
  if (min && qty < min) return res.status(400).json({ status: 'error', message: `Minimum quantity for this service is ${min}.` });
  if (max && qty > max) return res.status(400).json({ status: 'error', message: `Maximum quantity for this service is ${max}.` });

  const rateUsdPer1000 = flRateUsdPer1000(rawSvc);
  const rate = await bxNgnRate();
  const costUsd = (rateUsdPer1000 * qty) / 1000;
  let price = applyBulnixMarkup(costUsd, rate);
  // Admin price override. The override is quoted PER 1,000 (same unit the admin
  // sets in the panel), so scale it by the ordered quantity — quoting it as a
  // flat total undercharged multi-thousand orders.
  try {
    const overrideMap = await getOverridesMap('followers');
    const override = overrideMap.get(String(serviceId));
    if (override) {
      price = Math.ceil((Number(override.admin_price) * qty) / 1000);
    }
  } catch { /* ignore */ }
  if (price <= 0) {
    return res.status(502).json({ status: 'error', message: 'This service is not currently priced. Please try another.' });
  }

  // 2) Reserve funds.
  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: price,
    reference: purchaseRef,
    meta: { type: 'bulnix_followers', serviceId: String(serviceId), quantity: qty, provider: 'bulnix' }
  });
  if (!debit.ok) {
    return res.status(402).json({ status: 'error', message: 'Insufficient wallet balance. Please fund your wallet first.' });
  }

  // 3) Place the campaign (price-locked to the advertised USD rate-per-1000).
  const placed = await followers.order({
    serviceId,
    target,
    quantity: qty,
    expectedRetailPriceUsd: rateUsdPer1000,
    idempotencyKey: bxIdempotencyKey('flw')
  });
  if (!isBxSuccess(placed)) {
    await creditWallet(req.user.id, {
      amount: price,
      reference: `${purchaseRef}-refund`,
      meta: { type: 'bulnix_followers_refund', reason: bxError(placed).code, provider: 'bulnix' }
    });
    const reason = bxError(placed).message;
    notify.failure(req.user.id, { type: 'followers', platform: rawSvc.platform || 'Growth', price }, reason);
    return sendProviderError(res, placed, reason);
  }

  // 4) Record the campaign.
  const body = bxData(placed) || {};
  const providerOrderId = providerOrderIdOf(body);
  const user = await findById(req.user.id);
  const now = new Date().toISOString();
  const order = {
    id: genId(),
    type: 'followers',
    provider: 'bulnix',
    order_ref: providerOrderId ? String(providerOrderId) : purchaseRef,
    provider_order: providerOrderId ? String(providerOrderId) : null,
    service: mapFlService(rawSvc, rate)?.name || `Service ${serviceId}`,
    platform: rawSvc.platform || '',
    target,
    quantity: qty,
    price,
    currency: 'NGN',
    status: 'processing',
    purchasedAt: now
  };
  await addUserOrder(req.user.id, order);
  await recordSale({
    id: order.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: 'followers',
    productId: `bulnix-fl-${serviceId}`,
    productName: order.service,
    price,
    currency: 'NGN',
    status: 'processing',
    createdAt: now
  });
  notify.success(req.user.id, order);

  res.status(201).json({ status: 'success', message: 'Campaign placed', order, balance: debit.balance });
});

router.get('/followers/order/:id', requireAuth, async (req, res) => {
  const data = await followers.status(req.params.id);
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not check this campaign.');
  res.json({ status: 'success', order: bxData(data) });
});

/* ============================================================
   SMS Verification (auth, wallet-backed) — ready for the SMS key.
   Channels: "worldwide" (country_code + service_slug) | "network".
   Produces virtual_number orders with a 20-min expiry; the code arrives
   via status polling.
   ============================================================ */

router.get('/sms/countries', async (req, res) => {
  const channel = req.query.channel === 'network' ? 'network' : 'worldwide';
  const data = await sms.catalog({ channel });
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'SMS verification is being connected.');
  const list = bxData(data);
  const countries = (Array.isArray(list) ? list : []).map((c) => ({
    code: c.code ?? c.country_code ?? c.slug ?? '',
    name: c.name ?? c.country ?? String(c.code ?? ''),
    slug: c.slug ?? c.country_slug ?? null
  })).filter((c) => c.code || c.slug);
  res.json({ status: 'success', channel, count: countries.length, countries });
});

router.get('/sms/operators', async (req, res) => {
  const channel = req.query.channel === 'worldwide' ? 'worldwide' : 'network';
  const countrySlug = req.query.country_slug || req.query.countrySlug || '';
  if (!countrySlug) {
    return res.status(400).json({ status: 'error', message: 'A country is required.' });
  }
  // Operators are embedded in the catalog response for the network channel.
  const data = await sms.catalog({ channel });
  if (!isBxSuccess(data)) {
    return res.json({ status: 'success', channel, count: 0, operators: [] });
  }
  const list = bxData(data);
  const country = (Array.isArray(list) ? list : []).find(
    (c) => (c.slug === countrySlug || c.code === countrySlug || c.country_slug === countrySlug)
  );
  const rawOperators = country?.operators || country?.routing || [];
  const operators = (Array.isArray(rawOperators) ? rawOperators : [])
    .map((o) => ({
      slug: o.slug ?? o.operator_slug ?? o.code ?? '',
      name: stripHtml(o.name ?? o.title ?? o.operator ?? o.slug ?? '', 80)
    }))
    .filter((o) => o.slug);
  res.json({ status: 'success', channel, count: operators.length, operators });
});

router.get('/sms/services', async (req, res) => {
  const channel = req.query.channel === 'network' ? 'network' : 'worldwide';
  const [data, rate] = await Promise.all([
    sms.services({
      channel,
      countryCode: req.query.country_code || req.query.countryCode,
      countrySlug: req.query.country_slug || req.query.countrySlug,
      operatorSlug: req.query.operator_slug || req.query.operatorSlug
    }),
    bxNgnRate()
  ]);
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not load SMS services right now.');
  const list = bxData(data);
  let services = (Array.isArray(list) ? list : []).map((s) => {
    const priceUsd = num(s.retailPriceUSD, s.price_usd, s.price);
    return {
      slug: s.slug ?? s.service_slug ?? s.id ?? '',
      name: stripHtml(s.name ?? s.service ?? s.slug ?? '', 120),
      availability: s.availability ?? null,
      priceUsd,
      price: applyBulnixMarkup(priceUsd, rate),
      currency: 'NGN'
    };
  }).filter((s) => s.slug);
  // Apply admin price overrides
  try {
    const overrideMap = await getOverridesMap('sms');
    services = services.map((item) => {
      const override = overrideMap.get(String(item.slug));
      if (override) {
        return { ...item, price: Number(override.admin_price), adminOverridden: true };
      }
      return item;
    });
  } catch { /* ignore override errors */ }
  res.json({ status: 'success', channel, count: services.length, services });
});

router.post('/sms/order', requireAuth, async (req, res) => {
  if (!sms.configured()) {
    return res.status(503).json(bxError({ code: 'not_configured' }, 'SMS verification is being connected and will be live shortly.'));
  }

  const channel = req.body?.channel === 'network' ? 'network' : 'worldwide';
  const { countryCode, countrySlug, operatorSlug, serviceSlug } = req.body || {};
  if (!serviceSlug) return res.status(400).json({ status: 'error', message: 'A service is required.' });
  if (channel === 'worldwide' && !countryCode) return res.status(400).json({ status: 'error', message: 'A country is required.' });
  if (channel === 'network' && !(countrySlug && operatorSlug)) {
    return res.status(400).json({ status: 'error', message: 'A country and network operator are required.' });
  }

  // 1) Live price from the services list (price-lock source).
  const rate = await bxNgnRate();
  const svcRes = await sms.services({ channel, countryCode, countrySlug, operatorSlug });
  if (!isBxSuccess(svcRes)) return sendProviderError(res, svcRes, 'Could not verify pricing. Please try again.');
  const svcList = bxData(svcRes);
  const svc = (Array.isArray(svcList) ? svcList : []).find((s) => String(s.slug ?? s.service_slug) === String(serviceSlug));
  if (!svc) return res.status(409).json({ status: 'error', message: 'That service is no longer available. Please refresh.' });
  const priceUsd = num(svc.retailPriceUSD, svc.price_usd, svc.price);
  let price = applyBulnixMarkup(priceUsd, rate);
  // Admin price overrides also apply at purchase time, not just in the catalog.
  try {
    const overrideMap = await getOverridesMap('sms');
    const override = overrideMap.get(String(serviceSlug));
    if (override) price = Number(override.admin_price);
  } catch { /* ignore override errors */ }
  if (price <= 0) return res.status(502).json({ status: 'error', message: 'This service is not currently priced.' });

  // 2) Reserve funds.
  const purchaseRef = generateReference();
  const debit = await debitWallet(req.user.id, {
    amount: price,
    reference: purchaseRef,
    meta: { type: 'bulnix_sms', channel, serviceSlug, provider: 'bulnix' }
  });
  if (!debit.ok) return res.status(402).json({ status: 'error', message: 'Insufficient wallet balance. Please fund your wallet first.' });

  // 3) Activate the number (price-locked).
  const placed = await sms.order({
    channel, countryCode, countrySlug, operatorSlug, serviceSlug,
    expectedRetailPriceUsd: priceUsd,
    idempotencyKey: bxIdempotencyKey('sms')
  });
  if (!isBxSuccess(placed)) {
    await creditWallet(req.user.id, {
      amount: price,
      reference: `${purchaseRef}-refund`,
      meta: { type: 'bulnix_sms_refund', reason: bxError(placed).code, provider: 'bulnix' }
    });
    const reason = bxError(placed).message;
    notify.failure(req.user.id, { type: 'virtual_number', service: serviceSlug, price }, reason);
    return sendProviderError(res, placed, reason);
  }

  // 4) Persist a virtual_number order (code arrives via status polling).
  const body = bxData(placed) || {};
  const providerOrderId = providerOrderIdOf(body);
  const user = await findById(req.user.id);
  const now = Date.now();
  const order = {
    id: genId(),
    type: 'virtual_number',
    provider: 'bulnix',
    order_ref: providerOrderId ? String(providerOrderId) : purchaseRef,
    provider_order: providerOrderId ? String(providerOrderId) : null,
    channel,
    number: body.number ?? body.phone ?? body.phone_number ?? '',
    server: 'bulnix',
    country: countryCode || countrySlug || '',
    service: stripHtml(svc.name ?? serviceSlug, 120),
    service_slug: serviceSlug,
    price,
    currency: 'NGN',
    status: 'pending',
    sms: '',
    purchasedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + NUMBER_EXPIRY_MS).toISOString()
  };
  await addUserOrder(req.user.id, order);
  await recordSale({
    id: order.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    type: 'virtual_number',
    productId: `bulnix-sms-${serviceSlug}`,
    productName: order.service,
    price,
    currency: 'NGN',
    status: 'pending',
    createdAt: order.purchasedAt
  });

  res.status(201).json({ status: 'success', message: 'Number activated', order, balance: debit.balance });
});

router.get('/sms/order/:id', requireAuth, async (req, res) => {
  const channel = req.query.channel === 'network' ? 'network' : 'worldwide';
  const data = await sms.status(req.params.id, { channel });
  if (!isBxSuccess(data)) return sendProviderError(res, data, 'Could not check this verification.');
  const body = bxData(data) || {};
  res.json({
    status: 'success',
    order: body,
    number: body.number ?? body.phone ?? body.phone_number ?? '',
    code: body.code ?? body.sms ?? body.message ?? '',
    order_status: body.status ?? body.state ?? 'pending'
  });
});

export default router;
