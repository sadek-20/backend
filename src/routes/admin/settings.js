/** Company settings + logo (Manager+) */

import { Router } from 'express';
import multer from 'multer';
import { requireManager } from '../../middleware/auth.js';
import { getCompanySettings, updateCompanySettings } from '../../services/settingsService.js';
import { uploadFile } from '../../config/supabase.js';
import { addAuditLog } from '../../utils/helpers.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/settings', requireManager, async (_req, res) => {
  try {
    res.json(await getCompanySettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', requireManager, async (req, res) => {
  try {
    const settings = await updateCompanySettings(req.body, req.user.id);
    await addAuditLog(req.user.id, 'Settings Updated', 'Settings', 'Updated company settings');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/logo', requireManager, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `company/logo-${Date.now()}-${req.file.originalname}`;
    const result = await uploadFile('hafsa-travel', fileName, req.file.buffer, req.file.mimetype);

    const settings = await updateCompanySettings(
      { logoUrl: result.previewUrl || result.path },
      req.user.id
    );

    res.json({
      logoUrl: settings.logoUrl,
      filePath: result.path,
      previewUrl: result.previewUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
