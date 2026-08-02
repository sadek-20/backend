import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAdminToken(user) {
  return jwt.sign(
    { type: 'admin', id: user.id, role: user.role, username: user.username },
    env.jwtSecret,
    { expiresIn: '24h' }
  );
}

export function signCustomerToken(customer) {
  return jwt.sign(
    { type: 'customer', id: customer.id, serialNumber: customer.serial_number },
    env.jwtSecret,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyToken(token);
    if (payload.type !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireCustomer(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyToken(token);
    if (payload.type !== 'customer') return res.status(403).json({ error: 'Customer access required' });

    req.customer = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireManager(req, res, next) {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}
