/** File upload → Supabase Storage */

import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../../config/supabase.js';
import { formatSize } from '../../utils/helpers.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { bucket = 'hafsa-travel', folder = 'uploads' } = req.body;
    const fileName = `${folder}/${Date.now()}-${req.file.originalname}`;
    const result = await uploadFile(bucket, fileName, req.file.buffer, req.file.mimetype);

    res.json({
      fileName: req.file.originalname,
      fileSize: formatSize(req.file.size),
      uploadedAt: new Date().toISOString(),
      filePath: result.path,
      previewUrl: result.previewUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
