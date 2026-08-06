import { getSignedUrl, getPublicUrl } from '../config/supabase.js';

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

/**
 * Recover storage path from path OR Supabase public/signed URL.
 * Never lose a photo just because the client sent an https signed URL.
 */
export function extractStoragePath(value) {
  if (!value || typeof value !== 'string') return null;
  if (isDataUrl(value)) return null;
  if (isStoragePath(value)) return value;

  try {
    const u = new URL(value);
    const signMatch = u.pathname.match(
      /\/storage\/v1\/object\/(?:sign|public)\/[^/]+\/(.+)$/
    );
    if (signMatch?.[1]) return decodeURIComponent(signMatch[1]);
  } catch {
    // not a URL
  }

  const loose = value.match(
    /\/storage\/v1\/object\/(?:sign|public)\/[^/]+\/([^?]+)/
  );
  if (loose?.[1]) return decodeURIComponent(loose[1]);

  return null;
}

/** Durable URL for DB (public object URL). Falls back to path if Supabase unavailable. */
export function durablePhotoUrl(pathOrUrl) {
  const path = extractStoragePath(pathOrUrl);
  if (!path) return null;
  return getPublicUrl(STORAGE_BUCKET, path) || path;
}

export async function resolveStoragePath(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return pathOrUrl || null;
  if (isDataUrl(pathOrUrl)) return pathOrUrl;

  const path = extractStoragePath(pathOrUrl);
  if (path) {
    const signed = await getSignedUrl(STORAGE_BUCKET, path, SIGNED_URL_TTL);
    if (signed) return signed;
    const pub = getPublicUrl(STORAGE_BUCKET, path);
    return pub || pathOrUrl;
  }

  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  return pathOrUrl;
}

export async function resolveStoredDocument(doc) {
  if (!doc || typeof doc !== 'object') return doc;

  const filePath =
    extractStoragePath(doc.filePath || doc.file_path) ||
    extractStoragePath(doc.previewUrl) ||
    null;
  let previewUrl = null;

  if (filePath) {
    previewUrl = await resolveStoragePath(filePath);
  } else if (isDataUrl(doc.previewUrl)) {
    previewUrl = doc.previewUrl;
  }

  return {
    fileName: doc.fileName || doc.file_name,
    fileSize: doc.fileSize || doc.file_size,
    filePath,
    previewUrl,
    uploadedAt: doc.uploadedAt || doc.uploaded_at,
  };
}

/** Persist only metadata + storage path (never base64 or expiring signed-only refs). */
export function documentForDb(doc) {
  if (!doc) return null;
  if (typeof doc === 'string') {
    try {
      doc = JSON.parse(doc);
    } catch {
      return null;
    }
  }
  const filePath =
    extractStoragePath(doc.filePath || doc.file_path) ||
    extractStoragePath(doc.previewUrl) ||
    null;
  if (!filePath) {
    if (isDataUrl(doc.previewUrl)) return null;
    return null;
  }
  return JSON.stringify({
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    filePath,
    uploadedAt: doc.uploadedAt,
  });
}

/**
 * Value to store in customers.photo_url / packages.image_url.
 * Returns durable public URL (or path). Never turns a valid photo into null.
 */
export function photoPathForDb(photoUrl, fallback) {
  const durable =
    durablePhotoUrl(photoUrl) ||
    durablePhotoUrl(fallback) ||
    extractStoragePath(photoUrl) ||
    extractStoragePath(fallback);
  return durable || null;
}

/**
 * Resolve photo for sync: prefer incoming, else keep existing DB value.
 * Explicit clear only when both photoUrl and photoStoragePath are null.
 */
export function resolvePhotoForSync(customer, existingDbPhoto) {
  const cleared =
    customer.photoUrl === null &&
    (customer.photoStoragePath === null || customer.photoStoragePath === undefined);

  if (cleared && customer.photoUrl === null && customer.photoStoragePath === null) {
    return null;
  }

  const next =
    photoPathForDb(customer.photoStoragePath, customer.photoUrl) ||
    photoPathForDb(customer.photoUrl) ||
    photoPathForDb(existingDbPhoto);

  return next;
}
