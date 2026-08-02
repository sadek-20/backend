/** GET /bootstrap + PUT /sync — full admin app data */

import { Router } from 'express';
import { fetchBootstrapData, syncBootstrapData } from '../../services/bootstrapService.js';

const router = Router();

router.get('/bootstrap', async (_req, res) => {
  try {
    res.json(await fetchBootstrapData());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/sync', async (req, res) => {
  try {
    res.json(await syncBootstrapData(req.body, req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
