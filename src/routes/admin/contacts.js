/** Website contact messages — read-only for all staff */

import { Router } from 'express';
import { query } from '../../db/pool.js';
import { addAuditLog } from '../../utils/helpers.js';
import { mapContactRow } from '../../utils/mappers.js';
import { sendError } from '../../utils/safeError.js';

const router = Router();

router.get('/contacts', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json(rows.map(mapContactRow));
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/contacts/:id/view', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid contact id' });
    }

    const { rows } = await query('SELECT * FROM contact_messages WHERE id = $1', [id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Contact not found' });

    const who = req.user.username || `user#${req.user.id}`;
    await addAuditLog(
      req.user.id,
      'Contact Viewed',
      'Contacts',
      `${who} read message from ${row.name} (#${row.id})`
    );

    res.json(mapContactRow(row));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
