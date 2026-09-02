const express = require('express');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/invoices
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.gstin AS customer_gstin
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       WHERE i.user_id=$1 ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email,
              c.address AS customer_address, c.gstin AS customer_gstin, c.state_code AS customer_state,
              b.name AS business_name, b.gstin AS business_gstin, b.address AS business_address,
              b.state_code AS business_state, b.phone AS business_phone, b.email AS business_email
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       LEFT JOIN businesses b ON b.id = i.business_id
       WHERE i.id=$1 AND i.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!inv.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    const items = await pool.query(
      `SELECT ii.*, p.name AS product_name, p.unit
       FROM invoice_items ii JOIN products p ON p.id = ii.product_id
       WHERE ii.invoice_id=$1`,
      [req.params.id]
    );
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

// POST /api/invoices — ATOMIC, with GST calc
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { customer_id, due_date, supply_type = 'intra', place_of_supply, notes, items, business_id } = req.body;
    if (!customer_id || !due_date || !items?.length)
      return res.status(400).json({ message: 'Customer, due date, and at least one item are required.' });

    await client.query('BEGIN');

    const countResult = await client.query('SELECT COUNT(*) FROM invoices WHERE user_id=$1', [req.user.id]);
    const invoiceNumber = `INV-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let total_cgst = 0, total_sgst = 0, total_igst = 0;
    const resolvedItems = [];

    for (const item of items) {
      const pr = await client.query('SELECT * FROM products WHERE id=$1 AND user_id=$2 FOR UPDATE', [item.product_id, req.user.id]);
      const product = pr.rows[0];
      if (!product) throw Object.assign(new Error(`Product ${item.product_id} not found.`), { status: 404 });
      if (product.stock < item.quantity)
        throw Object.assign(new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`), { status: 400 });

      const lineTotal = parseFloat(product.price) * item.quantity;
      const gst_rate = parseFloat(product.gst_rate || 18);
      const gstAmt = parseFloat(((lineTotal * gst_rate) / 100).toFixed(2));

      let cgst = 0, sgst = 0, igst = 0;
      if (supply_type === 'intra') { cgst = parseFloat((gstAmt / 2).toFixed(2)); sgst = parseFloat((gstAmt / 2).toFixed(2)); }
      else { igst = gstAmt; }

      subtotal += lineTotal;
      total_cgst += cgst; total_sgst += sgst; total_igst += igst;

      resolvedItems.push({
        product_id: product.id, quantity: item.quantity, unit_price: product.price,
        line_total: lineTotal, hsn_code: product.hsn_code, gst_rate,
        cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst
      });

      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [item.quantity, product.id]);
    }

    const tax_amount = parseFloat((total_cgst + total_sgst + total_igst).toFixed(2));
    const total_amount = parseFloat((subtotal + tax_amount).toFixed(2));

    // Resolve business_id — use provided or default
    let biz_id = business_id || null;
    if (!biz_id) {
      const biz = await client.query('SELECT id FROM businesses WHERE user_id=$1 AND is_default=true LIMIT 1', [req.user.id]);
      if (biz.rows[0]) biz_id = biz.rows[0].id;
    }

    const invoiceResult = await client.query(
      `INSERT INTO invoices (user_id, customer_id, invoice_number, due_date, supply_type, place_of_supply,
         subtotal, tax_rate, tax_amount, cgst_amount, sgst_amount, igst_amount, total_amount, notes, business_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.user.id, customer_id, invoiceNumber, due_date, supply_type, place_of_supply || null,
       subtotal.toFixed(2), 0, tax_amount, total_cgst.toFixed(2), total_sgst.toFixed(2), total_igst.toFixed(2), total_amount, notes, biz_id]
    );
    const invoice = invoiceResult.rows[0];

    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total, hsn_code, gst_rate, cgst_amount, sgst_amount, igst_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [invoice.id, item.product_id, item.quantity, item.unit_price, item.line_total,
         item.hsn_code, item.gst_rate, item.cgst_amount, item.sgst_amount, item.igst_amount]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(invoice);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const items = await client.query('SELECT product_id, quantity FROM invoice_items WHERE invoice_id=$1', [req.params.id]);
    for (const item of items.rows) {
      await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
    }
    const result = await client.query('DELETE FROM invoices WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Invoice not found.' }); }
    await client.query('COMMIT');
    res.json({ message: 'Invoice deleted.' });
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

// PATCH /api/invoices/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['UNPAID','PAID','OVERDUE','CANCELLED'].includes(status))
      return res.status(400).json({ message: 'Invalid status.' });
    const result = await pool.query(
      'UPDATE invoices SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [status, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
