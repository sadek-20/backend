/**
 * Customer API  →  /api/customer/*
 * Requires customer JWT
 */

import { Router } from 'express';
import dashboardRoutes from './dashboard.js';

const router = Router();
router.use(dashboardRoutes);

export default router;
