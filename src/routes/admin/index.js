/**
 * Admin API  →  /api/admin/*
 * Requires staff JWT (requireAdmin)
 */

import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import bootstrapRoutes from './bootstrap.js';
import usersRoutes from './users.js';
import customersRoutes from './customers.js';
import documentsRoutes from './documents.js';
import settingsRoutes from './settings.js';
import auditRoutes from './audit.js';

const router = Router();

router.use(requireAdmin);
router.use(bootstrapRoutes);
router.use(usersRoutes);
router.use(customersRoutes);
router.use(documentsRoutes);
router.use(settingsRoutes);
router.use(auditRoutes);

export default router;
