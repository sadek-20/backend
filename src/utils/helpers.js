/** Shared helpers: audit logs, counters, file size */

import { query } from '../db/pool.js';

export async function addAuditLog(userId, action, module, details) {
  const { rows } = await query(
    `INSERT INTO audit_logs (user_id, action, module, details)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, action, module, details]
  );
  const newId = rows[0]?.id;
  if (newId != null) {
    await query(
      `INSERT INTO counters (key, value) VALUES ('auditId', $1)
       ON CONFLICT (key) DO UPDATE SET value = GREATEST(counters.value, EXCLUDED.value)`,
      [newId + 1]
    );
  }
  return newId;
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
