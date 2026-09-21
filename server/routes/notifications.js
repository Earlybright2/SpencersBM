import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';
import { asyncRoute } from '../utils/http.js';
import { getNotifications, markNotificationsRead } from '../utils/store.js';

const router = Router();

router.use(requireAuth);

// GET /api/notifications — the current user's in-app notifications (newest first).
router.get('/', asyncRoute(async (req, res) => {
  const notifications = await getNotifications(req.user.id);
  const unread = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unread });
}));

// POST /api/notifications/read — mark every notification as read (called when
// the user opens the bell panel).
router.post('/read', asyncRoute(async (req, res) => {
  const notifications = await markNotificationsRead(req.user.id);
  res.json({ notifications, unread: 0 });
}));

export default router;
