import { Router } from 'express';
import { requireAdmin } from '../utils/auth.js';
import { ogRequest, isOgSuccess, ogError, asyncRoute } from '../utils/onegridhub.js';
import { syncNumbersFromProvider } from '../utils/provider-sync.js';
import { getDigitalServers, getDigitalPlatforms, getDigitalCountries, getDigitalPrice } from '../utils/digital-catalog.js';

const router = Router();

// Provider reference data for the admin panel. The merchant's OneGridHub
// balance / cost prices are never exposed to end users.
router.use(requireAdmin);

// GET /api/onegridhub/servers
router.get('/servers', asyncRoute(async (req, res) => {
  const data = await ogRequest({ endpoint: 'servers' });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/services?server=
router.get('/services', asyncRoute(async (req, res) => {
  const { server } = req.query;
  if (!server) return res.status(400).json({ message: 'server is required' });
  const data = await ogRequest({ endpoint: 'services', server });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/countries?server=
router.get('/countries', asyncRoute(async (req, res) => {
  const { server } = req.query;
  if (!server) return res.status(400).json({ message: 'server is required' });
  const data = await ogRequest({ endpoint: 'countries', server });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/price?server=&country=&service=
router.get('/price', asyncRoute(async (req, res) => {
  const { server, country, service } = req.query;
  if (!server || !country || !service) {
    return res.status(400).json({ message: 'server, country and service are required' });
  }
  const data = await ogRequest({ endpoint: 'price', server, country, service });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/balance
router.get('/balance', asyncRoute(async (req, res) => {
  const data = await ogRequest({ endpoint: 'balance' });
  if (!isOgSuccess(data)) return res.status(502).json(ogError(data));
  res.json(data);
}));

// GET /api/onegridhub/digital/servers
// Lists the OneGridHub digital (social media account) servers for this account.
router.get('/digital/servers', asyncRoute(async (req, res) => {
  const servers = await getDigitalServers();
  res.json({ status: 'success', servers });
}));

// GET /api/onegridhub/digital/platforms?server=
router.get('/digital/platforms', asyncRoute(async (req, res) => {
  const { server } = req.query;
  if (!server) return res.status(400).json({ message: 'server is required' });
  const platforms = await getDigitalPlatforms(server);
  res.json({ status: 'success', platforms });
}));

// GET /api/onegridhub/digital/countries?server=&platform=
router.get('/digital/countries', asyncRoute(async (req, res) => {
  const { server, platform } = req.query;
  if (!server || !platform) return res.status(400).json({ message: 'server and platform are required' });
  const countries = await getDigitalCountries(server, platform);
  res.json({ status: 'success', countries });
}));

// GET /api/onegridhub/digital/price?server=&platform=&country=
router.get('/digital/price', asyncRoute(async (req, res) => {
  const { server, platform, country } = req.query;
  if (!server || !platform) return res.status(400).json({ message: 'server and platform are required' });
  const price = await getDigitalPrice(server, platform, country);
  res.json({ status: 'success', server, platform, country: country || '', price });
}));

// POST /api/onegridhub/sync-numbers { server, services?, countries?, margin? }
// Populates number_products with the provider's available numbers and prices.
router.post('/sync-numbers', asyncRoute(async (req, res) => {
  const { server, services, countries, margin } = req.body || {};
  if (!server) return res.status(400).json({ message: 'server is required' });
  const results = await syncNumbersFromProvider({ server, services, countries, margin });
  res.json(results);
}));

export default router;