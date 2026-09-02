-- ============================================================
-- LedgerFlow Database Schema
-- All currency fields use NUMERIC(12,2) — zero floating-point risk
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER','ACCOUNTANT','ADMIN')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(20),
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    unit        VARCHAR(30) NOT NULL DEFAULT 'pcs',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id     INT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_number  VARCHAR(30) NOT NULL,
    issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID','PAID','OVERDUE','CANCELLED')),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, invoice_number)
);

-- INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    id          SERIAL PRIMARY KEY,
    invoice_id  INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id  INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total  NUMERIC(12,2) NOT NULL
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_user     ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_user     ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user     ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user    ON customers(user_id);
