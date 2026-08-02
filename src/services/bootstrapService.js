import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import {
  mapStaffRow,
  mapCustomerRow,
  mapPackageRow,
  mapGroupRow,
  mapBookingRow,
  mapPaymentRow,
  mapDocumentRow,
  mapAuditRow,
} from '../utils/mappers.js';

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
    customers: customers.rows.map(mapCustomerRow),
    packages: packages.rows.map(mapPackageRow),
    groups: groups.rows.map(mapGroupRow),
    bookings: bookings.rows.map(mapBookingRow),
    payments: payments.rows.map(mapPaymentRow),
    documents: documents.rows.map(mapDocumentRow),
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
      const existing = await query(`SELECT password_hash FROM customers WHERE id = $1`, [c.id]);
      let passwordHash = existing.rows[0]?.password_hash;
      if (c.portalPassword) {
        passwordHash = await bcrypt.hash(c.portalPassword, 10);
      } else if (!passwordHash) {
        passwordHash = await bcrypt.hash('password123', 10);
      }

      await query(
        `INSERT INTO customers (id, serial_number, password_hash, full_name, phone, email, date_of_birth, gender, nationality, passport_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, guarantor_name, guarantor_phone, guarantor_relation, notes, photo_url, passport_document, agreement_document, created_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         ON CONFLICT (id) DO UPDATE SET serial_number=EXCLUDED.serial_number, password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, email=EXCLUDED.email, date_of_birth=EXCLUDED.date_of_birth, gender=EXCLUDED.gender, nationality=EXCLUDED.nationality, passport_number=EXCLUDED.passport_number, address=EXCLUDED.address, emergency_contact_name=EXCLUDED.emergency_contact_name, emergency_contact_phone=EXCLUDED.emergency_contact_phone, emergency_contact_relation=EXCLUDED.emergency_contact_relation, guarantor_name=EXCLUDED.guarantor_name, guarantor_phone=EXCLUDED.guarantor_phone, guarantor_relation=EXCLUDED.guarantor_relation, notes=EXCLUDED.notes, photo_url=EXCLUDED.photo_url, passport_document=EXCLUDED.passport_document, agreement_document=EXCLUDED.agreement_document`,
        [
          c.id, c.serialNumber || `HT-${c.id}`, passwordHash, c.fullName, c.phone, c.email || null,
          c.dateOfBirth || null, c.gender, c.nationality, c.passportNumber, c.address,
          c.emergencyContactName, c.emergencyContactPhone, c.emergencyContactRelation,
          c.guarantorName, c.guarantorPhone, c.guarantorRelation, c.notes || '',
          c.photoUrl, c.passportDocument ? JSON.stringify(c.passportDocument) : null,
          c.agreementDocument ? JSON.stringify(c.agreementDocument) : null,
          c.createdAt || new Date(), c.createdBy || userId,
        ]
      );
    }

    for (const p of data.packages || []) {
      await query(
        `INSERT INTO packages (id, name, type, price, description, status, total_seats, image_url, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, price=EXCLUDED.price, description=EXCLUDED.description, status=EXCLUDED.status, total_seats=EXCLUDED.total_seats, image_url=EXCLUDED.image_url`,
        [p.id, p.name, p.type, p.price, p.description, p.status, p.totalSeats || 600, p.imageUrl, p.createdAt || new Date()]
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
        `INSERT INTO bookings (id, reference, customer_id, package_id, group_id, booked_price, status, progress, notes, visa_document, ticket_document, created_at, created_by, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO UPDATE SET reference=EXCLUDED.reference, customer_id=EXCLUDED.customer_id, package_id=EXCLUDED.package_id, group_id=EXCLUDED.group_id, booked_price=EXCLUDED.booked_price, status=EXCLUDED.status, progress=EXCLUDED.progress, notes=EXCLUDED.notes, visa_document=EXCLUDED.visa_document, ticket_document=EXCLUDED.ticket_document, completed_at=EXCLUDED.completed_at`,
        [
          b.id, b.reference, b.customerId, b.packageId, b.groupId || null, b.bookedPrice,
          b.status, b.progress, b.notes || '',
          b.visaDocument ? JSON.stringify(b.visaDocument) : null,
          b.ticketDocument ? JSON.stringify(b.ticketDocument) : null,
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
      await query(
        `INSERT INTO documents (id, booking_id, type, file_name, file_size, file_path, preview_url, uploaded_at, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET booking_id=EXCLUDED.booking_id, type=EXCLUDED.type, file_name=EXCLUDED.file_name, file_size=EXCLUDED.file_size, file_path=EXCLUDED.file_path, preview_url=EXCLUDED.preview_url`,
        [d.id, d.bookingId, d.type, d.fileName, d.fileSize, d.filePath || null, d.previewUrl || null, d.uploadedAt || new Date(), d.uploadedBy || userId]
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
