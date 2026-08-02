/** Shared helpers: audit logs, counters, file size */

import { query } from '../db/pool.js';

export async function addAuditLog(userId, action, module, details) {
  await query(
    `INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)`,
    [userId, action, module, details]
  );
}

export async function getNextCounter(key) {
  const { rows } = await query(
    `UPDATE counters SET value = value + 1 WHERE key = $1 RETURNING value - 1 AS id`,
    [key]
  );
  return rows[0]?.id ?? 1;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
