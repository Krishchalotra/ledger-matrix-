const express = require('express');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ message: 'Customer name is required.' });
    const result = await pool.query(
      'INSERT INTO customers (user_id, name, email, phone, address) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name, email, phone, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, phone, address } = req.body;
    const result = await pool.query(
      `UPDATE customers SET name=$1, email=$2, phone=$3, address=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [name, email, phone, address, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Customer not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM customers WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ message: 'Customer deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
