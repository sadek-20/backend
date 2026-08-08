import crypto from 'crypto';
import { env } from '../config/env.js';
import { verifyStaffRevealPin } from '../services/settingsService.js';

const ALGO = 'aes-256-gcm';

/** Readable random password for new customers (no ambiguous chars) */
const PW_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function encryptionKey() {
  return crypto.createHash('sha256').update(env.jwtSecret).digest();
}

/** @deprecated Prefer generateRandomCustomerPassword for new accounts */
export function getDefaultCustomerPassword() {
  return env.defaultCustomerPassword || generateRandomCustomerPassword();
}

export function generateRandomCustomerPassword(length = 10) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PW_CHARS[bytes[i] % PW_CHARS.length];
  }
  return out;
}

export function encryptPortalPassword(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptPortalPassword(enc) {
  if (!enc) return null;
  try {
    const [ivB64, tagB64, dataB64] = enc.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

/** @deprecated Prefer verifyStaffRevealPin from settingsService */
export async function staffRevealPinValid(pin) {
  const result = await verifyStaffRevealPin(pin);
  return result.ok;
}
