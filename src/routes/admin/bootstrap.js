/** GET /bootstrap + PUT /sync — full admin app data */

import { Router } from 'express';
import { fetchBootstrapData, syncBootstrapData } from '../../services/bootstrapService.js';
import { sendError } from '../../utils/safeError.js';

const router = Router();

router.get('/bootstrap', async (_req, res) => {
  try {
    res.json(await fetchBootstrapData());
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/sync', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    await syncBootstrapData(body, req.user.id, req.user.role);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
