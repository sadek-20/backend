/** Customer helpers for admin (password reset, serial numbers, portal credentials) */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { getNextCounter } from '../../utils/helpers.js';
import {
  encryptPortalPassword,
  decryptPortalPassword,
  getDefaultCustomerPassword,
  staffRevealPinValid,
} from '../../utils/portalPassword.js';

const router = Router();

function canViewWithoutPin(role) {
  return role === 'admin' || role === 'manager';
}

async function getCustomerRow(id) {
  const { rows } = await query(
    `SELECT id, serial_number, portal_password_enc FROM customers WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

function resolvePlainPassword(row) {
  const decrypted = decryptPortalPassword(row.portal_password_enc);
  return decrypted || getDefaultCustomerPassword();
}

router.get('/customers/:id/portal-credentials', async (req, res) => {
  try {
    const customer = await getCustomerRow(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const payload = {
      serialNumber: customer.serial_number,
      masked: true,
      canReveal: true,
    };

    if (canViewWithoutPin(req.user.role)) {
      payload.password = resolvePlainPassword(customer);
      payload.masked = false;
      payload.revealed = true;
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customers/:id/reveal-password', async (req, res) => {
  try {
    const customer = await getCustomerRow(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (!canViewWithoutPin(req.user.role)) {
      const { pin } = req.body || {};
      if (!staffRevealPinValid(pin)) {
        return res.status(403).json({ error: 'Invalid staff PIN' });
      }
    }

    res.json({
      serialNumber: customer.serial_number,
      password: resolvePlainPassword(customer),
      revealed: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customers/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const hash = await bcrypt.hash(password, 10);
    const enc = encryptPortalPassword(password);
    await query(
      `UPDATE customers SET password_hash = $1, portal_password_enc = $2 WHERE id = $3`,
      [hash, enc, req.params.id]
    );
    res.json({ success: true, password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customers/generate-serial', async (_req, res) => {
  const num = await getNextCounter('serialNumber');
  const year = new Date().getFullYear();
  res.json({ serialNumber: `HT-${year}-${String(num).padStart(4, '0')}` });
});

export default router;
