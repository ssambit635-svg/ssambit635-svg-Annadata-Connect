import { randomUUID } from 'node:crypto';
import config from '../config.js';
import { saveDb } from '../db/store.js';

/**
 * SMS provider layer.
 *
 * Providers (selected by SMS_PROVIDER):
 *   sim    → default. Records every SMS in the SMS outbox (visible on the
 *            officer dashboard) and logs to console. Zero external calls.
 *   msg91  → real transactional SMS via MSG91 (India). Needs a live account,
 *            an auth key, a 6-char sender id, and DLT-approved templates.
 *   twilio → real SMS via Twilio REST API.
 *   none   → SMS disabled entirely (no outbox entries).
 *
 * SMS delivery never blocks or breaks the API: dispatch is fire-and-forget.
 */
export async function sendSms(db, { to, text }) {
  // Email/Google farmers may not have linked a mobile number yet.
  if (!to) return null;
  const entry = {
    id: randomUUID(),
    to,
    text,
    provider: config.smsProvider,
    status: 'QUEUED',
    detail: '',
    createdAt: new Date().toISOString(),
  };
  db.smsLog.push(entry);
  saveDb();

  try {
    if (config.smsProvider === 'msg91') {
      await sendViaMsg91(to, text);
      entry.status = 'SENT';
    } else if (config.smsProvider === 'twilio') {
      await sendViaTwilio(to, text);
      entry.status = 'SENT';
    } else if (config.smsProvider === 'sim') {
      entry.status = 'SIMULATED';
      console.log(`[SMS:sim] → ${to}: ${text}`);
    } else {
      entry.status = 'SKIPPED';
    }
  } catch (err) {
    entry.status = 'FAILED';
    entry.detail = String(err.message || err).slice(0, 200);
    console.error(`[SMS] delivery to ${to} failed:`, err.message);
  }
  saveDb();
  return entry;
}

// --- MSG91 (India). Transactional route, 91 country prefix. -----------------
async function sendViaMsg91(to, text) {
  if (!config.smsMsg91AuthKey) throw new Error('SMS_MSG91_AUTH_KEY is not configured');
  const params = new URLSearchParams({
    authkey: config.smsMsg91AuthKey,
    sender: config.smsMsg91SenderId,
    route: '4', // transactional
    country: '91',
    mobiles: `91${to}`,
    message: text,
  });
  const res = await fetch(`https://api.msg91.com/api/sendhttp.php?${params}`, { method: 'POST' });
  const body = await res.text();
  if (!res.ok) throw new Error(`MSG91 HTTP ${res.status}: ${body.slice(0, 120)}`);
}

// --- Twilio. Basic-auth REST call with form body. ---------------------------
async function sendViaTwilio(to, text) {
  if (!(config.smsTwilioSid && config.smsTwilioToken && config.smsTwilioFrom)) {
    throw new Error('Twilio credentials are not fully configured');
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.smsTwilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${config.smsTwilioSid}:${config.smsTwilioToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: `+91${to}`, From: config.smsTwilioFrom, Body: text }),
  });
  if (!res.ok) throw new Error(`Twilio HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
}
