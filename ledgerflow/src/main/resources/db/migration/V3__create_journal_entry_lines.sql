-- ============================================================
-- V3: Journal Entry Lines
-- Individual debit/credit legs of a journal entry.
-- THE INVARIANT: SUM(debit_amount) = SUM(credit_amount) per journal_entry_id.
-- This is enforced at the application layer (FinancialDataException + ROLLBACK)
-- AND defended here with a partial index to detect violations at the DB level.
-- ============================================================

CREATE TABLE journal_entry_lines (
    id                  BIGSERIAL       PRIMARY KEY,
    journal_entry_id    BIGINT          NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
    account_id          BIGINT          NOT NULL REFERENCES chart_of_accounts(id),
    line_number         SMALLINT        NOT NULL,      -- Ordering within the entry (1, 2, 3...)
    debit_amount        NUMERIC(19,4)   NOT NULL DEFAULT 0,   -- NUMERIC, never FLOAT. 4dp for paisa-level precision.
    credit_amount       NUMERIC(19,4)   NOT NULL DEFAULT 0,   -- Exactly one of these will be non-zero per line.
    description         TEXT,                          -- Optional line-level narration
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- A line cannot be both a debit and a credit simultaneously
    CONSTRAINT chk_debit_credit_exclusive CHECK (
        (debit_amount > 0 AND credit_amount = 0)
        OR
        (credit_amount > 0 AND debit_amount = 0)
    ),
    -- No zero-value lines allowed
    CONSTRAINT chk_no_zero_lines CHECK (
        debit_amount > 0 OR credit_amount > 0
    ),
    -- No negative amounts
    CONSTRAINT chk_positive_amounts CHECK (
        debit_amount >= 0 AND credit_amount >= 0
    ),
    CONSTRAINT uq_line_number_per_entry UNIQUE (journal_entry_id, line_number)
);

CREATE INDEX idx_jel_entry_id    ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account_id  ON journal_entry_lines(account_id);

-- ============================================================
-- V3b: Account Balance Ledger (Running Balance Cache)
-- Recomputed on every POSTED entry. Avoids full-table SUM scans
-- on large datasets. Source of truth is always journal_entry_lines.
-- ============================================================

CREATE TABLE account_balances (
    id                  BIGSERIAL       PRIMARY KEY,
    company_id          BIGINT          NOT NULL,
    account_id          BIGINT          NOT NULL REFERENCES chart_of_accounts(id),
    fiscal_year         SMALLINT        NOT NULL,
    fiscal_month        SMALLINT        NOT NULL CHECK (fiscal_month BETWEEN 1 AND 12),
    total_debit         NUMERIC(19,4)   NOT NULL DEFAULT 0,
    total_credit        NUMERIC(19,4)   NOT NULL DEFAULT 0,
    closing_balance     NUMERIC(19,4)   NOT NULL DEFAULT 0,  -- Signed: positive = normal balance side
    last_updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_balance_per_account_period UNIQUE (account_id, fiscal_year, fiscal_month)
);

CREATE INDEX idx_ab_company_period ON account_balances(company_id, fiscal_year, fiscal_month);
