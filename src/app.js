/** Express app setup (middleware + routes) */

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', apiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Upload too large. Use smaller files (under 10 MB) or upload documents one at a time.',
    });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
