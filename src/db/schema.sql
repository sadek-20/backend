-- HAFSA TRAVEL Database Schema

CREATE TABLE IF NOT EXISTS staff_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  full_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  portal_password_enc TEXT,
  full_name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  name_ar VARCHAR(255),
  name_so VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(20),
  nationality VARCHAR(100),
  passport_number VARCHAR(100),
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relation VARCHAR(100),
  guarantor_name VARCHAR(255),
  guarantor_phone VARCHAR(50),
  guarantor_relation VARCHAR(100),
  notes TEXT,
  photo_url TEXT,
  passport_document JSONB,
  agreement_document JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Hajj', 'Umrah')),
  price NUMERIC(12, 2) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  total_seats INTEGER DEFAULT 600,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id INTEGER NOT NULL REFERENCES packages(id),
  group_id INTEGER REFERENCES groups(id),
  booked_price NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  progress VARCHAR(50) DEFAULT 'New',
  progress_manual BOOLEAN DEFAULT false,
  notes TEXT,
  visa_number VARCHAR(100),
  visa_type VARCHAR(100),
  visa_status VARCHAR(20) DEFAULT 'pending',
  visa_issue_date DATE,
  visa_expiry_date DATE,
  ticket_airline VARCHAR(255),
  ticket_flight_no VARCHAR(50),
  ticket_from VARCHAR(255),
  ticket_to VARCHAR(255),
  ticket_date DATE,
  ticket_return_date DATE,
  ticket_seat VARCHAR(20),
  ticket_class VARCHAR(50),
  ticket_status VARCHAR(20) DEFAULT 'pending',
  visa_document JSONB,
  ticket_document JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES staff_users(id),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method VARCHAR(100) NOT NULL,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255),
  file_size VARCHAR(50),
  file_path TEXT,
  preview_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by INTEGER REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES staff_users(id),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name VARCHAR(255) NOT NULL DEFAULT 'HAFSA Travel',
  tagline VARCHAR(255),
  receipt_footer TEXT,
  currency VARCHAR(20) DEFAULT 'USD',
  logo_url TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS counters (
  key VARCHAR(50) PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 1
);

INSERT INTO counters (key, value) VALUES
  ('customerId', 5),
  ('bookingId', 6),
  ('paymentId', 7),
  ('documentId', 8),
  ('groupId', 3),
  ('userId', 5),
  ('packageId', 5),
  ('auditId', 9),
  ('receiptNumber', 6),
  ('serialNumber', 5)
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_customers_serial ON customers(serial_number);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents(booking_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS progress_manual BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_password_enc TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS staff_reveal_pin_hash TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS staff_reveal_enabled BOOLEAN DEFAULT false;
