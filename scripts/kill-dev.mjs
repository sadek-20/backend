import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, '..', '.dev-server.pid');

function killPreviousDevServer() {
  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    if (pid) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // process may already be gone
      }
    }
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      // pid file may already be removed
    }
  }

  try {
    execSync('npx kill-port 4000', { stdio: 'ignore' });
  } catch {
    // port may already be free
  }
}

killPreviousDevServer();
