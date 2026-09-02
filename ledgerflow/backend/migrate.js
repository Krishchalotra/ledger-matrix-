require('dotenv').config();
const pool = require('./src/db/pool');

const sql = `
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state_code VARCHAR(2);

ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(8);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supply_type VARCHAR(10) NOT NULL DEFAULT 'intra';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS business_id INT REFERENCES businesses(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS razorpay_payment_link_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS razorpay_payment_link_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS razorpay_payment_link_status VARCHAR(30);

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(8);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS businesses (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  gstin       VARCHAR(15),
  address     TEXT,
  state_code  VARCHAR(2),
  phone       VARCHAR(20),
  email       VARCHAR(255),
  logo_url    TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id);
`;

async function migrate() {
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      console.log('OK:', stmt.substring(0, 60));
    } catch (e) {
      console.error('ERR:', e.message, '->', stmt.substring(0, 60));
    }
  }
  console.log('Migration complete.');
  process.exit(0);
}

migrate();
