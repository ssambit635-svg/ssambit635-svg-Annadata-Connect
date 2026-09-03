import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb, saveDb } from '../db/store.js';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications — current user's notifications, newest first.
router.get('/', (req, res) => {
  const db = getDb();
  const mine = db.notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 30);
  res.json({ notifications: mine, unreadCount: mine.filter((n) => !n.read).length });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res, next) => {
  const db = getDb();
  const n = db.notifications.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!n) return next(new ApiError(404, 'NOT_FOUND', 'Notification not found.'));
  n.read = true;
  saveDb();
  res.json({ notification: n });
});

// POST /api/notifications/read-all
router.post('/read-all', (req, res) => {
  const db = getDb();
  let changed = 0;
  for (const n of db.notifications) {
    if (n.userId === req.user.id && !n.read) {
      n.read = true;
      changed += 1;
    }
  }
  saveDb();
  res.json({ updated: changed });
});

export default router;
