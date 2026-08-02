/** Server entry — starts listening on PORT */

import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(`HAFSA Travel API running on http://localhost:${env.port}`);
  if (!env.databaseUrl) {
    console.warn('WARNING: DATABASE_URL not set. Copy .env.example to .env');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${env.port} is already in use. Another server instance may be running.`);
    console.error('Run: npx kill-port 4000   then restart with npm run dev\n');
  } else {
    console.error('Server failed to start:', err.message);
  }
  process.exit(1);
});
