import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { getDb, saveDb } from '../db/store.js';
import { requireEmail, requirePhone } from '../middleware/validate.js';

// Trusted, local administration only. No public endpoint can grant staff roles.
try {
  const { values } = parseArgs({ options: {
    role: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' },
    phone: { type: 'string' }, district: { type: 'string' },
    'centre-id': { type: 'string' }, 'user-id': { type: 'string' },
  } });
  if (!['officer', 'authority'].includes(values.role)) throw new Error('--role must be officer or authority');
  if (!values.name || values.name.trim().length < 2 || values.name.trim().length > 100) throw new Error('--name must be 2–100 characters');
  if (!values.email && !values.phone) throw new Error('Provide --email and/or --phone for the approved staff member');
  if (!values.district?.trim()) throw new Error('--district is required');
  const email = values.email ? requireEmail(values.email) : undefined;
  const phone = values.phone ? requirePhone(values.phone) : undefined;
  if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new Error('Use a valid Indian mobile number');
  const db = getDb();
  let user = values['user-id'] ? db.users.find((u) => u.id === values['user-id']) : null;
  if (values['user-id'] && !user) throw new Error('No account matches --user-id');
  if (user && (user.isDemo || user.role === 'farmer')) throw new Error('Do not repurpose demo or farmer accounts; provision a new staff account');
  if (db.users.some((u) => u.id !== user?.id && ((email && u.email?.toLowerCase() === email) || (phone && u.phone === phone)))) throw new Error('Email or phone already belongs to another account; no automatic merge is allowed');
  const centre = db.centres.find((c) => c.id === values['centre-id']);
  if (values.role === 'officer' && !centre) throw new Error('Officers require a valid --centre-id');
  if (centre && centre.district !== values.district.trim()) throw new Error('Centre and staff district must match');
  if (!user) { user = { id: randomUUID(), createdAt: new Date().toISOString() }; db.users.push(user); }
  // Re-provisioning invalidates former credentials; possession is verified anew.
  delete user.googleSub;
  Object.assign(user, {
    role: values.role, name: values.name.trim(), email, phone,
    district: values.district.trim(), centreId: values.role === 'officer' ? centre.id : undefined,
    emailVerified: false, phoneVerified: false, passwordHash: null,
    accessApproved: true, authDisabled: false, isDemo: false,
    registeredBy: 'administrator', approvedAt: new Date().toISOString(),
  });
  saveDb();
  console.log(`Provisioned ${user.role} account ${user.id}. They must verify their approved contact to sign in.`);
} catch (error) {
  console.error(`Account was not provisioned: ${error.message}`);
  process.exitCode = 1;
}
