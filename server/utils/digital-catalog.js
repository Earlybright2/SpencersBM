import { ogDigitalProducts } from './onegridhub.js';

// OneGridHub's digital (social media account) products do not expose a country
// field — the country (and platform) is embedded in the product name/category.
// These rules normalise each raw product into { platform, country, countryName }.

const PLATFORM_RULES = [
  { platform: 'Instagram', patterns: [/instagram/i, /instantgram/i, /\big account/i, /\big accounts/i, /\big\b/i, /^ig\b/] },
  { platform: 'Facebook', patterns: [/facebook/i, /\bfb\b/i, /\bfb[ (,_-]/i, /fb account/i, /\bfb$/i] },
  { platform: 'Twitter/X', patterns: [/twitter/i, /twitter\(x\)/i, /\btwitter\b.*\(x\)/i, /\(\s*x\s*\)/i, /\bx\.com\b/i, /\b x\b/i] },
  { platform: 'TikTok', patterns: [/tiktok/i, /tik[\s-]*tok/i, /toktok/i] },
  { platform: 'Gmail', patterns: [/gmail/i] },
  { platform: 'WhatsApp', patterns: [/whatsapp/i, /whats app/i] },
  { platform: 'Telegram', patterns: [/telegram/i] },
  { platform: 'Snapchat', patterns: [/snapchat/i, /snap chat/i] },
  { platform: 'Discord', patterns: [/discord/i] },
  { platform: 'LinkedIn', patterns: [/linkedin/i, /linked in/i] },
  { platform: 'Threads', patterns: [/threads/i] },
  { platform: 'Pinterest', patterns: [/pinterest/i] },
  { platform: 'YouTube', patterns: [/youtube/i, /you tube/i] },
  { platform: 'Reddit', patterns: [/reddit/i] },
  { platform: 'Quora', patterns: [/quora/i] },
  { platform: 'Netflix', patterns: [/netflix/i] },
  { platform: 'Amazon', patterns: [/amazon/i] },
  { platform: 'CashApp', patterns: [/cashapp/i, /cash app/i] },
  { platform: 'Binance', patterns: [/binance/i] },
  { platform: 'Roblox', patterns: [/roblox/i] },
  { platform: 'Spotify', patterns: [/spotify/i] },
  { platform: 'Steam', patterns: [/steam/i] },
  { platform: 'Twitch', patterns: [/twitch/i] },
  { platform: 'Yahoo', patterns: [/yahoo/i] },
  { platform: 'Proton', patterns: [/protonmail/i, /proton mail/i] },
  { platform: 'Hotmail', patterns: [/hotmail/i] },
  { platform: 'Outlook', patterns: [/outlook/i] },
  { platform: 'Apple', patterns: [/apple id/i, /appleid/i, /\bapple\b/i] },
  { platform: 'Google Voice', patterns: [/google voice/i] },
  { platform: 'Google Ads', patterns: [/google ads/i, /googleads/i] },
  { platform: 'CapCut', patterns: [/capcut/i, /cap cut/i] },
  { platform: 'Etsy', patterns: [/etsy/i] },
  { platform: 'Trustpilot', patterns: [/trustpilot/i, /trust pilot/i] }
];

// Order matters: specific countries are checked before region buckets.
const COUNTRY_RULES = [
  { country: 'USA', countryName: 'USA', patterns: [/\busa\b/i, /united states/i, /american/i, /america/i, /🇺🇸/] },
  { country: 'UK', countryName: 'United Kingdom', patterns: [/\buk\b/i, /united kingdom/i, /britain/i, /british/i, /england/i, /🇬🇧/] },
  { country: 'Canada', countryName: 'Canada', patterns: [/canada/i, /canadian/i, /🇨🇦/] },
  { country: 'Germany', countryName: 'Germany', patterns: [/germany/i, /\bgerman\b/i, /🇩🇪/] },
  { country: 'France', countryName: 'France', patterns: [/france/i, /\bfrench\b/i, /🇫🇷/] },
  { country: 'Belgium', countryName: 'Belgium', patterns: [/belgium/i, /belgiu/i, /belg\b/i, /🇧🇪/] },
  { country: 'Spain', countryName: 'Spain', patterns: [/spain/i, /spanish/i, /🇪🇸/] },
  { country: 'Brazil', countryName: 'Brazil', patterns: [/brazil/i, /brazilian/i, /🇧🇷/] },
  { country: 'Philippines', countryName: 'Philippines', patterns: [/philippine/i, /🇵🇭/] },
  { country: 'Singapore', countryName: 'Singapore', patterns: [/singapore/i, /🇸🇬/] },
  { country: 'Thailand', countryName: 'Thailand', patterns: [/thailand/i, /🇹🇭/] },
  { country: 'Mexico', countryName: 'Mexico', patterns: [/mexico/i, /mexican/i, /🇲🇽/] },
  { country: 'Indonesia', countryName: 'Indonesia', patterns: [/indonesia/i, /indonesian/i, /🇮🇩/] },
  { country: 'Australia', countryName: 'Australia', patterns: [/australia/i, /australian/i, /🇦🇺/] },
  { country: 'Netherlands', countryName: 'Netherlands', patterns: [/netherlands/i, /holland/i, /🇳🇱/] },
  { country: 'Italy', countryName: 'Italy', patterns: [/italy/i, /italian/i, /\bitly\b/i, /🇮🇹/] },
  { country: 'Poland', countryName: 'Poland', patterns: [/poland/i, /\bpolish\b/i, /🇵🇱/] },
  { country: 'Austria', countryName: 'Austria', patterns: [/austria/i, /🇦🇹/] },
  { country: 'Switzerland', countryName: 'Switzerland', patterns: [/switzerland/i, /\bswiss\b/i, /🇨🇭/] },
  { country: 'Czech', countryName: 'Czech Republic', patterns: [/czech/i, /🇨🇿/] },
  { country: 'Bulgaria', countryName: 'Bulgaria', patterns: [/bulgaria/i, /🇧🇬/] },
  { country: 'Russia', countryName: 'Russia', patterns: [/russia/i, /russian/i, /🇷🇺/] },
  { country: 'India', countryName: 'India', patterns: [/\bindia\b/i, /\bindian\b/i, /🇮🇳/] },
  { country: 'Nigeria', countryName: 'Nigeria', patterns: [/nigeria/i, /🇳🇬/] },
  { country: 'Ghana', countryName: 'Ghana', patterns: [/ghana/i, /🇬🇭/] },
  { country: 'Kenya', countryName: 'Kenya', patterns: [/kenya/i, /🇰🇪/] },
  { country: 'Europe', countryName: 'Europe (Mixed)', patterns: [/europe/i, /european/i, /eu mixed/i, /\beu\b/i] },
  { country: 'Asia', countryName: 'Asia (Mixed)', patterns: [/asia/i, /asian/i] },
  { country: 'Mixed', countryName: 'Mixed / Global', patterns: [/mixed country/i, /random country/i, /random countries/i, /mixed/i, /global/i, /worldwide/i] }
];

const GLOBAL_NAME = 'Mixed / Global';

function detectPlatform(name, category) {
  const text = `${category || ''} ${name || ''}`;
  if (category) {
    for (const rule of PLATFORM_RULES) {
      if (category.toLowerCase().includes(rule.platform.toLowerCase())) return rule.platform;
    }
  }
  for (const rule of PLATFORM_RULES) {
    if (rule.patterns.some((re) => re.test(name))) return rule.platform;
  }
  return '';
}

function detectCountry(name) {
  for (const rule of COUNTRY_RULES) {
    if (rule.patterns.some((re) => re.test(name))) return { country: rule.country, countryName: rule.countryName };
  }
  return { country: 'Mixed', countryName: GLOBAL_NAME };
}

export function normalizeDigitalProduct(raw) {
  const name = raw?.name || raw?.title || raw?.product_name || '';
  const category = raw?.category || '';
  const platform = detectPlatform(name, category);
  const { country, countryName } = detectCountry(name);
  return {
    id: raw?.product || raw?.id || raw?.product_id || raw?.pid || raw?.sku || '',
    platform: platform || 'Other',
    country,
    countryName,
    name,
    category,
    cost: Number(raw?.price) || 0,
    stock: Number(raw?.stock ?? raw?.quantity ?? raw?.available ?? 0) || 0,
    delivery: raw?.delivery || ''
  };
}

// ----- Caching so the admin UI doesn't hammer the provider -----

const CACHE_TTL_MS = Number(process.env.DIGITAL_CACHE_TTL) || 60000;
const cache = new Map();

async function fetchAllProducts(server) {
  const now = Date.now();
  const hit = cache.get(server);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.products;

  const all = [];
  let page = 1;
  while (true) {
    const res = await ogDigitalProducts({ server, limit: 200, page });
    const list = res?.products || res?.data || res?.items || res?.list || res?.result || res?.digital_products || res?.records || [];
    if (!Array.isArray(list) || !list.length) break;
    all.push(...list);
    const total = Number(res?.total) || all.length;
    if (all.length >= total || page >= 20) break;
    page += 1;
  }

  cache.set(server, { at: now, products: all });
  return all;
}

// Best-effort list of the digital product servers available on this account.
export async function getDigitalServers() {
  const now = Date.now();
  const hit = cache.get('__servers__');
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.servers;

  const servers = [];
  for (let i = 1; i <= 8; i += 1) {
    const id = `server${i}`;
    try {
      const res = await ogDigitalProducts({ server: id, limit: 1 });
      const total = Number(res?.total) || 0;
      if (res?.status === 'success' && total > 0) {
        servers.push({ id, label: `OneGridHub Digital Server ${i}`, region: 'OneGridHub', products: total });
      }
    } catch {
      // unreachable server — just skip it
    }
  }

  cache.set('__servers__', { at: now, servers });
  return servers;
}

export async function getDigitalPlatforms(server) {
  const products = await fetchAllProducts(server);
  const map = new Map();
  for (const raw of products) {
    const n = normalizeDigitalProduct(raw);
    if (!n.platform) continue;
    if (!map.has(n.platform)) map.set(n.platform, 0);
    map.set(n.platform, map.get(n.platform) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// OneGridHub digital products embed the platform AND the country in a single
// product name, so we surface them as one combined "service" option — mirroring
// how virtual number services are picked in the admin panel.
export async function getDigitalServices(server) {
  const products = await fetchAllProducts(server);
  const map = new Map();
  for (const raw of products) {
    const n = normalizeDigitalProduct(raw);
    if (!n.platform || n.cost <= 0) continue;
    const key = `${n.platform}|${n.country}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        platform: n.platform,
        country: n.country,
        countryName: n.countryName,
        count: 0
      });
    }
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) =>
    `${a.platform} ${a.countryName}`.localeCompare(`${b.platform} ${b.countryName}`)
  );
}

export async function getDigitalCountries(server, platform) {
  const products = await fetchAllProducts(server);
  const map = new Map();
  for (const raw of products) {
    const n = normalizeDigitalProduct(raw);
    if (n.platform !== platform) continue;
    const key = n.country || '';
    if (!map.has(key)) map.set(key, { key, name: n.countryName, count: 0 });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Price summary + the matching provider products for a (server, platform, country).
export async function getDigitalPrice(server, platform, country) {
  const products = await fetchAllProducts(server);
  const matches = [];
  for (const raw of products) {
    const n = normalizeDigitalProduct(raw);
    if (n.platform !== platform) continue;
    if (country && n.country !== country) continue;
    if (n.cost <= 0) continue;
    matches.push({ ...n });
  }
  matches.sort((a, b) => a.cost - b.cost);

  const costs = matches.map((m) => m.cost);
  const sum = costs.reduce((a, b) => a + b, 0);
  return {
    count: matches.length,
    min: costs.length ? Math.min(...costs) : 0,
    max: costs.length ? Math.max(...costs) : 0,
    avg: costs.length ? Math.round(sum / costs.length) : 0,
    currency: 'NGN',
    products: matches.map((m) => ({
      id: m.id,
      name: m.name,
      cost: m.cost,
      stock: m.stock,
      delivery: m.delivery
    }))
  };
}

// Clear cached provider data (used after a sync so fresh data is shown).
export function clearDigitalCache(server) {
  if (server) cache.delete(server);
  else cache.clear();
}
