import { Router } from 'express';
import { getDb } from '../db/store.js';
import { authenticate } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { summary } from '../services/queue.service.js';
import { presentCentre } from '../utils/present.js';

const router = Router();
router.use(authenticate);

// GET /api/centres — readable list with live queue/storage summary.
router.get('/', (req, res) => {
  const db = getDb();
  res.json({
    centres: db.centres.map((c) => ({
      ...presentCentre(db, c),
      queue: summary(db, c.id),
    })),
  });
});

router.get('/:id', (req, res, next) => {
  const db = getDb();
  const centre = db.centres.find((c) => c.id === req.params.id);
  if (!centre) return next(new ApiError(404, 'NOT_FOUND', 'Procurement centre not found.'));
  res.json({ centre: { ...presentCentre(db, centre), queue: summary(db, centre.id) } });
});

export default router;
