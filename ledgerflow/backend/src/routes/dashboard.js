const express = require('express');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [revenue, expenses, unpaid, overdue, recentInvoices, monthlyRevenue] = await Promise.all([
      // Total revenue (paid invoices)
      pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
         FROM invoices WHERE user_id=$1 AND status='PAID'`, [userId]
      ),
      // Total expenses
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id=$1`, [userId]
      ),
      // Unpaid invoices total
      pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
         FROM invoices WHERE user_id=$1 AND status='UNPAID'`, [userId]
      ),
      // Overdue invoices
      pool.query(
        `SELECT COUNT(*) AS count FROM invoices
         WHERE user_id=$1 AND status='UNPAID' AND due_date < CURRENT_DATE`, [userId]
      ),
      // Recent 5 invoices
      pool.query(
        `SELECT i.id, i.invoice_number, i.total_amount, i.status, i.due_date, c.name AS customer_name
         FROM invoices i JOIN customers c ON c.id = i.customer_id
         WHERE i.user_id=$1 ORDER BY i.created_at DESC LIMIT 5`, [userId]
      ),
      // Monthly revenue last 6 months
      pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
                COALESCE(SUM(total_amount), 0) AS revenue
         FROM invoices
         WHERE user_id=$1 AND status='PAID'
           AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`, [userId]
      ),
    ]);

    res.json({
      totalRevenue: parseFloat(revenue.rows[0].total),
      totalExpenses: parseFloat(expenses.rows[0].total),
      netProfit: parseFloat(revenue.rows[0].total) - parseFloat(expenses.rows[0].total),
      unpaidTotal: parseFloat(unpaid.rows[0].total),
      unpaidCount: parseInt(unpaid.rows[0].count),
      overdueCount: parseInt(overdue.rows[0].count),
      recentInvoices: recentInvoices.rows,
      monthlyRevenue: monthlyRevenue.rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
