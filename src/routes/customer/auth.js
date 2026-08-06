/** POST /api/customer/auth/login — serial_number + password */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { signCustomerToken } from '../../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { serialNumber, password } = req.body || {};
    if (!serialNumber || !password) {
      return res.status(400).json({ error: 'Serial number and password required' });
    }
    if (String(serialNumber).length > 50 || String(password).length > 200) {
      return res.status(401).json({ success: false });
    }

    const { rows } = await query(`SELECT * FROM customers WHERE serial_number = $1`, [
      String(serialNumber).trim(),
    ]);

    const customer = rows[0];
    if (!customer || !(await bcrypt.compare(password, customer.password_hash))) {
      return res.status(401).json({ success: false });
    }

    const token = signCustomerToken(customer);
    res.json({ success: true, serialNumber: customer.serial_number, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
