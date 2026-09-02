const express = require('express');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/expenses
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id=$1 ORDER BY expense_date DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/expenses
router.post('/', async (req, res, next) => {
  try {
    const { category, description, amount, expense_date } = req.body;
    if (!category || !description || !amount)
      return res.status(400).json({ message: 'Category, description, and amount are required.' });
    const result = await pool.query(
      `INSERT INTO expenses (user_id, category, description, amount, expense_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, category, description, amount, expense_date || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM expenses WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Expense not found.' });
    res.json({ message: 'Expense deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
