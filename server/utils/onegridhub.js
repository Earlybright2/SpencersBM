const CONNECT_TIMEOUT_MS = 12000;
const RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, { headers, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function ogRequest(params = {}) {
  const apiKey = process.env.ONEGRIDHUB_API_KEY || '';
  if (!apiKey) {
    return {
      status: 'error',
      code: 'missing_api_key',
      retryable: false,
      message: 'Numbers provider API key is not configured on the server.'
    };
  }

  const baseUrl = process.env.ONEGRIDHUB_BASE_URL || 'https://onegridhub.com/api/v1/index.php';
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set('api_key', apiKey);
  const headers = { Authorization: `Bearer ${apiKey}` };

  let lastError = null;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url.toString(), { headers, timeoutMs: CONNECT_TIMEOUT_MS });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return {
          status: 'error',
          code: 'provider_bad_response',
          retryable: true,
          message: `Unexpected response from the numbers provider: ${text.slice(0, 120)}`
        };
      }
    } catch (err) {
      lastError = err;
      if (attempt < RETRIES) {
        await sleep(700 * (attempt + 1));
      }
    }
  }

  const timedOut = lastError && lastError.name === 'AbortError';
  return {
    status: 'error',
    code: 'provider_unreachable',
    retryable: true,
    message: timedOut
      ? 'The numbers provider timed out. Please try again in a moment.'
      : 'The numbers provider is unreachable right now. Please try again in a moment.'
  };
}

export function isOgSuccess(response) {
  return response && response.status === 'success';
}

export function ogError(response, fallback = 'Provider request failed') {
  return {
    status: 'error',
    code: response?.code || 'provider_error',
    retryable: Boolean(response?.retryable),
    message: response?.message || fallback
  };
}

// ----- Digital products (pre-built social media accounts) -----

const DIGITAL_BASE_URL = process.env.ONEGRIDHUB_BASE_URL || 'https://onegridhub.com/api/v1/index.php';

function digitalUrl(params = {}) {
  const url = new URL(DIGITAL_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set('api_key', process.env.ONEGRIDHUB_API_KEY || '');
  return url.toString();
}

async function digitalFetch(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  try {
    const apiKey = process.env.ONEGRIDHUB_API_KEY || '';
    const mergedHeaders = {
      Authorization: `Bearer ${apiKey}`,
      ...init.headers
    };
    const res = await fetch(url, { ...init, headers: mergedHeaders, signal: controller.signal });
    const text = await res.text();
    // Non-2xx responses: if the body isn't JSON, surface a clear error instead
    // of trying to parse HTML/XML error pages.
    if (!res.ok) {
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* not JSON */ }
      if (parsed) return parsed; // JSON error body with useful fields
      return {
        status: 'error',
        code: res.status >= 500 ? 'provider_server_error' : 'provider_request_error',
        retryable: res.status >= 500,
        message: res.status >= 500
          ? 'The account provider returned a server error. Please try again shortly.'
          : `The account provider rejected the request (${res.status}). Please try again or choose a different option.`
      };
    }
    try {
      return JSON.parse(text);
    } catch {
      return {
        status: 'error',
        code: 'provider_bad_response',
        retryable: true,
        message: `Unexpected response from the digital products provider: ${text.slice(0, 120)}`
      };
    }
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    return {
      status: 'error',
      code: 'provider_unreachable',
      retryable: true,
      message: timedOut
        ? 'The account provider timed out. Please try again in a moment.'
        : 'The account provider is unreachable right now. Please try again in a moment.'
    };
  } finally {
    clearTimeout(timer);
  }
}

// GET list of digital products. Optional: server, category, search, page, limit.
export async function ogDigitalProducts({ server, category, search, page, limit } = {}) {
  return digitalFetch(digitalUrl({
    endpoint: 'digital_products',
    server,
    category,
    search,
    page,
    limit
  }));
}

// POST buy a digital product. Returns an order id for the purchase.
export async function ogDigitalBuy({ server, product, quantity }) {
  return digitalFetch(DIGITAL_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ONEGRIDHUB_API_KEY || ''}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      endpoint: 'digital_buy',
      server,
      product,
      quantity: String(quantity || 1),
      api_key: process.env.ONEGRIDHUB_API_KEY || ''
    }).toString()
  });
}

// GET order status / delivered account for a digital purchase.
export async function ogDigitalOrder(order) {
  return digitalFetch(digitalUrl({ endpoint: 'digital_order', order }));
}

// ----- Numeric SMS / virtual numbers helpers (kept for reference) -----

/**
 * Wraps an async Express handler so rejections are turned into a clean 502 JSON
 * response instead of crashing the process (Express 4 doesn't catch async throws).
 */
export function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch((err) => {
      console.error('[onegridhub]', err);
      if (res.headersSent) return next(err);
      res.status(502).json({
        status: 'error',
        code: 'server_error',
        message: 'Something went wrong contacting the numbers provider.'
      });
    });
}