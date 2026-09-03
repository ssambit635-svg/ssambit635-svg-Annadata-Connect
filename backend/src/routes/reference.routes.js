import { Router } from 'express';
import { getDb } from '../db/store.js';

// Public reference data used by the registration and request forms.
const router = Router();

router.get('/crops', (req, res) => {
  res.json({ crops: getDb().crops });
});

router.get('/villages', (req, res) => {
  res.json({
    villages: getDb().villages.map(({ id, nameEn, nameHi }) => ({ id, nameEn, nameHi })),
  });
});

export default router;
