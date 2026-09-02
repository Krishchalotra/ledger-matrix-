const { Pool } = require('pg');

const pool = new Pool({
  host:     'aws-0-ap-southeast-2.pooler.supabase.com',
  port:     5432,
  database: 'postgres',
  user:     'postgres.jegbjyrtqdpyhlwcngqg',
  password: 'LedgerFlowDB2026Secure',
  ssl:      { rejectUnauthorized: false },
  max:      10,
  idleTimeoutMillis:      60000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
