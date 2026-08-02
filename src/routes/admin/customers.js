/** Customer helpers for admin (password reset, serial numbers) */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { getNextCounter } from '../../utils/helpers.js';

const router = Router();

router.post('/customers/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const hash = await bcrypt.hash(password, 10);
    await query(`UPDATE customers SET password_hash = $1 WHERE id = $2`, [hash, req.params.id]);
    res.json({ success: true });
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
