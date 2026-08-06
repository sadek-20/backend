/** Audit log history — manager+ */

import { Router } from 'express';
import { requireManager } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';
import { sendError } from '../../utils/safeError.js';

const router = Router();

router.get('/audit-logs', requireManager, async (_req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200`);
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
