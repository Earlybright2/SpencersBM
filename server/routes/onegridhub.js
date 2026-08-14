import { Router } from 'express';
import { requireAdmin } from '../utils/auth.js';
import { ogRequest, isOgSuccess, ogError, asyncRoute } from '../utils/onegridhub.js';

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

export default router;