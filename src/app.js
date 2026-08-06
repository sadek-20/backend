/** Express app setup (middleware + routes) */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
);

/** Sync payload is JSON metadata only (files go via /documents/upload) */
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});

app.use('/api/admin/auth/login', loginLimiter);
app.use('/api/customer/auth/login', loginLimiter);
app.use('/api/public/contact', contactLimiter);
app.use('/api', apiLimiter);

app.use('/api', apiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Upload too large. Use smaller files (under 10 MB) or upload documents one at a time.',
    });
  }
  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

export default app;
