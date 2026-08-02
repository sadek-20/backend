/** Public API — no login required */

import { Router } from 'express';
import { query } from '../db/pool.js';
import { mapPackageRow } from '../utils/mappers.js';
import { getCompanySettings } from '../services/settingsService.js';

const router = Router();

router.get('/packages', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM packages WHERE status = 'active' ORDER BY created_at DESC`
    );
    res.json(rows.map(mapPackageRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !message) return res.status(400).json({ error: 'Name and message required' });

    await query(
      `INSERT INTO contact_messages (name, email, phone, message) VALUES ($1,$2,$3,$4)`,
      [name, email || null, phone || null, message]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    res.json(await getCompanySettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
