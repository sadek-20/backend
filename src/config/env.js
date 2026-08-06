import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  defaultCustomerPassword: process.env.DEFAULT_CUSTOMER_PASSWORD || 'password123',
  // Optional one-time seed only — prefer Settings UI (hashed in DB)
  staffRevealPin: process.env.STAFF_REVEAL_PIN || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
};
