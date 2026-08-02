-- Run this in Supabase Dashboard → SQL Editor (one time)
-- Creates tables + demo data for HAFSA TRAVEL

-- ========== SCHEMA (from schema.sql) ==========

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

CREATE INDEX IF NOT EXISTS idx_customers_serial ON customers(serial_number);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents(booking_id);

-- ========== SEED DATA (skip if already populated) ==========

INSERT INTO staff_users (id, username, password_hash, role, full_name, is_active, created_at) VALUES
 (1, 'admin', '$2b$10$ew2gBQ7rWss3KrndDiotyuaaMlXYZEcRFkiXyb3U4iBVglYLvp6c.', 'admin', 'System Administrator', true, '2025-01-01T08:00:00'),
 (2, 'manager1', '$2b$10$qHTojZMdPjw0I/zMFNI8EO2iril6Z4doxIrOlqtaCuAxGiRvZ3CQ2', 'manager', 'Hassan Manager', true, '2025-01-15T08:00:00'),
 (3, 'staff1', '$2b$10$m2Z9KWw0oydA3q3Mj1cS/./ycRKsFSwUroGvoKY0lE7fcpEvwqZ7K', 'staff', 'Ahmed Staff', true, '2025-02-01T08:00:00'),
 (4, 'staff2', '$2b$10$m2Z9KWw0oydA3q3Mj1cS/./ycRKsFSwUroGvoKY0lE7fcpEvwqZ7K', 'staff', 'Fatima Ali', true, '2025-02-15T08:00:00')
ON CONFLICT (username) DO NOTHING;

INSERT INTO packages (id, name, type, price, description, status, total_seats, created_at) VALUES
 (1, 'Hajj 2027', 'Hajj', 850000, 'Full Hajj package including visa, flights, and accommodation.', 'active', 600, '2025-06-01T10:00:00'),
 (2, 'Umrah Ramadan 2027', 'Umrah', 350000, 'Ramadan Umrah package with premium hotel near Haram.', 'active', 600, '2025-06-01T10:00:00'),
 (3, 'Umrah December 2027', 'Umrah', 280000, 'Standard December Umrah package.', 'active', 600, '2025-07-01T10:00:00'),
 (4, 'Hajj 2026', 'Hajj', 800000, 'Hajj 2026 package — archived.', 'inactive', 600, '2024-06-01T10:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO groups (id, name, notes, created_at) VALUES
 (1, 'Family Ahmed', 'Ahmed family travelling together for Umrah Ramadan 2027.', '2025-09-10T10:00:00'),
 (2, 'Company Delegation', 'Corporate group from local business.', '2025-10-01T14:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, serial_number, password_hash, full_name, name_en, name_ar, name_so, phone, email, date_of_birth, gender, nationality, passport_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, guarantor_name, guarantor_phone, guarantor_relation, notes, passport_document, agreement_document, created_at, created_by) VALUES
 (1, 'HT-2024-001', '$2b$10$Wn.Jq2.kIYMgBjqq3v9XMuAwdEPQTKtLZdToI/K/z.qjLXE2TOQ1S', 'Ahmed Hassan', 'Ahmed Hassan', 'أحمد حسن', 'Axmed Xasan', '+252 61 111 1111', 'ahmed@email.com', '1985-03-15', 'Male', 'Somali', 'P1234567', 'Hodan District, Mogadishu', 'Amina Hassan', '+252 61 987 6543', 'Wife', 'Ali Hassan', '+252 61 555 1234', 'Brother', 'Hajj Premium customer', '{"fileName":"passport.pdf","fileSize":"1.4 MB","uploadedAt":"2025-08-10T10:00:00"}', '{"fileName":"agreement.pdf","fileSize":"890 KB","uploadedAt":"2025-08-10T10:05:00"}', '2025-08-10T09:30:00', 3),
 (2, 'HT-2024-002', '$2b$10$QGMnSliR84i/hO5/85yRue/LHQ0Re2mngaGnI1F5S03oBRQ40IkHe', 'Fatima Ali', 'Fatima Ali', 'فاطمة علي', 'Faadumo Cali', '+252 61 222 2222', 'fatima@email.com', '1990-07-22', 'Female', 'Somali', 'P2345678', 'Wadajir District, Mogadishu', 'Omar Ali', '+252 61 876 5432', 'Father', NULL, NULL, NULL, '', '{"fileName":"passport.pdf","fileSize":"1.1 MB","uploadedAt":"2025-09-05T11:30:00"}', NULL, '2025-09-05T11:00:00', 3),
 (3, 'HT-2024-003', '$2b$10$hdn2rKwkmJDBl1eExyo/JO7JHiUIK7kFAtzXmHzyeUz2OIp8l96j2', 'Mohamed Ibrahim', 'Mohamed Ibrahim', 'محمد إبراهيم', 'Maxamed Ibraahim', '+252 61 333 3333', 'mohamed@email.com', '1978-11-08', 'Male', 'Somali', 'P3456789', 'Karaan District, Mogadishu', 'Halima Ibrahim', '+252 61 765 4321', 'Wife', 'Ibrahim Mohamed', '+252 61 444 5678', 'Son', 'Hajj Standard', NULL, NULL, '2025-10-20T14:15:00', 4),
 (4, 'HT-2024-004', '$2b$10$Wn.Jq2.kIYMgBjqq3v9XMuAwdEPQTKtLZdToI/K/z.qjLXE2TOQ1S', 'Mohamed Abdi Hassan', 'Mohamed Abdi Hassan', NULL, NULL, '+252 61 234 5678', 'mohamed.abdi@email.com', '1985-03-15', 'Male', 'Somali', 'P1234567', 'Hodan District, Mogadishu', 'Amina Hassan', '+252 61 987 6543', 'Wife', 'Ali Hassan', '+252 61 555 1234', 'Brother', 'Returning customer', '{"fileName":"mohamed_passport_scan.pdf","fileSize":"1.4 MB","uploadedAt":"2025-08-10T10:00:00"}', '{"fileName":"mohamed_travel_agreement.pdf","fileSize":"890 KB","uploadedAt":"2025-08-10T10:05:00"}', '2025-08-10T09:30:00', 3)
ON CONFLICT (serial_number) DO NOTHING;

INSERT INTO bookings (id, reference, customer_id, package_id, group_id, booked_price, status, progress, notes, visa_number, visa_type, visa_status, visa_issue_date, visa_expiry_date, ticket_airline, ticket_flight_no, ticket_from, ticket_to, ticket_date, ticket_return_date, ticket_seat, ticket_class, ticket_status, created_at, created_by, completed_at) VALUES
 (1, 'HU-2027-0001', 1, 2, 1, 350000, 'active', 'Visa Processing', 'Passport submitted for visa.', 'SA-2024-78432', 'Umrah Visa', 'approved', '2024-05-15', '2024-07-30', 'Saudi Airlines', 'SV 832', 'Mogadishu (MGQ)', 'Jeddah (JED)', '2024-06-01', '2024-07-15', '12A', 'Economy', 'ready', '2025-09-15T10:00:00', 3, NULL),
 (2, 'HU-2027-0002', 2, 2, 1, 350000, 'active', 'Documents Ready', '', 'SA-2024-91205', 'Umrah Visa', 'pending', NULL, NULL, 'Flynas', 'XY 412', 'Mogadishu (MGQ)', 'Jeddah (JED)', '2024-08-10', '2024-08-20', 'TBD', 'Economy', 'pending', '2025-09-16T11:30:00', 3, NULL),
 (3, 'HU-2027-0003', 3, 1, NULL, 850000, 'active', 'New', 'Hajj 2027 registration.', 'SA-2024-65891', 'Hajj Visa', 'approved', '2024-05-20', '2024-07-30', 'Emirates', 'EK 722', 'Mogadishu (MGQ)', 'Jeddah (JED)', '2024-06-05', '2024-07-20', '8C', 'Business', 'ready', '2025-10-25T09:00:00', 4, NULL),
 (4, 'HU-2027-0004', 4, 3, NULL, 280000, 'active', 'Ready To Travel', 'All documents complete.', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', '2025-11-15T13:00:00', 3, NULL),
 (5, 'HU-2026-0010', 1, 4, NULL, 800000, 'completed', 'Completed', 'Hajj 2026 completed successfully.', NULL, NULL, 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ready', '2025-03-01T08:00:00', 3, '2025-07-15T18:00:00')
ON CONFLICT (reference) DO NOTHING;

INSERT INTO payments (id, booking_id, amount, method, receipt_number, notes, created_at, created_by) VALUES
 (1, 1, 150000, 'Cash', 'RCP-2027-0001', 'Initial deposit', '2025-09-15T10:30:00', 3),
 (2, 1, 100000, 'Bank Transfer', 'RCP-2027-0002', 'Second installment', '2025-10-01T14:00:00', 3),
 (3, 2, 100000, 'Cash', 'RCP-2027-0003', 'Initial deposit', '2025-09-16T12:00:00', 3),
 (4, 3, 200000, 'Bank Transfer', 'RCP-2027-0004', 'Hajj deposit', '2025-10-25T09:30:00', 4),
 (5, 1, 100000, 'Bank Transfer', 'RCP-2027-0005', 'Final payment', '2025-11-01T10:00:00', 3),
 (6, 3, 380000, 'Bank Transfer', 'RCP-2027-0006', 'Full payment', '2025-11-10T14:00:00', 4)
ON CONFLICT (receipt_number) DO NOTHING;

INSERT INTO documents (id, booking_id, type, file_name, file_size, uploaded_at, uploaded_by) VALUES
 (1, 1, 'Passport', 'mohamed_passport.pdf', '1.2 MB', '2025-09-15T11:00:00', 3),
 (2, 1, 'Photo', 'mohamed_photo.jpg', '450 KB', '2025-09-15T11:05:00', 3),
 (3, 1, 'Visa', 'mohamed_visa_application.pdf', '890 KB', '2025-10-05T09:00:00', 3),
 (4, 2, 'Passport', 'khadija_passport.pdf', '1.1 MB', '2025-09-20T10:00:00', 3),
 (5, 4, 'Passport', 'aisha_passport.pdf', '1.0 MB', '2025-11-15T14:00:00', 3),
 (6, 4, 'Visa', 'aisha_visa.pdf', '750 KB', '2025-11-20T10:00:00', 3),
 (7, 4, 'Flight Ticket', 'aisha_flight.pdf', '620 KB', '2025-12-01T11:00:00', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, user_id, action, module, details, created_at) VALUES
 (1, 3, 'Customer Created', 'Customers', 'Created customer Ahmed Hassan', '2025-08-10T09:30:00'),
 (2, 3, 'Booking Created', 'Bookings', 'Created booking HU-2027-0001 for Ahmed Hassan', '2025-09-15T10:00:00'),
 (3, 3, 'Payment Added', 'Payments', 'Payment RCP-2027-0001 — 150,000 for booking HU-2027-0001', '2025-09-15T10:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_settings (id, company_name, tagline, receipt_footer, currency, phone, email, address) VALUES
 (1, 'HAFSA Travel', 'Hajj & Umrah Management', 'Thank you for choosing HAFSA Travel', 'USD', '+252 61 000 0000', 'info@hafsatravel.com', 'Mogadishu, Somalia')
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  tagline = EXCLUDED.tagline,
  receipt_footer = EXCLUDED.receipt_footer;

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

SELECT setval('staff_users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM staff_users));
SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));
SELECT setval('packages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM packages));
SELECT setval('groups_id_seq', (SELECT COALESCE(MAX(id), 1) FROM groups));
SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM bookings));
SELECT setval('payments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payments));
SELECT setval('documents_id_seq', (SELECT COALESCE(MAX(id), 1) FROM documents));
SELECT setval('audit_logs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM audit_logs));
