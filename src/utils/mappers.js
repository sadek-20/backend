/** DB row → frontend JSON (snake_case → camelCase) */

export function toIso(val) {
  if (!val) return null;
  return val instanceof Date ? val.toISOString() : String(val);
}

/** Always YYYY-MM-DD for PostgreSQL DATE columns (never "Fri Mar 15") */
export function toDateOnly(val) {
  if (val == null || val === '') return null;

  if (typeof val === 'string') {
    const iso = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    // Reject short locale leftovers like "Fri Mar 15" (no year → unreliable)
    if (!/\d{4}/.test(val)) return null;
    const parsed = new Date(val);
    if (Number.isNaN(parsed.getTime())) return null;
    return localYmd(parsed);
  }

  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    // Use local calendar day (pg DATE often arrives as local midnight)
    return localYmd(val);
  }

  return null;
}

function localYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toDateOnlyOrEmpty(val) {
  return toDateOnly(val) || '';
}

export function mapStaffRow(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    fullName: row.full_name,
    isActive: row.is_active,
    createdAt: toIso(row.created_at),
  };
}

export function mapCustomerRow(row) {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    portalPassword: undefined,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email || '',
    dateOfBirth: toDateOnly(row.date_of_birth),
    gender: row.gender,
    nationality: row.nationality,
    passportNumber: row.passport_number,
    address: row.address,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    emergencyContactRelation: row.emergency_contact_relation,
    guarantorName: row.guarantor_name,
    guarantorPhone: row.guarantor_phone,
    guarantorRelation: row.guarantor_relation,
    notes: row.notes || '',
    photoUrl: row.photo_url,
    passportDocument: row.passport_document,
    agreementDocument: row.agreement_document,
    createdAt: toIso(row.created_at),
    createdBy: row.created_by,
  };
}

export function mapPackageRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    price: Number(row.price),
    description: row.description,
    status: row.status,
    totalSeats: row.total_seats,
    imageUrl: row.image_url,
    createdAt: toIso(row.created_at),
  };
}

export function mapGroupRow(row) {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes || '',
    createdAt: toIso(row.created_at),
  };
}

export function mapBookingRow(row) {
  return {
    id: row.id,
    reference: row.reference,
    customerId: row.customer_id,
    packageId: row.package_id,
    groupId: row.group_id,
    bookedPrice: Number(row.booked_price),
    status: row.status,
    progress: row.progress,
    progressManual: row.progress_manual ?? false,
    notes: row.notes || '',
    visaDocument: row.visa_document,
    ticketDocument: row.ticket_document,
    visaNumber: row.visa_number,
    visaType: row.visa_type,
    visaStatus: row.visa_status,
    visaIssueDate: toDateOnlyOrEmpty(row.visa_issue_date),
    visaExpiryDate: toDateOnlyOrEmpty(row.visa_expiry_date),
    ticketAirline: row.ticket_airline,
    ticketFlightNo: row.ticket_flight_no,
    ticketFrom: row.ticket_from,
    ticketTo: row.ticket_to,
    ticketDate: toDateOnlyOrEmpty(row.ticket_date),
    ticketReturnDate: toDateOnlyOrEmpty(row.ticket_return_date),
    ticketSeat: row.ticket_seat,
    ticketClass: row.ticket_class,
    ticketStatus: row.ticket_status,
    createdAt: toIso(row.created_at),
    createdBy: row.created_by,
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
  };
}

export function mapPaymentRow(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    amount: Number(row.amount),
    method: row.method,
    receiptNumber: row.receipt_number,
    notes: row.notes || '',
    createdAt: toIso(row.created_at),
    createdBy: row.created_by,
  };
}

export function mapDocumentRow(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    type: row.type,
    fileName: row.file_name,
    fileSize: row.file_size,
    filePath: row.file_path,
    previewUrl: row.preview_url,
    uploadedAt: toIso(row.uploaded_at),
    uploadedBy: row.uploaded_by,
  };
}

export function mapAuditRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    module: row.module,
    details: row.details,
    createdAt: toIso(row.created_at),
  };
}
