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

function extractBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Any authenticated staff (admin | manager | staff). Legacy alias: requireAdmin */
export function requireStaffAuth(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyToken(token);
    if (payload.type !== 'admin') {
      return res.status(403).json({ error: 'Staff access required' });
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** @deprecated Use requireStaffAuth — kept so existing imports keep working */
export const requireAdmin = requireStaffAuth;

export function requireCustomer(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyToken(token);
    if (payload.type !== 'customer') {
      return res.status(403).json({ error: 'Customer access required' });
    }

    req.customer = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** admin or manager */
export function requireManager(req, res, next) {
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}

export const requireManagerPlus = requireManager;

/** admin only */
export function requireAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
