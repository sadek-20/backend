import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { resolveStoragePath, isStoragePath } from '../utils/storageResolve.js';
import { env } from '../config/env.js';

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'HAFSA Travel',
  tagline: 'Hajj & Umrah Management',
  receiptFooter: 'Thank you for choosing HAFSA Travel',
  currency: 'USD',
  logoUrl: null,
  phone: '',
  email: '',
  address: '',
};

export function mapSettingsRow(row) {
  if (!row) return { ...DEFAULT_COMPANY_SETTINGS };
  return {
    companyName: row.company_name,
    tagline: row.tagline || '',
    receiptFooter: row.receipt_footer || '',
    currency: row.currency || 'USD',
    logoUrl: row.logo_url || null,
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
  };
}

export async function ensureCompanySettings() {
  await query(
    `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS staff_reveal_pin_hash TEXT`
  );
  await query(
    `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS staff_reveal_enabled BOOLEAN DEFAULT false`
  );

  const { rows } = await query('SELECT id, staff_reveal_pin_hash FROM company_settings WHERE id = 1');
  if (rows.length === 0) {
    await query(
      `INSERT INTO company_settings (id, company_name, tagline, receipt_footer, currency)
       VALUES (1, $1, $2, $3, $4)`,
      [
        DEFAULT_COMPANY_SETTINGS.companyName,
        DEFAULT_COMPANY_SETTINGS.tagline,
        DEFAULT_COMPANY_SETTINGS.receiptFooter,
        DEFAULT_COMPANY_SETTINGS.currency,
      ]
    );
  }

  // One-time seed from legacy env PIN if DB has none
  const check = await query(
    `SELECT staff_reveal_pin_hash FROM company_settings WHERE id = 1`
  );
  if (!check.rows[0]?.staff_reveal_pin_hash && env.staffRevealPin) {
    const hash = await bcrypt.hash(String(env.staffRevealPin), 10);
    await query(
      `UPDATE company_settings
       SET staff_reveal_pin_hash = $1, staff_reveal_enabled = true, updated_at = NOW()
       WHERE id = 1`,
      [hash]
    );
  }
}

export async function getCompanySettings() {
  await ensureCompanySettings();
  const { rows } = await query('SELECT * FROM company_settings WHERE id = 1');
  const mapped = mapSettingsRow(rows[0]);
  if (mapped.logoUrl && isStoragePath(mapped.logoUrl)) {
    mapped.logoUrl = (await resolveStoragePath(mapped.logoUrl)) || mapped.logoUrl;
  }
  return mapped;
}

export async function updateCompanySettings(updates, userId) {
  await ensureCompanySettings();

  const fields = [];
  const values = [];
  let i = 1;

  const mapping = {
    companyName: 'company_name',
    tagline: 'tagline',
    receiptFooter: 'receipt_footer',
    currency: 'currency',
    logoUrl: 'logo_url',
    phone: 'phone',
    email: 'email',
    address: 'address',
  };

  for (const [key, column] of Object.entries(mapping)) {
    if (updates[key] !== undefined) {
      let value = updates[key];
      if (key === 'logoUrl') {
        if (value == null || value === '') {
          value = null;
        } else if (isStoragePath(value)) {
          value = value;
        } else {
          continue;
        }
      }
      fields.push(`${column} = $${i++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getCompanySettings();

  fields.push(`updated_at = NOW()`);
  fields.push(`updated_by = $${i++}`);
  values.push(userId);

  values.push(1);
  await query(
    `UPDATE company_settings SET ${fields.join(', ')} WHERE id = $${i}`,
    values
  );

  return getCompanySettings();
}

/** Status for Settings UI — never returns the PIN itself */
export async function getStaffRevealPinStatus() {
  await ensureCompanySettings();
  const { rows } = await query(
    `SELECT staff_reveal_pin_hash, staff_reveal_enabled FROM company_settings WHERE id = 1`
  );
  const row = rows[0] || {};
  const hasPin = Boolean(row.staff_reveal_pin_hash);
  const enabled = Boolean(row.staff_reveal_enabled) && hasPin;
  return {
    hasPin,
    enabled,
    canStaffReveal: enabled && hasPin,
  };
}

export async function setStaffRevealPin(pin, userId) {
  const plain = String(pin || '').trim();
  if (plain.length < 4 || plain.length > 32) {
    const err = new Error('PIN must be 4–32 characters');
    err.status = 400;
    throw err;
  }
  await ensureCompanySettings();
  const hash = await bcrypt.hash(plain, 10);
  await query(
    `UPDATE company_settings
     SET staff_reveal_pin_hash = $1, staff_reveal_enabled = true, updated_at = NOW(), updated_by = $2
     WHERE id = 1`,
    [hash, userId]
  );
  return getStaffRevealPinStatus();
}

export async function setStaffRevealEnabled(enabled, userId) {
  await ensureCompanySettings();
  const status = await getStaffRevealPinStatus();
  if (enabled && !status.hasPin) {
    const err = new Error('Set a PIN before enabling staff reveal');
    err.status = 400;
    throw err;
  }
  await query(
    `UPDATE company_settings
     SET staff_reveal_enabled = $1, updated_at = NOW(), updated_by = $2
     WHERE id = 1`,
    [Boolean(enabled), userId]
  );
  return getStaffRevealPinStatus();
}

export async function verifyStaffRevealPin(pin) {
  await ensureCompanySettings();
  const { rows } = await query(
    `SELECT staff_reveal_pin_hash, staff_reveal_enabled FROM company_settings WHERE id = 1`
  );
  const row = rows[0];
  if (!row?.staff_reveal_enabled || !row?.staff_reveal_pin_hash) {
    return { ok: false, reason: 'Staff password reveal is disabled. Ask a manager.' };
  }
  if (!pin) {
    return { ok: false, reason: 'PIN required' };
  }
  const match = await bcrypt.compare(String(pin), row.staff_reveal_pin_hash);
  if (!match) {
    return { ok: false, reason: 'Invalid staff PIN' };
  }
  return { ok: true };
}
