/**
 * All API routes mounted here
 *
 * /api/health           → health check
 * /api/public/*         → website (packages, contact)
 * /api/admin/auth/*     → staff login
 * /api/admin/*          → hajj_umrah admin panel
 * /api/customer/auth/*  → customer login
 * /api/customer/*       → custumerSide portal
 */

import { Router } from 'express';
import { pool } from '../db/pool.js';
import publicRoutes from './public.js';
import adminAuthRoutes from './admin/auth.js';
import adminRoutes from './admin/index.js';
import customerAuthRoutes from './customer/auth.js';
import customerRoutes from './customer/index.js';

const router = Router();

router.get('/health', async (_req, res) => {
  let db = 'disconnected';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      db = 'connected';
    } catch {
      db = 'error';
    }
  }
  res.json({ status: 'ok', database: db });
});

router.use('/public', publicRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/customer/auth', customerAuthRoutes);
router.use('/customer', customerRoutes);

export default router;
