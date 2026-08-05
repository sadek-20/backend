import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import {
  encryptPortalPassword,
  getDefaultCustomerPassword,
} from '../utils/portalPassword.js';
import {
  mapStaffRow,
  mapCustomerRow,
  mapPackageRow,
  mapGroupRow,
  mapBookingRow,
  mapPaymentRow,
  mapDocumentRow,
  mapAuditRow,
  toDateOnly,
} from '../utils/mappers.js';
import {
  resolveStoragePath,
  resolveStoredDocument,
  documentForDb,
  photoPathForDb,
  isStoragePath,
  isDataUrl,
} from '../utils/storageResolve.js';

async function enrichCustomer(row) {
  const c = mapCustomerRow(row);
  const raw = row.photo_url;
  c.photoStoragePath = isStoragePath(raw) ? raw : null;
  if (c.photoStoragePath) {
    c.photoUrl = await resolveStoragePath(c.photoStoragePath);
  } else if (isDataUrl(raw)) {
    c.photoUrl = raw;
  } else {
    c.photoUrl = null;
  }
  c.passportDocument = await resolveStoredDocument(c.passportDocument);
  c.agreementDocument = await resolveStoredDocument(c.agreementDocument);
  return c;
}

async function enrichBooking(row) {
  const b = mapBookingRow(row);
  b.visaDocument = await resolveStoredDocument(b.visaDocument);
  b.ticketDocument = await resolveStoredDocument(b.ticketDocument);
  return b;
}

async function enrichDocument(row) {
  const d = mapDocumentRow(row);
  d.previewUrl = await resolveStoragePath(d.filePath || d.previewUrl);
  return d;
}

async function enrichPackage(row) {
  const p = mapPackageRow(row);
  const raw = row.image_url;
  p.imageStoragePath = isStoragePath(raw) ? raw : null;
  if (p.imageStoragePath) {
    p.imageUrl = await resolveStoragePath(p.imageStoragePath);
  } else if (isDataUrl(raw)) {
    p.imageUrl = raw;
  } else {
    p.imageUrl = null;
  }
  return p;
}

export async function fetchBootstrapData() {
  const [users, customers, packages, groups, bookings, payments, documents, auditLogs, counters] =
    await Promise.all([
      query('SELECT id, username, role, full_name, is_active, created_at FROM staff_users ORDER BY id'),
      query('SELECT * FROM customers ORDER BY id'),
      query('SELECT * FROM packages ORDER BY id'),
      query('SELECT * FROM groups ORDER BY id'),
      query('SELECT * FROM bookings ORDER BY id'),
      query('SELECT * FROM payments ORDER BY id'),
      query('SELECT * FROM documents ORDER BY id'),
      query('SELECT * FROM audit_logs ORDER BY id DESC'),
      query('SELECT key, value FROM counters'),
    ]);

  const counterObj = {};
  counters.rows.forEach((r) => {
    counterObj[r.key] = r.value;
  });

  return {
    users: users.rows.map(mapStaffRow),
    customers: await Promise.all(customers.rows.map(enrichCustomer)),
    packages: await Promise.all(packages.rows.map(enrichPackage)),
    groups: groups.rows.map(mapGroupRow),
    bookings: await Promise.all(bookings.rows.map(enrichBooking)),
    payments: payments.rows.map(mapPaymentRow),
    documents: await Promise.all(documents.rows.map(enrichDocument)),
    auditLogs: auditLogs.rows.map(mapAuditRow),
    counters: {
      customerId: counterObj.customerId || 1,
      bookingId: counterObj.bookingId || 1,
      paymentId: counterObj.paymentId || 1,
      documentId: counterObj.documentId || 1,
      groupId: counterObj.groupId || 1,
      userId: counterObj.userId || 1,
      packageId: counterObj.packageId || 1,
      auditId: counterObj.auditId || 1,
      receiptNumber: counterObj.receiptNumber || 1,
      serialNumber: counterObj.serialNumber || 1,
    },
  };
}

export async function syncBootstrapData(data, userId) {
  await query('BEGIN');
  try {
    for (const u of data.users || []) {
      await query(
        `INSERT INTO staff_users (id, username, password_hash, role, full_name, is_active, created_at)
         VALUES ($1, $2, COALESCE((SELECT password_hash FROM staff_users WHERE id = $1), ''), $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, role = EXCLUDED.role, full_name = EXCLUDED.full_name, is_active = EXCLUDED.is_active`,
        [u.id, u.username, u.role, u.fullName, u.isActive ?? true, u.createdAt || new Date()]
      );
    }

    for (const c of data.customers || []) {
      const existing = await query(
        `SELECT password_hash, portal_password_enc FROM customers WHERE id = $1`,
        [c.id]
      );
      let passwordHash = existing.rows[0]?.password_hash;
      let portalPasswordEnc = existing.rows[0]?.portal_password_enc;

      if (!passwordHash) {
        const defaultPw = getDefaultCustomerPassword();
        passwordHash = await bcrypt.hash(defaultPw, 10);
        portalPasswordEnc = encryptPortalPassword(defaultPw);
      } else if (!portalPasswordEnc) {
        portalPasswordEnc = encryptPortalPassword(getDefaultCustomerPassword());
      }

      await query(
        `INSERT INTO customers (id, serial_number, password_hash, portal_password_enc, full_name, phone, email, date_of_birth, gender, nationality, passport_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, guarantor_name, guarantor_phone, guarantor_relation, notes, photo_url, passport_document, agreement_document, created_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (id) DO UPDATE SET serial_number=EXCLUDED.serial_number, full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, email=EXCLUDED.email, date_of_birth=EXCLUDED.date_of_birth, gender=EXCLUDED.gender, nationality=EXCLUDED.nationality, passport_number=EXCLUDED.passport_number, address=EXCLUDED.address, emergency_contact_name=EXCLUDED.emergency_contact_name, emergency_contact_phone=EXCLUDED.emergency_contact_phone, emergency_contact_relation=EXCLUDED.emergency_contact_relation, guarantor_name=EXCLUDED.guarantor_name, guarantor_phone=EXCLUDED.guarantor_phone, guarantor_relation=EXCLUDED.guarantor_relation, notes=EXCLUDED.notes, photo_url=EXCLUDED.photo_url, passport_document=EXCLUDED.passport_document, agreement_document=EXCLUDED.agreement_document, portal_password_enc=COALESCE(customers.portal_password_enc, EXCLUDED.portal_password_enc)`,
        [
          c.id, c.serialNumber || `HT-${c.id}`, passwordHash, portalPasswordEnc, c.fullName, c.phone, c.email || null,
          toDateOnly(c.dateOfBirth), c.gender, c.nationality, c.passportNumber, c.address,
          c.emergencyContactName, c.emergencyContactPhone, c.emergencyContactRelation,
          c.guarantorName, c.guarantorPhone, c.guarantorRelation, c.notes || '',
          photoPathForDb(c.photoUrl),
          documentForDb(c.passportDocument),
          documentForDb(c.agreementDocument),
          c.createdAt || new Date(), c.createdBy || userId,
        ]
      );
    }

    for (const p of data.packages || []) {
      await query(
        `INSERT INTO packages (id, name, type, price, description, status, total_seats, image_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, price=EXCLUDED.price, description=EXCLUDED.description, status=EXCLUDED.status, total_seats=EXCLUDED.total_seats, image_url=EXCLUDED.image_url`,
        [p.id, p.name, p.type, p.price, p.description, p.status, p.totalSeats || 600, photoPathForDb(p.imageStoragePath || p.imageUrl), p.createdAt || new Date()]
      );
    }

    for (const g of data.groups || []) {
      await query(
        `INSERT INTO groups (id, name, notes, created_at) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, notes=EXCLUDED.notes`,
        [g.id, g.name, g.notes || '', g.createdAt || new Date()]
      );
    }

    for (const b of data.bookings || []) {
      await query(
        `INSERT INTO bookings (
           id, reference, customer_id, package_id, group_id, booked_price, status, progress, progress_manual, notes,
           visa_number, visa_type, visa_status, visa_issue_date, visa_expiry_date,
           ticket_airline, ticket_flight_no, ticket_from, ticket_to, ticket_date, ticket_return_date,
           ticket_seat, ticket_class, ticket_status,
           visa_document, ticket_document, created_at, created_by, completed_at
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
         ON CONFLICT (id) DO UPDATE SET
           reference=EXCLUDED.reference, customer_id=EXCLUDED.customer_id, package_id=EXCLUDED.package_id,
           group_id=EXCLUDED.group_id, booked_price=EXCLUDED.booked_price, status=EXCLUDED.status,
           progress=EXCLUDED.progress, progress_manual=EXCLUDED.progress_manual, notes=EXCLUDED.notes,
           visa_number=EXCLUDED.visa_number, visa_type=EXCLUDED.visa_type, visa_status=EXCLUDED.visa_status,
           visa_issue_date=EXCLUDED.visa_issue_date, visa_expiry_date=EXCLUDED.visa_expiry_date,
           ticket_airline=EXCLUDED.ticket_airline, ticket_flight_no=EXCLUDED.ticket_flight_no,
           ticket_from=EXCLUDED.ticket_from, ticket_to=EXCLUDED.ticket_to,
           ticket_date=EXCLUDED.ticket_date, ticket_return_date=EXCLUDED.ticket_return_date,
           ticket_seat=EXCLUDED.ticket_seat, ticket_class=EXCLUDED.ticket_class, ticket_status=EXCLUDED.ticket_status,
           visa_document=EXCLUDED.visa_document, ticket_document=EXCLUDED.ticket_document,
           completed_at=EXCLUDED.completed_at`,
        [
          b.id, b.reference, b.customerId, b.packageId, b.groupId || null, b.bookedPrice,
          b.status, b.progress, b.progressManual ?? false, b.notes || '',
          b.visaNumber || null, b.visaType || null, b.visaStatus || 'pending',
          toDateOnly(b.visaIssueDate), toDateOnly(b.visaExpiryDate),
          b.ticketAirline || null, b.ticketFlightNo || null,
          b.ticketFrom || null, b.ticketTo || null,
          toDateOnly(b.ticketDate), toDateOnly(b.ticketReturnDate),
          b.ticketSeat || null, b.ticketClass || null, b.ticketStatus || 'pending',
          documentForDb(b.visaDocument),
          documentForDb(b.ticketDocument),
          b.createdAt || new Date(), b.createdBy || userId, b.completedAt || null,
        ]
      );
    }

    for (const p of data.payments || []) {
      await query(
        `INSERT INTO payments (id, booking_id, amount, method, receipt_number, notes, created_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET booking_id=EXCLUDED.booking_id, amount=EXCLUDED.amount, method=EXCLUDED.method, receipt_number=EXCLUDED.receipt_number, notes=EXCLUDED.notes`,
        [p.id, p.bookingId, p.amount, p.method, p.receiptNumber, p.notes || '', p.createdAt || new Date(), p.createdBy || userId]
      );
    }

    for (const d of data.documents || []) {
      if (!d?.id) continue;
      await query(
        `INSERT INTO documents (id, booking_id, type, file_name, file_size, file_path, preview_url, uploaded_at, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET booking_id=EXCLUDED.booking_id, type=EXCLUDED.type, file_name=EXCLUDED.file_name, file_size=EXCLUDED.file_size, file_path=EXCLUDED.file_path, preview_url=EXCLUDED.preview_url`,
        [d.id, d.bookingId, d.type, d.fileName, d.fileSize, d.filePath || null, null, d.uploadedAt || new Date(), d.uploadedBy || userId]
      );
    }

    if (data.counters) {
      for (const [key, value] of Object.entries(data.counters)) {
        await query(
          `INSERT INTO counters (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, value]
        );
      }
    }

    await query('COMMIT');
    return fetchBootstrapData();
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}
