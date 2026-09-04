require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: '*' }));

// Raw body for Razorpay webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/customers',  require('./routes/customers'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/invoices',   require('./routes/invoices'));
app.use('/api/expenses',   require('./routes/expenses'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/pdf',        require('./routes/pdf'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/export',     require('./routes/export'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Ledger Matrix API' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Ledger Matrix API running on port ${PORT}`));
