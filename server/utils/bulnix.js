import crypto from 'crypto';
import { getUsdToNgnRate } from './rates.js';

/**
 * Bulnix API client (https://bulnix.com).
 *
 * Verified against the live reseller API (Sept 2026). Two families share one
 * base + one wallet but use SEPARATE `blx_` keys:
 *
 *   • Marketplace (social accounts)  → flat paths: /categories /products /orders /balance
 *   • Specialist services            → /reseller/<service>/...
 *       - sms-verification   (BULNIX_SMS_KEY)
 *       - followers-growth   (BULNIX_FOLLOWERS_KEY)
 *
 * Auth is `X-API-Key: <key>` (Bearer is rejected). Success envelope is
 * `{ success:true, data, pagination? }`; errors are `{ error:{ code, message } }`.
 *
 * Every specialist POST is price-locked: it must echo the current
 * `expected_retail_price_usd` from the browse response and carry a unique
 * `idempotency_key` (a BODY field here, not a header). Stale prices are rejected.
 *
 * Keys live in env — never hardcode. Until a service's key is present every
 * helper degrades gracefully (returns a normalized "not configured" object) so
 * the live site is never affected. Bulnix is the sole provider.
 */

const BASE_URL = (process.env.BULNIX_BASE_URL || 'https://bulnix.com/api/v1').replace(/\/+$/, '');
const CONNECT_TIMEOUT_MS = Number(process.env.BULNIX_TIMEOUT_MS) || 12000;
const RETRIES = 1;

// One key per service. Keys start with `blx_`.
const SERVICE_KEYS = {
  marketplace: () => process.env.BULNIX_MARKETPLACE_KEY || '',
  sms: () => process.env.BULNIX_SMS_KEY || '',
  followers: () => process.env.BULNIX_FOLLOWERS_KEY || ''
};

// Markup applied on top of Bulnix's USD cost, rounded up to the nearest 100 NGN.
const BULNIX_MARKUP = Number(process.env.BULNIX_MARKUP) || Number(process.env.DIGITAL_MARKUP) || 1.35;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function bxServiceKey(service) {
  const getter = SERVICE_KEYS[service];
  return getter ? getter() : '';
}

export function bxConfigured(service) {
  return Boolean(bxServiceKey(service));
}

// A no-secrets summary of which services have a key configured. Safe to return
// to the client so the UI can light up services as keys arrive.
export function bxConfiguredMap() {
  return Object.keys(SERVICE_KEYS).reduce((acc, service) => {
    acc[service] = bxConfigured(service);
    return acc;
  }, {});
}

// Fresh idempotency key. Specialist orders require one (retry-safe, so a repeated
// request never double-charges the reseller wallet).
export function bxIdempotencyKey(prefix = 'sbm') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function notConfigured(service) {
  return {
    status: 'error',
    code: 'not_configured',
    retryable: false,
    configured: false,
    message: `${service} is not connected yet. This service is being set up and will be available shortly.`
  };
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core request. Returns the parsed JSON body augmented with a non-enumerable
 * `_http` status, or a normalized error object. Never throws.
 */
export async function bxRequest({
  service,
  method = 'GET',
  path = '',
  query = {},
  body = null,
  timeoutMs = CONNECT_TIMEOUT_MS,
  retries = RETRIES
} = {}) {
  const key = bxServiceKey(service);
  if (!key) return notConfigured(service);

  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  const headers = {
    'X-API-Key': key,
    Accept: 'application/json'
  };
  if (body) headers['Content-Type'] = 'application/json';

  const init = { method, headers };
  if (body) init.body = JSON.stringify(body);

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url.toString(), init, timeoutMs);
      const text = await res.text();
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        return {
          status: 'error',
          code: 'provider_bad_response',
          retryable: res.status >= 500,
          message: `Unexpected response from Bulnix: ${text.slice(0, 120)}`,
          _http: res.status
        };
      }
      if (parsed && typeof parsed === 'object') {
        Object.defineProperty(parsed, '_http', { value: res.status, enumerable: false });
      }
      if (!res.ok || parsed?.success === false || parsed?.error) {
        // Bulnix errors nest under { error: { code, message } }.
        const perr = parsed?.error && typeof parsed.error === 'object' ? parsed.error : null;
        const code = perr?.code || parsed?.code || (res.status >= 500 ? 'provider_server_error' : 'provider_request_error');
        return {
          status: 'error',
          code,
          retryable: res.status >= 500 || code === 'SERVICE_REQUEST_FAILED',
          message:
            perr?.message ||
            parsed?.message ||
            (res.status >= 500
              ? 'Bulnix returned a server error. Please try again shortly.'
              : `Bulnix rejected the request (${res.status}).`),
          _http: res.status,
          raw: parsed
        };
      }
      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(700 * (attempt + 1));
    }
  }

  const timedOut = lastError && lastError.name === 'AbortError';
  return {
    status: 'error',
    code: 'provider_unreachable',
    retryable: true,
    message: timedOut
      ? 'Bulnix timed out. Please try again in a moment.'
      : 'Bulnix is unreachable right now. Please try again in a moment.'
  };
}

// Success when the HTTP status was 2xx and the body doesn't flag an error.
export function isBxSuccess(res) {
  if (!res || typeof res !== 'object') return false;
  if (res.status === 'error' || res.success === false || res.error) return false;
  const http = res._http;
  if (http === undefined) return res.status === 'success' || res.success === true;
  return http >= 200 && http < 300;
}

export function bxError(res, fallback = 'Bulnix request failed') {
  return {
    status: 'error',
    code: res?.code || 'provider_error',
    retryable: Boolean(res?.retryable),
    configured: res?.configured !== false,
    message: res?.message || fallback
  };
}

// Unwrap a Bulnix payload's data envelope.
export function bxData(res) {
  if (!res || typeof res !== 'object') return null;
  return res.data ?? res.result ?? res;
}

// Pagination sibling on list responses: { page, limit, total, pages }.
export function bxPagination(res) {
  const p = res?.pagination;
  if (!p || typeof p !== 'object') return null;
  return {
    page: Number(p.page) || 1,
    limit: Number(p.limit) || 0,
    total: Number(p.total) || 0,
    pages: Number(p.pages) || 1
  };
}

// ---- Pricing: Bulnix quotes in USD; we sell in NGN with markup. ----
export function applyBulnixMarkup(usdCost, ngnRate, markup = BULNIX_MARKUP) {
  const usd = Number(usdCost) || 0;
  if (usd <= 0) return 0;
  const ngn = usd * (Number(ngnRate) || 1500) * markup;
  return Math.ceil(ngn / 100) * 100;
}

export async function bxNgnRate() {
  return getUsdToNgnRate();
}

/* ============================================================
   Marketplace API (social accounts) — flat paths under /api/v1
   Reads BULNIX_MARKETPLACE_KEY.
   ============================================================ */

export const marketplace = {
  configured: () => bxConfigured('marketplace'),

  ping: () => bxRequest({ service: 'marketplace', path: '/ping' }),

  categories: () => bxRequest({ service: 'marketplace', path: '/categories' }),

  // Bulnix filters products by numeric `category_id` and free-text `search`.
  products: ({ categoryId, search, page, limit } = {}) =>
    bxRequest({
      service: 'marketplace',
      path: '/products',
      query: { category_id: categoryId, search, page, limit }
    }),

  product: (id) => bxRequest({ service: 'marketplace', path: `/products/${encodeURIComponent(id)}` }),

  // Reseller wallet balance ({ balance_usd, total_deposited_usd, total_spent_usd }).
  balance: () => bxRequest({ service: 'marketplace', path: '/balance' }),

  // One order can carry multiple line items, each with its own quantity.
  placeOrder: ({ items, productId, quantity = 1 } = {}) =>
    bxRequest({
      service: 'marketplace',
      method: 'POST',
      path: '/orders',
      body: {
        items:
          Array.isArray(items) && items.length
            ? items.map((it) => ({ product_id: it.productId ?? it.product_id, quantity: it.quantity ?? 1 }))
            : [{ product_id: productId, quantity }]
      }
    }),

  order: (orderId) => bxRequest({ service: 'marketplace', path: `/orders/${encodeURIComponent(orderId)}` }),

  orders: ({ page, limit } = {}) =>
    bxRequest({ service: 'marketplace', path: '/orders', query: { page, limit } })
};
// Back-compat alias used by earlier route code.
marketplace.orderStatus = marketplace.order;

/* ============================================================
   SMS Verification — /reseller/sms-verification/*
   Reads BULNIX_SMS_KEY. Channels: "worldwide" | "network".
   ============================================================ */

export const sms = {
  configured: () => bxConfigured('sms'),

  // Countries for a channel: [{ code, name }].
  catalog: ({ channel = 'worldwide' } = {}) =>
    bxRequest({ service: 'sms', path: '/reseller/sms-verification/catalog', query: { channel } }),

  // Services/prices. worldwide: channel,country_code · network: channel,country_slug,operator_slug
  services: ({ channel = 'worldwide', countryCode, countrySlug, operatorSlug } = {}) =>
    bxRequest({
      service: 'sms',
      path: '/reseller/sms-verification/services',
      query: {
        channel,
        country_code: countryCode,
        country_slug: countrySlug,
        operator_slug: operatorSlug
      }
    }),

  // Activate a verification number (price-locked).
  order: ({ channel = 'worldwide', countryCode, countrySlug, operatorSlug, serviceSlug, expectedRetailPriceUsd, idempotencyKey } = {}) =>
    bxRequest({
      service: 'sms',
      method: 'POST',
      path: '/reseller/sms-verification/orders',
      body: {
        channel,
        ...(countryCode ? { country_code: countryCode } : {}),
        ...(countrySlug ? { country_slug: countrySlug } : {}),
        ...(operatorSlug ? { operator_slug: operatorSlug } : {}),
        service_slug: serviceSlug,
        expected_retail_price_usd: expectedRetailPriceUsd,
        idempotency_key: idempotencyKey || bxIdempotencyKey('sms')
      }
    }),

  // Refresh number, code/message, lifecycle. `channel` is required on status.
  status: (orderId, { channel = 'worldwide' } = {}) =>
    bxRequest({
      service: 'sms',
      path: `/reseller/sms-verification/orders/${encodeURIComponent(orderId)}`,
      query: { channel }
    })
};

/* ============================================================
   Followers Growth — /reseller/followers-growth/*
   Reads BULNIX_FOLLOWERS_KEY.
   ============================================================ */

export const followers = {
  configured: () => bxConfigured('followers'),

  // Platform filters: [{ id, label, serviceCount }].
  platforms: () => bxRequest({ service: 'followers', path: '/reseller/followers-growth/platforms' }),

  // Approved growth services. platform=optional · query=optional.
  catalog: ({ platform, query } = {}) =>
    bxRequest({ service: 'followers', path: '/reseller/followers-growth/catalog', query: { platform, query } }),

  // Create one campaign (price-locked). `target` is a URL/username; qty within min..max.
  order: ({ serviceId, target, quantity, comments, expectedRetailPriceUsd, idempotencyKey } = {}) =>
    bxRequest({
      service: 'followers',
      method: 'POST',
      path: '/reseller/followers-growth/orders',
      body: {
        service_id: serviceId,
        target,
        quantity,
        ...(comments ? { comments } : {}),
        expected_retail_price_usd: expectedRetailPriceUsd,
        idempotency_key: idempotencyKey || bxIdempotencyKey('flw')
      }
    }),

  status: (orderId) =>
    bxRequest({ service: 'followers', path: `/reseller/followers-growth/orders/${encodeURIComponent(orderId)}` })
};

/**
 * Wraps an async Express handler so rejections become a clean 502 JSON response
 * instead of crashing the process.
 */
export function bxAsyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.error('[bulnix]', err);
      if (res.headersSent) return next(err);
      res.status(502).json({
        status: 'error',
        code: 'server_error',
        message: 'Something went wrong contacting Bulnix.'
      });
    });
}
