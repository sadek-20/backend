/** POST /api/admin/auth/login — staff / manager / admin */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { signAdminToken } from '../../middleware/auth.js';
import { mapStaffRow } from '../../utils/mappers.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (String(username).length > 100 || String(password).length > 200) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { rows } = await query(
      `SELECT * FROM staff_users WHERE LOWER(username) = LOWER($1) AND is_active = true`,
      [String(username).trim()]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const safeUser = mapStaffRow(user);
    delete safeUser.isActive;
    delete safeUser.createdAt;

    const token = signAdminToken(safeUser);
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
