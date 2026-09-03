import { Router } from 'express';
import QRCode from 'qrcode';
import { getDb } from '../db/store.js';
import { authenticate, authorize, publicUser } from '../middleware/auth.js';
import { presentRequest } from '../utils/present.js';
import { queueSnapshot, ACTIVE_STATUSES } from '../services/queue.service.js';

const router = Router();
router.use(authenticate, authorize('farmer'));

// GET /api/farmers/me — profile plus the farmer's current active request (if any).
router.get('/me', (req, res) => {
  const db = getDb();
  const active = db.requests
    .filter((r) => r.farmerId === req.user.id && ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => b.seq - a.seq)[0];
  const village = db.villages.find((v) => v.id === req.user.villageId) || null;
  res.json({
    profile: { ...publicUser(req.user), village },
    activeRequest: active ? presentRequest(db, active) : null,
    activeQueue: active ? queueSnapshot(db, active) : null,
  });
});

// GET /api/farmers/id-card — printable Farmer ID card data (profile, crops, QR).
router.get('/id-card', async (req, res, next) => {
  try {
    const db = getDb();
    const village = db.villages.find((v) => v.id === req.user.villageId) || null;
    const cropIds = [
      ...new Set(db.requests.filter((r) => r.farmerId === req.user.id).map((r) => r.cropId)),
    ];
    const crops = cropIds
      .map((id) => db.crops.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ id: c.id, nameEn: c.nameEn, nameHi: c.nameHi }));
    // Machine-readable verification payload (any QR scanner shows it as text).
    const qrText = [
      'ANNADATA CONNECT — FARMER ID',
      `ID: ${req.user.farmerId || 'N/A'}`,
      `NAME: ${req.user.name}`,
      `MOBILE: ${req.user.phone}`,
      `VILLAGE: ${village ? village.nameEn : 'N/A'}`,
      `DISTRICT: ${req.user.district || 'Khordha'}`,
    ].join('\n');
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      width: 320, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#0f3d22', light: '#ffffff' },
    });
    res.json({
      farmerId: req.user.farmerId || null,
      name: req.user.name,
      phone: req.user.phone,
      village: village ? { nameEn: village.nameEn, nameHi: village.nameHi } : null,
      district: req.user.district || 'Khordha',
      registeredAt: req.user.createdAt || null,
      registeredBy: req.user.registeredBy || 'self',
      crops,
      qrDataUrl,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
