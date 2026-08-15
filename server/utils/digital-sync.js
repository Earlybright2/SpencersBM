import { ogDigitalProducts } from './onegridhub.js';
import { pool } from './db.js';

const genId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Auto-markup applied on top of the provider's cost when computing the sell price.
const MARKUP = Number(process.env.DIGITAL_MARKUP) || 1.35;

// Best-effort extraction of a product's cost (provider price) from various
// response shapes, since the exact OneGridHub digital product schema may vary.
function extractPrice(raw) {
  if (raw == null) return 0;
  const candidates = [
    raw.price, raw.sell_price, raw.cost, raw.amount, raw.fee, raw.rate,
    raw.Price, raw.price_ngn, raw.usd_price, raw.total_price
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Best-effort extraction of the product's display name.
function extractName(raw) {
  if (raw == null) return '';
  return raw.name || raw.title || raw.product_name || raw.platform || raw.category || raw.item || '';
}

// Best-effort extraction of the product id.
function extractProductId(raw) {
  if (raw == null) return '';
  return raw.id || raw.product_id || raw.product || raw.pid || raw.sku || String(raw.productId || '');
}

// Best-effort extraction of available stock.
function extractStock(raw) {
  if (raw == null) return 0;
  const n = Number(raw.stock ?? raw.quantity ?? raw.available ?? raw.stock_qty ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// OneGridHub may return the product list under different keys or nested shapes.
function getProductList(data) {
  if (!data) return [];
  const direct = data.products || data.data || data.items || data.list || data.result || data.digital_products || data.records;
  if (Array.isArray(direct)) return direct;
  // Nested one level deep (e.g. { data: { products: [...] } }).
  if (direct && typeof direct === 'object') {
    for (const v of Object.values(direct)) {
      if (Array.isArray(v)) return v;
    }
  }
  // data could be an object keyed by product ids.
  if (data.data && typeof data.data === 'object') {
    return Object.values(data.data);
  }
  return [];
}

// Sync digital (social media account) products for a server from OneGridHub.
//   server:    provider server id (e.g. "server6")
//   category:  optional category name to filter the provider listing
//   search:    optional free-text filter passed to the provider
//   margin:    markup factor on top of provider cost (default from DIGITAL_MARKUP)
export async function syncDigitalProducts({ server, category, search, margin = MARKUP }) {
  if (!server) throw new Error('server is required');

  const page = 1;
  const limit = 200;
  const all = [];
  let fetched = 0;
  let keepGoing = true;

  while (keepGoing) {
    const res = await ogDigitalProducts({ server, category, search, page, limit });
    const list = getProductList(res);
    if (!list.length) {
      console.warn('[digital-sync] no products found in provider response:', JSON.stringify(res).slice(0, 800));
      break;
    }

    all.push(...list);
    fetched = list.length;
    keepGoing = fetched >= limit;
  }

  const results = { server, created: 0, updated: 0, skipped: 0, items: [] };

  for (const raw of all) {
    const cost = extractPrice(raw);
    if (!cost || cost <= 0) {
      results.skipped += 1;
      continue;
    }

    const providerProductId = extractProductId(raw);
    const name = extractName(raw) || providerProductId;
    const categoryName = raw.category || category || '';
    const stock = extractStock(raw);
    const sell = Math.ceil((cost * margin) / 100) * 100;

    const existing = await pool.query(
      'SELECT id FROM account_products WHERE provider_product_id = $1 AND provider_server = $2',
      [providerProductId, server]
    );

    if (existing.rows[0]) {
      await pool.query(
        `UPDATE account_products
         SET price = $1, description = $2, stock = $3, provider_category = $4, enabled = true
         WHERE id = $5`,
        [sell, categoryName, stock, categoryName, existing.rows[0].id]
      );
      results.updated += 1;
    } else {
      await pool.query(
        `INSERT INTO account_products
           (id, platform, price, currency, description, enabled, inventory,
            provider_server, provider_product_id, provider_category, stock, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          genId('ap'),
          name,
          sell,
          'NGN',
          categoryName,
          true,
          '[]',
          server,
          providerProductId,
          categoryName,
          stock,
          new Date().toISOString()
        ]
      );
      results.created += 1;
    }

    results.items.push({
      id: providerProductId,
      platform: name,
      category: categoryName,
      cost,
      sell,
      stock
    });
  }

  return results;
}
