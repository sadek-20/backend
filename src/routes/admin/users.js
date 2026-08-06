/** Staff users CRUD (admin panel) — admin only */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAdminOnly } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';
import { addAuditLog } from '../../utils/helpers.js';
import { mapStaffRow } from '../../utils/mappers.js';
import { sendError } from '../../utils/safeError.js';

const router = Router();

router.get('/users', requireAdminOnly, async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, username, role, full_name, is_active, created_at FROM staff_users ORDER BY full_name'
    );
    res.json(rows.map(mapStaffRow));
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/users', requireAdminOnly, async (req, res) => {
  try {
    const { username, password, role, fullName } = req.body || {};
    if (!username || !password || !role || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be manager or staff' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO staff_users (username, password_hash, role, full_name)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, role, full_name, is_active, created_at`,
      [String(username).slice(0, 100), hash, role, String(fullName).slice(0, 255)]
    );

    await addAuditLog(req.user.id, 'User Created', 'Users', `Created ${role} user ${fullName} (${username})`);
    res.status(201).json(mapStaffRow(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    sendError(res, err);
  }
});

export default router;
