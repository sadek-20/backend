/** File upload → Supabase Storage */

import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../../config/supabase.js';
import { formatSize } from '../../utils/helpers.js';
import { buildStorageObjectPath, isAllowedUploadMime } from '../../utils/uploadSanitize.js';
import { sendError } from '../../utils/safeError.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const STORAGE_BUCKET = 'hafsa-travel';

router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (!isAllowedUploadMime(req.file.mimetype)) {
      return res.status(400).json({
        error: 'File type not allowed. Use JPG, PNG, WEBP, GIF, or PDF.',
      });
    }

    const folder = req.body?.folder || 'uploads';
    const objectPath = buildStorageObjectPath(folder, req.file.originalname);
    const result = await uploadFile(STORAGE_BUCKET, objectPath, req.file.buffer, req.file.mimetype);

    res.json({
      fileName: req.file.originalname.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120),
      fileSize: formatSize(req.file.size),
      uploadedAt: new Date().toISOString(),
      filePath: result.path,
      previewUrl: result.previewUrl,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
