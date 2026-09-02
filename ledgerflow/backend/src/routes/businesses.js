const express = require('express');
const pool = require('../db/pool');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/businesses
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM businesses WHERE user_id=$1 ORDER BY is_default DESC, created_at ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/businesses
router.post('/', async (req, res, next) => {
  try {
    const { name, gstin, address, state_code, phone, email, logo_url } = req.body;
    if (!name) return res.status(400).json({ message: 'Business name is required.' });
    // First business becomes default
    const count = await pool.query('SELECT COUNT(*) FROM businesses WHERE user_id=$1', [req.user.id]);
    const is_default = parseInt(count.rows[0].count) === 0;
    const result = await pool.query(
      `INSERT INTO businesses (user_id, name, gstin, address, state_code, phone, email, logo_url, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, gstin, address, state_code, phone, email, logo_url, is_default]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/businesses/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, gstin, address, state_code, phone, email, logo_url } = req.body;
    const result = await pool.query(
      `UPDATE businesses SET name=$1, gstin=$2, address=$3, state_code=$4, phone=$5, email=$6, logo_url=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [name, gstin, address, state_code, phone, email, logo_url, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Business not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/businesses/:id/set-default
router.patch('/:id/set-default', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE businesses SET is_default=false WHERE user_id=$1', [req.user.id]);
    const result = await client.query('UPDATE businesses SET is_default=true WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id]);
    await client.query('COMMIT');
    if (!result.rows[0]) return res.status(404).json({ message: 'Business not found.' });
    res.json(result.rows[0]);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

// DELETE /api/businesses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM businesses WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Business not found.' });
    res.json({ message: 'Business deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
