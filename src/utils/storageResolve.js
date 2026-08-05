import { getSignedUrl } from '../config/supabase.js';

export const STORAGE_BUCKET = 'hafsa-travel';
/** 7 days — refreshed on each bootstrap load */
const SIGNED_URL_TTL = 60 * 60 * 24 * 7;

export function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

export function isHttpUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

/** Storage object path (not URL, not base64) */
export function isStoragePath(value) {
  if (!value || typeof value !== 'string') return false;
  if (isDataUrl(value) || isHttpUrl(value)) return false;
  return value.includes('/');
}

export async function resolveStoragePath(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return pathOrUrl || null;
  if (isDataUrl(pathOrUrl)) return pathOrUrl;
  if (isStoragePath(pathOrUrl)) {
    const signed = await getSignedUrl(STORAGE_BUCKET, pathOrUrl, SIGNED_URL_TTL);
    return signed || pathOrUrl;
  }
  return pathOrUrl;
}

export async function resolveStoredDocument(doc) {
  if (!doc || typeof doc !== 'object') return doc;

  const filePath = doc.filePath || doc.file_path || null;
  let previewUrl = null;

  if (filePath) {
    previewUrl = await resolveStoragePath(filePath);
  } else if (isDataUrl(doc.previewUrl)) {
    previewUrl = doc.previewUrl;
  } else if (doc.previewUrl) {
    previewUrl = await resolveStoragePath(doc.previewUrl);
  }

  return {
    fileName: doc.fileName || doc.file_name,
    fileSize: doc.fileSize || doc.file_size,
    filePath,
    previewUrl,
    uploadedAt: doc.uploadedAt || doc.uploaded_at,
  };
}

/** Persist only metadata + storage path (never base64 or expiring signed URLs). */
export function documentForDb(doc) {
  if (!doc) return null;
  if (typeof doc === 'string') {
    try {
      doc = JSON.parse(doc);
    } catch {
      return null;
    }
  }
  const filePath = doc.filePath || doc.file_path || null;
  if (!filePath) {
    if (isDataUrl(doc.previewUrl)) return null;
    if (isStoragePath(doc.previewUrl)) {
      return JSON.stringify({
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        filePath: doc.previewUrl,
        uploadedAt: doc.uploadedAt,
      });
    }
    return doc.previewUrl ? JSON.stringify(doc) : null;
  }
  return JSON.stringify({
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    filePath,
    uploadedAt: doc.uploadedAt,
  });
}

export function photoPathForDb(photoUrl) {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  if (isDataUrl(photoUrl)) return null;
  if (isHttpUrl(photoUrl)) return null;
  if (isStoragePath(photoUrl)) return photoUrl;
  return photoUrl;
}
