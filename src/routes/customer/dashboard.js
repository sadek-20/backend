/** Customer portal (read-only): me, visa, ticket, payments, dashboard */

import { Router } from 'express';
import { requireCustomer } from '../../middleware/auth.js';
import { query } from '../../db/pool.js';
import { toDateOnlyOrEmpty } from '../../utils/mappers.js';

const router = Router();

router.use(requireCustomer);

async function getActiveBooking(customerId) {
  const { rows } = await query(
    `SELECT b.*, p.name AS package_name, p.type AS package_type
     FROM bookings b
     JOIN packages p ON p.id = b.package_id
     WHERE b.customer_id = $1 AND b.status = 'active'
     ORDER BY b.created_at DESC
     LIMIT 1`,
    [customerId]
  );
  return rows[0];
}

function paymentStatus(total, paid) {
  if (paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'pending';
}

async function buildPayment(booking) {
  if (!booking) {
    return { total: 0, paid: 0, currency: 'USD', status: 'pending', history: [] };
  }
  const { rows: payments } = await query(
    `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at`,
    [booking.id]
  );
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(booking.booked_price);
  return {
    total,
    paid,
    currency: 'USD',
    status: paymentStatus(total, paid),
    history: payments.map((p) => ({
      date: toDateOnlyOrEmpty(p.created_at),
      amount: Number(p.amount),
      method: p.method,
      status: 'paid',
    })),
  };
}

function customerName(customer) {
  return {
    en: customer.name_en || customer.full_name,
    ar: customer.name_ar || customer.full_name,
    so: customer.name_so || customer.full_name,
  };
}

router.get('/me', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM customers WHERE id = $1`, [req.customer.id]);
    const customer = rows[0];
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const booking = await getActiveBooking(customer.id);
    res.json({
      serialNumber: customer.serial_number,
      name: customerName(customer),
      email: customer.email || '',
      phone: customer.phone,
      package: booking ? booking.package_name : 'No active booking',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/visa', async (req, res) => {
  try {
    const booking = await getActiveBooking(req.customer.id);
    if (!booking) {
      return res.json({ status: 'pending', number: '', type: '', issueDate: '', expiryDate: '' });
    }
    res.json({
      number: booking.visa_number || '',
      type: booking.visa_type || '',
      status: booking.visa_status || 'pending',
      issueDate: toDateOnlyOrEmpty(booking.visa_issue_date),
      expiryDate: toDateOnlyOrEmpty(booking.visa_expiry_date),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ticket', async (req, res) => {
  try {
    const booking = await getActiveBooking(req.customer.id);
    if (!booking) {
      return res.json({
        airline: '',
        flightNo: '',
        from: '',
        to: '',
        date: '',
        returnDate: '',
        seat: '',
        class: '',
        status: 'pending',
      });
    }
    res.json({
      airline: booking.ticket_airline || '',
      flightNo: booking.ticket_flight_no || '',
      from: booking.ticket_from || '',
      to: booking.ticket_to || '',
      date: toDateOnlyOrEmpty(booking.ticket_date),
      returnDate: toDateOnlyOrEmpty(booking.ticket_return_date),
      seat: booking.ticket_seat || '',
      class: booking.ticket_class || '',
      status: booking.ticket_status || 'pending',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const booking = await getActiveBooking(req.customer.id);
    res.json(await buildPayment(booking));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM customers WHERE id = $1`, [req.customer.id]);
    const customer = rows[0];
    const booking = await getActiveBooking(customer.id);

    let visa = { number: '', type: '', status: 'pending', issueDate: '', expiryDate: '' };
    let ticket = {
      airline: '',
      flightNo: '',
      from: '',
      to: '',
      date: '',
      returnDate: '',
      seat: '',
      class: '',
      status: 'pending',
    };

    if (booking) {
      visa = {
        number: booking.visa_number || '',
        type: booking.visa_type || '',
        status: booking.visa_status || 'pending',
        issueDate: toDateOnlyOrEmpty(booking.visa_issue_date),
        expiryDate: toDateOnlyOrEmpty(booking.visa_expiry_date),
      };
      ticket = {
        airline: booking.ticket_airline || '',
        flightNo: booking.ticket_flight_no || '',
        from: booking.ticket_from || '',
        to: booking.ticket_to || '',
        date: toDateOnlyOrEmpty(booking.ticket_date),
        returnDate: toDateOnlyOrEmpty(booking.ticket_return_date),
        seat: booking.ticket_seat || '',
        class: booking.ticket_class || '',
        status: booking.ticket_status || 'pending',
      };
    }

    res.json({
      serialNumber: customer.serial_number,
      name: customerName(customer),
      email: customer.email || '',
      phone: customer.phone,
      package: booking?.package_name || 'No active booking',
      visa,
      ticket,
      payment: await buildPayment(booking),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
