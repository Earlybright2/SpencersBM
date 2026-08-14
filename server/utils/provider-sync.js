import { ogRequest, isOgSuccess } from './onegridhub.js';
import { pool } from './db.js';

const genId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Auto-markup applied on top of the provider's cost when computing the sell price.
const MARKUP = Number(process.env.NUMBER_MARKUP) || 1.35;

// When no explicit service list is given, only services whose name matches one of
// these popular platforms are synced (keeps the marketplace tidy).
const POPULAR_KEYWORDS = [
  'whatsapp', 'telegram', 'google', 'facebook', 'instagram', 'tiktok',
  'snapchat', 'discord', 'amazon', 'twitter', 'x.com', 'gmail', 'tinder',
  'bumble', 'linkedin', 'netflix', 'paypal', 'cashapp', 'binance', 'coinbase',
  'youtube', 'signal', 'line', 'viber', 'imo', 'bigo', 'onlyfans', 'textnow'
];

function isPopular(service) {
  const raw = String(service.name || service.id || '').toLowerCase();
  const id = String(service.id || '').toLowerCase();
  if (/_(du|canada|co|sm|re|messenger|chat)$/.test(id)) return false;
  const name = raw.replace(/[\s-]/g, '');
  if (['googlechat', 'googlemessenger', 'signalhire', 'linemessenger'].includes(name)) return false;
  if (name.endsWith('_du') || name.endsWith('_canada') || name.endsWith('_co') || name.endsWith('_sm')) return false;
  return POPULAR_KEYWORDS.some((k) => raw.includes(k));
}

// Run `fn` over `items` with a fixed number of concurrent workers.
async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx;
      idx += 1;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// Sync number products for a server from OneGridHub.
//   server:    provider server id (e.g. "usa1", "all1")
//   services:  optional [{ id, name }] list to sync. Defaults to the popular
//              subset of the server's actual service list.
//   countries: optional array of country ids. Defaults to all countries for the server.
//   margin:    markup factor on top of provider cost (default from NUMBER_MARKUP).
export async function syncNumbersFromProvider({ server, services = null, countries = null, margin = MARKUP }) {
  const countriesRes = await ogRequest({ endpoint: 'countries', server });
  if (!isOgSuccess(countriesRes)) {
    throw new Error(countriesRes.message || 'Could not fetch countries for this server');
  }
  const allCountries = countriesRes.countries || [];
  const selectedCountries = countries
    ? allCountries.filter((c) => countries.includes(c.id))
    : allCountries;
  if (selectedCountries.length === 0) {
    throw new Error('No countries matched for this server');
  }

  let serviceList = services;
  if (!serviceList) {
    const servicesRes = await ogRequest({ endpoint: 'services', server });
    if (!isOgSuccess(servicesRes) || !Array.isArray(servicesRes.services)) {
      throw new Error(servicesRes.message || 'Could not fetch services for this server');
    }
    serviceList = servicesRes.services.filter(isPopular);
  }

  const combos = [];
  for (const service of serviceList) {
    for (const country of selectedCountries) {
      combos.push({ service, country });
    }
  }

  const results = { server, created: 0, updated: 0, skipped: 0, items: [] };
  const concurrency = Number(process.env.SYNC_CONCURRENCY) || 5;

  await mapConcurrent(combos, concurrency, async ({ service, country }) => {
    let priceRes;
    try {
      priceRes = await ogRequest({ endpoint: 'price', server, country: country.id, service: service.id });
    } catch {
      results.skipped += 1;
      return;
    }
    if (!isOgSuccess(priceRes)) {
      results.skipped += 1;
      return;
    }
    const cost = Number(priceRes.price);
    if (!cost || cost <= 0) {
      results.skipped += 1;
      return;
    }

    const sell = Math.ceil((cost * margin) / 100) * 100;
    const existing = await pool.query(
      'SELECT id FROM number_products WHERE server = $1 AND country = $2 AND service = $3',
      [server, country.id, service.id]
    );

    if (existing.rows[0]) {
      await pool.query(
        'UPDATE number_products SET price = $1, service_name = $2, country_name = $3, enabled = true WHERE id = $4',
        [sell, service.name, country.name, existing.rows[0].id]
      );
      results.updated += 1;
    } else {
      await pool.query(
        `INSERT INTO number_products (id, server, country, country_name, service, service_name, price, currency, enabled, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [genId('np'), server, country.id, country.name, service.id, service.name, sell, 'NGN', true, new Date().toISOString()]
      );
      results.created += 1;
    }

    results.items.push({
      server,
      country: country.id,
      countryName: country.name,
      service: service.id,
      serviceName: service.name,
      cost,
      sell
    });
  });

  return results;
}