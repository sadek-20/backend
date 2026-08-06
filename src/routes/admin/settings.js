/** Company settings + logo (Manager+) */

import { Router } from 'express';
import multer from 'multer';
import { requireManager } from '../../middleware/auth.js';
import {
  getCompanySettings,
  updateCompanySettings,
  getStaffRevealPinStatus,
  setStaffRevealPin,
  setStaffRevealEnabled,
} from '../../services/settingsService.js';
import { uploadFile } from '../../config/supabase.js';
import { addAuditLog } from '../../utils/helpers.js';
import { buildStorageObjectPath, isAllowedUploadMime } from '../../utils/uploadSanitize.js';
import { sendError } from '../../utils/safeError.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/settings', requireManager, async (_req, res) => {
  try {
    const settings = await getCompanySettings();
    const reveal = await getStaffRevealPinStatus();
    res.json({ ...settings, staffReveal: reveal });
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/settings', requireManager, async (req, res) => {
  try {
    const settings = await updateCompanySettings(req.body || {}, req.user.id);
    await addAuditLog(req.user.id, 'Settings Updated', 'Settings', 'Updated company settings');
    const reveal = await getStaffRevealPinStatus();
    res.json({ ...settings, staffReveal: reveal });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/settings/staff-reveal-pin', requireManager, async (_req, res) => {
  try {
    res.json(await getStaffRevealPinStatus());
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/settings/staff-reveal-pin', requireManager, async (req, res) => {
  try {
    const { pin, enabled } = req.body || {};

    let status;
    if (pin != null && String(pin).trim() !== '') {
      status = await setStaffRevealPin(pin, req.user.id);
      await addAuditLog(req.user.id, 'Staff Reveal PIN Updated', 'Settings', 'Updated staff portal reveal PIN');
    } else if (typeof enabled === 'boolean') {
      status = await setStaffRevealEnabled(enabled, req.user.id);
      await addAuditLog(
        req.user.id,
        enabled ? 'Staff Reveal PIN Enabled' : 'Staff Reveal PIN Disabled',
        'Settings',
        enabled ? 'Enabled staff portal password reveal' : 'Disabled staff portal password reveal'
      );
    } else {
      return res.status(400).json({ error: 'Provide pin and/or enabled' });
    }

    res.json(status);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    sendError(res, err);
  }
});

router.post('/settings/logo', requireManager, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!isAllowedUploadMime(req.file.mimetype) || req.file.mimetype === 'application/pdf') {
      return res.status(400).json({ error: 'Logo must be an image (JPG, PNG, WEBP, GIF)' });
    }

    const objectPath = buildStorageObjectPath('company/logo', req.file.originalname);
    const result = await uploadFile('hafsa-travel', objectPath, req.file.buffer, req.file.mimetype);

    const settings = await updateCompanySettings({ logoUrl: result.path }, req.user.id);

    res.json({
      logoUrl: settings.logoUrl,
      filePath: result.path,
      previewUrl: result.previewUrl,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
