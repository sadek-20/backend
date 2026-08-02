import { query } from '../db/pool.js';

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
  const { rows } = await query('SELECT id FROM company_settings WHERE id = 1');
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
}

export async function getCompanySettings() {
  await ensureCompanySettings();
  const { rows } = await query('SELECT * FROM company_settings WHERE id = 1');
  return mapSettingsRow(rows[0]);
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
      fields.push(`${column} = $${i++}`);
      values.push(updates[key]);
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
