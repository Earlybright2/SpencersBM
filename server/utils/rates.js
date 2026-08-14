const API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

let cached = null; // { rate, fetchedAt }

function fallbackRate() {
  return Number(process.env.USD_TO_NGN_RATE) || 1500;
}

// Returns the current USD -> NGN rate. Uses a live API when reachable,
// otherwise falls back to a cached value and finally the USD_TO_NGN_RATE env.
export async function getUsdToNgnRate() {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  let fetched = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const ngn = Number(data?.rates?.NGN);
      if (ngn > 0) fetched = ngn;
    }
  } catch {
    // network failure — fall through to stale cache / env fallback
  }

  if (fetched !== null) {
    cached = { rate: fetched, fetchedAt: Date.now() };
    return fetched;
  }
  if (cached) return cached.rate;
  return fallbackRate();
}
