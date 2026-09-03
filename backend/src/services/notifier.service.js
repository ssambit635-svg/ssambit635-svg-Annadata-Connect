import { randomUUID } from 'node:crypto';
import { saveDb } from '../db/store.js';
import { sendSms } from './sms.service.js';

// One place that dispatches farmer notifications: in-app record + SMS.
// SMS text is concise English (SMS carrier-safe); the in-app record stays bilingual.
export function notifyFarmer(db, userId, type, messageEn, messageHi, { smsText } = {}) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  db.notifications.push({
    id: randomUUID(),
    userId,
    type,
    messageEn,
    messageHi,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();
  // Fire-and-forget: SMS failures never break the API request lifecycle.
  sendSms(db, { to: user.phone, text: smsText || truncate(`Annadata Connect: ${messageEn}`) }).catch(() => {});
}

function truncate(s) {
  return s.length > 300 ? s.slice(0, 297) + '...' : s;
}
