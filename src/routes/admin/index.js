/**
 * Admin API  →  /api/admin/*
 * Requires authenticated staff JWT (requireStaffAuth)
 */

import { Router } from 'express';
import { requireStaffAuth } from '../../middleware/auth.js';
import bootstrapRoutes from './bootstrap.js';
import usersRoutes from './users.js';
import customersRoutes from './customers.js';
import documentsRoutes from './documents.js';
import settingsRoutes from './settings.js';
import auditRoutes from './audit.js';
import contactsRoutes from './contacts.js';

const router = Router();

router.use(requireStaffAuth);
router.use(bootstrapRoutes);
router.use(usersRoutes);
router.use(customersRoutes);
router.use(documentsRoutes);
router.use(settingsRoutes);
router.use(auditRoutes);
router.use(contactsRoutes);

export default router;
