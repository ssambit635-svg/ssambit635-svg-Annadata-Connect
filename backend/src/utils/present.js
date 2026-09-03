import { publicUser } from '../middleware/auth.js';

// Shapes a request row into the API response contract documented in the API map.
export function presentRequest(db, r, { withFarmer = false, withTimeline = false } = {}) {
  const crop = db.crops.find((c) => c.id === r.cropId);
  const centre = db.centres.find((c) => c.id === r.centreId);
  const out = {
    id: r.id,
    tokenNumber: r.tokenNumber,
    status: r.status,
    quantityQuintals: r.quantityQuintals,
    crop: crop ? { id: crop.id, nameEn: crop.nameEn, nameHi: crop.nameHi, mspPerQuintal: crop.mspPerQuintal } : null,
    estimatedValueInr: crop ? Math.round(crop.mspPerQuintal * r.quantityQuintals * 100) / 100 : null,
    centre: centre ? { id: centre.id, nameEn: centre.nameEn, nameHi: centre.nameHi, district: centre.district, address: centre.address, status: centre.status } : null,
    note: r.note || '',
    payment: r.payment || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
  if (withFarmer) {
    const farmer = db.users.find((u) => u.id === r.farmerId);
    out.farmer = publicUser(farmer);
  }
  if (withTimeline) out.timeline = r.timeline;
  return out;
}

export function presentCentre(db, c) {
  return {
    id: c.id,
    nameEn: c.nameEn,
    nameHi: c.nameHi,
    district: c.district,
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    capacityQuintals: c.capacityQuintals,
    currentStockQuintals: c.currentStockQuintals,
    capacityPct: Math.round((c.currentStockQuintals / c.capacityQuintals) * 100),
    avgProcessingMinutesPerFarmer: c.avgProcessingMinutesPerFarmer,
    status: c.status,
    operatingHours: c.operatingHours,
  };
}
