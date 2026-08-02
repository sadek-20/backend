/** Audit log history */

import { Router } from 'express';
import { query } from '../../db/pool.js';

const router = Router();

router.get('/audit-logs', async (_req, res) => {
  const { rows } = await query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`);
  res.json(rows);
});

export default router;
