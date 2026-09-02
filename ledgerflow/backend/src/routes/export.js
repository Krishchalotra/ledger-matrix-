const express = require('express');
const XLSX = require('xlsx');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';

// GET /api/export/invoices?format=csv|xlsx
router.get('/invoices', async (req, res, next) => {
  try {
    const { format = 'xlsx' } = req.query;
    const result = await pool.query(
      `SELECT i.invoice_number, c.name AS customer, c.gstin AS customer_gstin,
              i.issue_date, i.due_date, i.status, i.supply_type,
              i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount,
              i.tax_amount, i.total_amount, i.place_of_supply
       FROM invoices i JOIN customers c ON c.id=i.customer_id
       WHERE i.user_id=$1 ORDER BY i.issue_date DESC`,
      [req.user.id]
    );

    const rows = result.rows.map(r => ({
      'Invoice #': r.invoice_number,
      'Customer': r.customer,
      'Customer GSTIN': r.customer_gstin || '',
      'Issue Date': fmtDate(r.issue_date),
      'Due Date': fmtDate(r.due_date),
      'Status': r.status,
      'Supply Type': r.supply_type === 'inter' ? 'Inter-State' : 'Intra-State',
      'Place of Supply': r.place_of_supply || '',
      'Subtotal': Number(r.subtotal),
      'CGST': Number(r.cgst_amount),
      'SGST': Number(r.sgst_amount),
      'IGST': Number(r.igst_amount),
      'Total Tax': Number(r.tax_amount),
      'Total Amount': Number(r.total_amount),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.xlsx"');
    res.send(buf);
  } catch (err) { next(err); }
});

// GET /api/export/expenses?format=csv|xlsx
router.get('/expenses', async (req, res, next) => {
  try {
    const { format = 'xlsx' } = req.query;
    const result = await pool.query(
      'SELECT category, description, amount, expense_date FROM expenses WHERE user_id=$1 ORDER BY expense_date DESC',
      [req.user.id]
    );

    const rows = result.rows.map(r => ({
      'Category': r.category,
      'Description': r.description,
      'Amount': Number(r.amount),
      'Date': fmtDate(r.expense_date),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.xlsx"');
    res.send(buf);
  } catch (err) { next(err); }
});

// GET /api/export/gstr1?month=8&year=2026
router.get('/gstr1', async (req, res, next) => {
  try {
    const { month, year, format = 'xlsx' } = req.query;
    let dateFilter = '';
    const params = [req.user.id];
    if (month && year) {
      params.push(year, month);
      dateFilter = `AND EXTRACT(YEAR FROM i.issue_date)=$2 AND EXTRACT(MONTH FROM i.issue_date)=$3`;
    }

    const result = await pool.query(
      `SELECT i.invoice_number, i.issue_date, c.name AS customer_name, c.gstin AS customer_gstin,
              c.state_code AS customer_state, i.supply_type, i.place_of_supply,
              i.subtotal, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount
       FROM invoices i JOIN customers c ON c.id=i.customer_id
       WHERE i.user_id=$1 AND i.status='PAID' ${dateFilter}
       ORDER BY i.issue_date`,
      params
    );

    const rows = result.rows.map(r => ({
      'Invoice No': r.invoice_number,
      'Invoice Date': fmtDate(r.issue_date),
      'Customer Name': r.customer_name,
      'Customer GSTIN': r.customer_gstin || 'URP',
      'Customer State': r.customer_state || '',
      'Place of Supply': r.place_of_supply || '',
      'Supply Type': r.supply_type === 'inter' ? 'Inter-State' : 'Intra-State',
      'Taxable Value': Number(r.subtotal),
      'CGST': Number(r.cgst_amount),
      'SGST': Number(r.sgst_amount),
      'IGST': Number(r.igst_amount),
      'Invoice Value': Number(r.total_amount),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR-1 B2B');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="gstr1.csv"');
      return res.send(XLSX.utils.sheet_to_csv(ws));
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="gstr1.xlsx"');
    res.send(buf);
  } catch (err) { next(err); }
});

module.exports = router;
