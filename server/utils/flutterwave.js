import crypto from 'node:crypto';

const IDP_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
const BASE_URL = (process.env.FLW_BASE_URL || 'https://developersandbox-api.flutterwave.com').replace(/\/+$/, '');
const CLIENT_ID = process.env.FLW_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FLW_CLIENT_SECRET || '';
const ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY || '';
const SECRET_HASH = process.env.FLW_SECRET_HASH || '';

const TIMEOUT_MS = 15000;

let tokenCache = { accessToken: null, expiresAt: 0 };

function traceId() {
  return crypto.randomBytes(12).toString('hex');
}

async function fetchWithTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function isFlwConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && ENCRYPTION_KEY);
}

// OAuth2 client-credentials token (expires_in ~600s). Cached and refreshed
// automatically 30s before expiry so every API call stays authenticated.
export async function getAccessToken(force = false) {
  if (!force && tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 30000) {
    return tokenCache.accessToken;
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Flutterwave credentials are not configured on the server.');
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  const res = await fetchWithTimeout(IDP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok || !data.access_token) {
    throw new Error(`Flutterwave token request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 600) * 1000
  };
  return tokenCache.accessToken;
}

async function flwRequest(pathname, { method = 'GET', body, token, retryOnAuth = true } = {}) {
  const accessToken = token || (await getAccessToken());
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-Trace-Id': traceId()
  };
  const res = await fetchWithTimeout(`${BASE_URL}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text.slice(0, 200) };
  }
  const parsed = { statusCode: res.status, ...data };

  if (res.status === 401 && retryOnAuth) {
    await getAccessToken(true);
    return flwRequest(pathname, { method, body, token: tokenCache.accessToken, retryOnAuth: false });
  }
  return parsed;
}

// True when the API answered 2xx AND returned a data payload.
export function flwOk(response) {
  return Boolean(
    response &&
      response.statusCode >= 200 &&
      response.statusCode < 300 &&
      response.data
  );
}

// --- Card / PIN encryption (AES-256-GCM, 12-char alphanumeric nonce) ---

function generateNonce() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  const bytes = crypto.randomBytes(12);
  for (const b of bytes) nonce += chars[b % chars.length];
  return nonce;
}

function encryptField(value, nonce) {
  const key = Buffer.from(ENCRYPTION_KEY, 'base64');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64');
}

// Encrypts each card field with a shared nonce (as required by the v4 API).
export function encryptCard(card) {
  if (!ENCRYPTION_KEY) throw new Error('Flutterwave encryption key is not configured.');
  const nonce = generateNonce();
  return {
    nonce,
    encrypted_card_number: encryptField(card.card_number, nonce),
    encrypted_expiry_month: encryptField(card.expiry_month, nonce),
    encrypted_expiry_year: encryptField(card.expiry_year, nonce),
    encrypted_cvv: encryptField(card.cvv, nonce)
  };
}

export function encryptPin(pin) {
  const nonce = generateNonce();
  return { nonce, encrypted_pin: encryptField(pin, nonce) };
}

// --- Helpers ---

export function generateReference() {
  return `SBM${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export function getMerchantDisplayName() {
  return (process.env.FLW_MERCHANT_NAME || process.env.FLW_ACCOUNT_NAME || process.env.FLW_BUSINESS_NAME || 'Rasheed Bello').trim() || 'Rasheed Bello';
}

export function buildCustomer({ name, email, phone } = {}) {
  const parts = (name || 'Customer').trim().split(/\s+/);
  const customer = {
    name: {
      first: parts[0] || 'Customer',
      last: parts.length > 1 ? parts[parts.length - 1] : 'Customer'
    },
    email
  };
  if (parts.length > 2) {
    customer.name.middle = parts.slice(1, -1).join(' ');
  }
  if (phone) {
    let digits = String(phone).replace(/\D/g, '');
    let countryCode = '';
    if (digits.startsWith('234')) {
      countryCode = '234';
      digits = digits.slice(3);
    } else if (digits.startsWith('0')) {
      countryCode = '234';
      digits = digits.slice(1);
    } else if (digits.length === 11) {
      countryCode = '234';
      digits = digits.slice(1);
    } else if (digits.startsWith('1')) {
      countryCode = '1';
      digits = digits.slice(1);
    } else {
      countryCode = 'NG';
    }
    customer.phone = { country_code: countryCode, number: digits };
  }
  return customer;
}

// --- Charges ---

export async function initiateCharge({ amount, currency, reference, customer, paymentMethod, redirectUrl }) {
  const body = {
    amount: Number(amount),
    currency,
    reference,
    customer,
    payment_method: paymentMethod,
    redirect_url: redirectUrl
  };
  return flwRequest('/orchestration/direct-charges', { method: 'POST', body });
}

export async function updateCharge(chargeId, authorization) {
  return flwRequest(`/charges/${chargeId}`, { method: 'PUT', body: { authorization } });
}

export async function getCharge(chargeId) {
  return flwRequest(`/charges/${chargeId}`);
}

// Creates a Flutterwave customer and returns its ID (required for virtual accounts).
export async function createCustomer({ email, name }) {
  const body = { email, name: { first: 'Customer', last: 'Customer' } };
  const parts = (name || 'Customer').trim().split(/\s+/);
  if (parts[0]) body.name.first = parts[0];
  if (parts.length > 1) body.name.last = parts[parts.length - 1];
  return flwRequest('/customers', { method: 'POST', body });
}

// Update Flutterwave customer name (used to fix incorrect account names on virtual accounts).
export async function updateFlwCustomer(customerId, { name }) {
  const parts = (name || 'Customer').trim().split(/\s+/);
  const body = {
    name: {
      first: parts[0] || 'Customer',
      last: parts.length > 1 ? parts[parts.length - 1] : 'Customer'
    }
  };
  if (parts.length > 2) {
    body.name.middle = parts.slice(1, -1).join(' ');
  }
  return flwRequest(`/customers/${customerId}`, { method: 'PUT', body });
}

// Returns the existing customer ID for an email, or creates the customer.
export async function getOrCreateCustomer({ email, name }) {
  const lookup = await flwRequest(`/customers?email=${encodeURIComponent(email)}`);
  if (flwOk(lookup)) {
    const match = (lookup.data || []).find(
      (c) => String(c.email).toLowerCase() === String(email).toLowerCase()
    );
    if (match?.id) return { ok: true, customerId: match.id };
  }
  const created = await createCustomer({ email, name });
  if (flwOk(created) && created.data?.id) {
    return { ok: true, customerId: created.data.id };
  }
  return { ok: false, response: created };
}

// Creates a NGN virtual bank account for a customer. Static accounts are
// permanent (require BVN/NIN in production); dynamic accounts are generated per
// funding session and expire after use. When money is transferred to the
// account Flutterwave fires a `charge.completed` webhook.
export async function createVirtualAccount({ reference, customerId, type = 'dynamic', amount }) {
  const body = {
    type,
    account_type: type,
    reference,
    customer_id: customerId,
    currency: 'NGN'
  };
  if (amount !== undefined && amount !== null) body.amount = amount;
  return flwRequest('/virtual-accounts', { method: 'POST', body });
}

// --- Webhooks ---

export function verifyWebhookSignature(rawBody, signature) {
  if (!SECRET_HASH || !rawBody) return false;
  const expected = crypto.createHmac('sha256', SECRET_HASH).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch {
    return String(signature) === SECRET_HASH;
  }
}