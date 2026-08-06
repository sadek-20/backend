/** Sanitize storage upload paths — block traversal and odd characters */

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const FOLDER_RE = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,180}$/;

export function sanitizeFolder(folder) {
  const raw = String(folder || 'uploads').replace(/\\/g, '/').replace(/\/+/g, '/');
  if (raw.includes('..') || raw.startsWith('/') || !FOLDER_RE.test(raw)) {
    return 'uploads';
  }
  return raw.replace(/\/+$/, '');
}

export function sanitizeOriginalName(name) {
  const base = String(name || 'file')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\0/g, '')
    .slice(0, 120);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return 'file.bin';
  const ext = base.slice(dot).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return `file${ext.length <= 5 ? ext : '.bin'}`;
  const stem = base.slice(0, dot).replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'file';
  return `${stem}${ext}`;
}

export function isAllowedUploadMime(mime) {
  if (!mime) return false;
  return ALLOWED_MIME.has(String(mime).toLowerCase());
}

export function buildStorageObjectPath(folder, originalName) {
  const safeFolder = sanitizeFolder(folder);
  const safeName = sanitizeOriginalName(originalName);
  return `${safeFolder}/${Date.now()}-${safeName}`;
}
