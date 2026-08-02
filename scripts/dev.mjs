import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, '..', '.dev-server.pid');

function cleanup() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}

const child = spawn('node', ['--watch', 'src/index.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

fs.writeFileSync(PID_FILE, String(child.pid));

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
