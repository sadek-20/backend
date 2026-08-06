/** Customer helpers for admin (password reset, serial numbers, portal credentials) */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { getNextCounter } from '../../utils/helpers.js';
import {
  encryptPortalPassword,
  decryptPortalPassword,
  getDefaultCustomerPassword,
} from '../../utils/portalPassword.js';
import {
  getStaffRevealPinStatus,
  verifyStaffRevealPin,
} from '../../services/settingsService.js';

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

    const revealStatus = await getStaffRevealPinStatus();
    const payload = {
      serialNumber: customer.serial_number,
      masked: true,
      canReveal: canViewWithoutPin(req.user.role) || revealStatus.canStaffReveal,
      staffRevealEnabled: revealStatus.enabled,
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
      const check = await verifyStaffRevealPin(pin);
      if (!check.ok) {
        return res.status(403).json({ error: check.reason || 'Invalid staff PIN' });
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
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Manager access required' });
    }
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(password, 10);
    const enc = encryptPortalPassword(password);
    await query(
      `UPDATE customers SET password_hash = $1, portal_password_enc = $2 WHERE id = $3`,
      [hash, enc, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/customers/generate-serial', async (_req, res) => {
  const num = await getNextCounter('serialNumber');
  const year = new Date().getFullYear();
  res.json({ serialNumber: `HT-${year}-${String(num).padStart(4, '0')}` });
});

export default router;
