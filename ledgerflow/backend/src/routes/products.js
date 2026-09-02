const express = require('express');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, price, stock, unit, hsn_code, gst_rate } = req.body;
    if (!name || price === undefined) return res.status(400).json({ message: 'Name and price are required.' });
    const result = await pool.query(
      `INSERT INTO products (user_id, name, description, price, stock, unit, hsn_code, gst_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, name, description, price, stock || 0, unit || 'pcs', hsn_code || null, gst_rate ?? 18]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, price, stock, unit, hsn_code, gst_rate } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, stock=$4, unit=$5, hsn_code=$6, gst_rate=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, description, price, stock, unit, hsn_code || null, gst_rate ?? 18, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
