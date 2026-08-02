import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runSchema() {
  if (!pool) {
    console.error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env');
    process.exit(1);
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await query(schema);
  console.log('Schema applied.');

  const { ensureCompanySettings } = await import('../services/settingsService.js');
  await ensureCompanySettings();
  console.log('Company settings ready.');

  const { rows } = await query('SELECT COUNT(*)::int AS c FROM staff_users');
  if (rows[0].c > 0) {
    console.log('Seed data already exists, skipping.');
    return;
  }

  await seed();
  console.log('Seed data inserted.');
}

async function seed() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  await query(
    `INSERT INTO staff_users (id, username, password_hash, role, full_name, is_active, created_at) VALUES
     (1, 'admin', $1, 'admin', 'System Administrator', true, '2025-01-01T08:00:00'),
     (2, 'manager1', $2, 'manager', 'Hassan Manager', true, '2025-01-15T08:00:00'),
     (3, 'staff1', $3, 'staff', 'Ahmed Staff', true, '2025-02-01T08:00:00'),
     (4, 'staff2', $4, 'staff', 'Fatima Ali', true, '2025-02-15T08:00:00')`,
    [hash('admin123'), hash('manager123'), hash('staff123'), hash('staff123')]
  );

  await query(
    `INSERT INTO packages (id, name, type, price, description, status, total_seats, created_at) VALUES
     (1, 'Hajj 2027', 'Hajj', 850000, 'Full Hajj package including visa, flights, and accommodation.', 'active', 600, '2025-06-01T10:00:00'),
     (2, 'Umrah Ramadan 2027', 'Umrah', 350000, 'Ramadan Umrah package with premium hotel near Haram.', 'active', 600, '2025-06-01T10:00:00'),
     (3, 'Umrah December 2027', 'Umrah', 280000, 'Standard December Umrah package.', 'active', 600, '2025-07-01T10:00:00'),
     (4, 'Hajj 2026', 'Hajj', 800000, 'Hajj 2026 package — archived.', 'inactive', 600, '2024-06-01T10:00:00')`
  );

  await query(
    `INSERT INTO groups (id, name, notes, created_at) VALUES
     (1, 'Family Ahmed', 'Ahmed family travelling together for Umrah Ramadan 2027.', '2025-09-10T10:00:00'),
     (2, 'Company Delegation', 'Corporate group from local business.', '2025-10-01T14:00:00')`
  );

  const custPw = hash('password123');
  await query(
    `INSERT INTO customers (id, serial_number, password_hash, full_name, name_en, name_ar, name_so, phone, email, date_of_birth, gender, nationality, passport_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, guarantor_name, guarantor_phone, guarantor_relation, notes, passport_document, agreement_document, created_at, created_by) VALUES
     (1, 'HT-2024-001', $1, 'Ahmed Hassan', 'Ahmed Hassan', 'أحمد حسن', 'Axmed Xasan', '+252 61 111 1111', 'ahmed@email.com', '1985-03-15', 'Male', 'Somali', 'P1234567', 'Hodan District, Mogadishu', 'Amina Hassan', '+252 61 987 6543', 'Wife', 'Ali Hassan', '+252 61 555 1234', 'Brother', 'Hajj Premium customer', '{"fileName":"passport.pdf","fileSize":"1.4 MB","uploadedAt":"2025-08-10T10:00:00"}', '{"fileName":"agreement.pdf","fileSize":"890 KB","uploadedAt":"2025-08-10T10:05:00"}', '2025-08-10T09:30:00', 3),
     (2, 'HT-2024-002', $2, 'Fatima Ali', 'Fatima Ali', 'فاطمة علي', 'Faadumo Cali', '+252 61 222 2222', 'fatima@email.com', '1990-07-22', 'Female', 'Somali', 'P2345678', 'Wadajir District, Mogadishu', 'Omar Ali', '+252 61 876 5432', 'Father', NULL, NULL, NULL, '', '{"fileName":"passport.pdf","fileSize":"1.1 MB","uploadedAt":"2025-09-05T11:30:00"}', NULL, '2025-09-05T11:00:00', 3),
     (3, 'HT-2024-003', $3, 'Mohamed Ibrahim', 'Mohamed Ibrahim', 'محمد إبراهيم', 'Maxamed Ibraahim', '+252 61 333 3333', 'mohamed@email.com', '1978-11-08', 'Male', 'Somali', 'P3456789', 'Karaan District, Mogadishu', 'Halima Ibrahim', '+252 61 765 4321', 'Wife', 'Ibrahim Mohamed', '+252 61 444 5678', 'Son', 'Hajj Standard', NULL, NULL, '2025-10-20T14:15:00', 4),
     (4, 'HT-2024-004', $4, 'Mohamed Abdi Hassan', 'Mohamed Abdi Hassan', NULL, NULL, '+252 61 234 5678', 'mohamed.abdi@email.com', '1985-03-15', 'Male', 'Somali', 'P1234567', 'Hodan District, Mogadishu', 'Amina Hassan', '+252 61 987 6543', 'Wife', 'Ali Hassan', '+252 61 555 1234', 'Brother', 'Returning customer', '{"fileName":"mohamed_passport_scan.pdf","fileSize":"1.4 MB","uploadedAt":"2025-08-10T10:00:00"}', '{"fileName":"mohamed_travel_agreement.pdf","fileSize":"890 KB","uploadedAt":"2025-08-10T10:05:00"}', '2025-08-10T09:30:00', 3)`,
    [custPw, hash('umrah2024'), hash('hajj2024'), custPw]
  );

  await query(
    `INSERT INTO bookings (id, reference, customer_id, package_id, group_id, booked_price, status, progress, notes, visa_number, visa_type, visa_status, visa_issue_date, visa_expiry_date, ticket_airline, ticket_flight_no, ticket_from, ticket_to, ticket_date, ticket_return_date, ticket_seat, ticket_class, ticket_status, created_at, created_by, completed_at) VALUES
     (1, 'HU-2027-0001', 1, 2, 1, 350000, 'active', 'Visa Processing', 'Passport submitted for visa.', 'SA-2024-78432', 'Umrah Visa', 'approved', '2024-05-15', '2024-07-30', 'Saudi Airlines', 'SV 832', 'Mogadishu (MGQ)', 'Jeddah (JED)', '2024-06-01', '2024-07-15', '12A', 'Economy', 'ready', '2025-09-15T10:00:00', 3, NULL),
     (2, 'HU-2027-0002', 2, 2, 1, 350000, 'active', 'Documents Ready', '', 'SA-2024-91205', 'Umrah Visa', 'pending', NULL, NULL, 'Flynas', 'XY 412', 'Mogadishu (MGQ)', 'Jeddah (JED)', '2024-08-10', '2024-08-20', 'TBD', 'Economy', 'pending', '2025-09-16T11:30:00', 3, NULL),
     (3, 'HU-2027-0003', 3, 1, NULL, 850000, 'active', 'New', 'Hajj 2027 registration.', 'SA-2024-65891', 'Hajj Visa', 'approved', '2024-05-20', '2024-07-30', 'Emirates', 'EK 722', 'Mogadishu (MGQ)', 'Jeddah (JED)', '2024-06-05', '2024-07-20', '8C', 'Business', 'ready', '2025-10-25T09:00:00', 4, NULL),
     (4, 'HU-2027-0004', 4, 3, NULL, 280000, 'active', 'Ready To Travel', 'All documents complete.', NULL, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', '2025-11-15T13:00:00', 3, NULL),
     (5, 'HU-2026-0010', 1, 4, NULL, 800000, 'completed', 'Completed', 'Hajj 2026 completed successfully.', NULL, NULL, 'approved', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ready', '2025-03-01T08:00:00', 3, '2025-07-15T18:00:00')`
  );

  await query(
    `INSERT INTO payments (id, booking_id, amount, method, receipt_number, notes, created_at, created_by) VALUES
     (1, 1, 150000, 'Cash', 'RCP-2027-0001', 'Initial deposit', '2025-09-15T10:30:00', 3),
     (2, 1, 100000, 'Bank Transfer', 'RCP-2027-0002', 'Second installment', '2025-10-01T14:00:00', 3),
     (3, 2, 100000, 'Cash', 'RCP-2027-0003', 'Initial deposit', '2025-09-16T12:00:00', 3),
     (4, 3, 200000, 'Bank Transfer', 'RCP-2027-0004', 'Hajj deposit', '2025-10-25T09:30:00', 4),
     (5, 1, 100000, 'Bank Transfer', 'RCP-2027-0005', 'Final payment', '2025-11-01T10:00:00', 3),
     (6, 3, 380000, 'Bank Transfer', 'RCP-2027-0006', 'Full payment', '2025-11-10T14:00:00', 4)`
  );

  await query(
    `INSERT INTO documents (id, booking_id, type, file_name, file_size, uploaded_at, uploaded_by) VALUES
     (1, 1, 'Passport', 'mohamed_passport.pdf', '1.2 MB', '2025-09-15T11:00:00', 3),
     (2, 1, 'Photo', 'mohamed_photo.jpg', '450 KB', '2025-09-15T11:05:00', 3),
     (3, 1, 'Visa', 'mohamed_visa_application.pdf', '890 KB', '2025-10-05T09:00:00', 3),
     (4, 2, 'Passport', 'khadija_passport.pdf', '1.1 MB', '2025-09-20T10:00:00', 3),
     (5, 4, 'Passport', 'aisha_passport.pdf', '1.0 MB', '2025-11-15T14:00:00', 3),
     (6, 4, 'Visa', 'aisha_visa.pdf', '750 KB', '2025-11-20T10:00:00', 3),
     (7, 4, 'Flight Ticket', 'aisha_flight.pdf', '620 KB', '2025-12-01T11:00:00', 3)`
  );

  await query(
    `INSERT INTO audit_logs (id, user_id, action, module, details, created_at) VALUES
     (1, 3, 'Customer Created', 'Customers', 'Created customer Ahmed Hassan', '2025-08-10T09:30:00'),
     (2, 3, 'Booking Created', 'Bookings', 'Created booking HU-2027-0001 for Ahmed Hassan', '2025-09-15T10:00:00'),
     (3, 3, 'Payment Added', 'Payments', 'Payment RCP-2027-0001 — 150,000 for booking HU-2027-0001', '2025-09-15T10:30:00')`
  );

  await query(`SELECT setval('staff_users_id_seq', (SELECT MAX(id) FROM staff_users))`);
  await query(`SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers))`);
  await query(`SELECT setval('packages_id_seq', (SELECT MAX(id) FROM packages))`);
  await query(`SELECT setval('groups_id_seq', (SELECT MAX(id) FROM groups))`);
  await query(`SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings))`);
  await query(`SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments))`);
  await query(`SELECT setval('documents_id_seq', (SELECT MAX(id) FROM documents))`);
  await query(`SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs))`);
}

if (process.argv[1]?.includes('runSchema')) {
  runSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
