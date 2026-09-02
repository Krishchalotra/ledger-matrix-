const express = require('express');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw Object.assign(new Error('Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env'), { status: 503 });
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

// POST /api/payments/invoice/:id/payment-link — create Razorpay payment link
router.post('/invoice/:id/payment-link', protect, async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       WHERE i.id=$1 AND i.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!inv.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    const invoice = inv.rows[0];
    if (invoice.status === 'PAID') return res.status(400).json({ message: 'Invoice is already paid.' });

    const razorpay = getRazorpay();
    const link = await razorpay.paymentLink.create({
      amount: Math.round(parseFloat(invoice.total_amount) * 100), // paise
      currency: 'INR',
      description: `Payment for ${invoice.invoice_number}`,
      customer: {
        name: invoice.customer_name,
        email: invoice.customer_email || undefined,
        contact: invoice.customer_phone || undefined,
      },
      notify: { sms: !!invoice.customer_phone, email: !!invoice.customer_email },
      reminder_enable: true,
      notes: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoices`,
      callback_method: 'get',
    });

    await pool.query(
      `UPDATE invoices SET razorpay_payment_link_id=$1, razorpay_payment_link_url=$2, razorpay_payment_link_status=$3
       WHERE id=$4`,
      [link.id, link.short_url, link.status, invoice.id]
    );

    res.json({ payment_link_url: link.short_url, payment_link_id: link.id });
  } catch (err) { next(err); }
});

// POST /api/payments/webhook — Razorpay webhook to auto-mark paid
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const crypto = require('crypto');
      const sig = req.headers['x-razorpay-signature'];
      const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
      if (sig !== expected) return res.status(400).json({ message: 'Invalid signature.' });
    }
    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment_link.paid') {
      const linkId = event.payload.payment_link?.entity?.id;
      if (linkId) {
        await pool.query(
          `UPDATE invoices SET status='PAID', razorpay_payment_link_status='paid' WHERE razorpay_payment_link_id=$1`,
          [linkId]
        );
      }
    }
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ message: 'Webhook error.' });
  }
});

// GET /api/payments/invoice/:id/qr — get QR code for payment link
router.get('/invoice/:id/qr', protect, async (req, res, next) => {
  try {
    const inv = await pool.query(
      'SELECT razorpay_payment_link_url, invoice_number, total_amount FROM invoices WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!inv.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    const { razorpay_payment_link_url, invoice_number, total_amount } = inv.rows[0];
    if (!razorpay_payment_link_url) return res.status(400).json({ message: 'No payment link generated yet.' });

    const qrDataUrl = await QRCode.toDataURL(razorpay_payment_link_url, {
      width: 300, margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' }
    });
    res.json({ qr: qrDataUrl, url: razorpay_payment_link_url, invoice_number, total_amount });
  } catch (err) { next(err); }
});

// GET /api/payments/invoice/:id/share — get sharing info (WhatsApp, SMS links)
router.get('/invoice/:id/share', protect, async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT i.invoice_number, i.total_amount, i.razorpay_payment_link_url,
              c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
       FROM invoices i JOIN customers c ON c.id=i.customer_id
       WHERE i.id=$1 AND i.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!inv.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    const { invoice_number, total_amount, razorpay_payment_link_url, customer_name, customer_phone, customer_email } = inv.rows[0];

    const amount = `₹${Number(total_amount).toLocaleString('en-IN')}`;
    const msg = `Hi ${customer_name}, your invoice ${invoice_number} for ${amount} is ready. Pay here: ${razorpay_payment_link_url}`;
    const whatsappUrl = `https://wa.me/${customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    const smsUrl = `sms:${customer_phone}?body=${encodeURIComponent(msg)}`;
    const mailUrl = `mailto:${customer_email}?subject=Invoice ${invoice_number}&body=${encodeURIComponent(msg)}`;

    res.json({ message: msg, whatsapp_url: whatsappUrl, sms_url: smsUrl, mail_url: mailUrl, payment_url: razorpay_payment_link_url });
  } catch (err) { next(err); }
});

module.exports = router;
