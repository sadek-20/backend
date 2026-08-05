import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

// Keep DATE as 'YYYY-MM-DD' string (avoid JS Date → "Fri Mar 15" / timezone shift)
pg.types.setTypeParser(1082, (value) => value);

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  return pool.query(text, params);
}
