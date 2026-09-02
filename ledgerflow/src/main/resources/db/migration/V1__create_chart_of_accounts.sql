-- ============================================================
-- V1: Chart of Accounts
-- The master taxonomy of every financial bucket in the business.
-- account_type drives which side (debit/credit) is "normal balance".
-- ============================================================

CREATE TYPE account_type AS ENUM (
    'ASSET',        -- Things the business owns (Cash, Equipment)
    'LIABILITY',    -- Things the business owes (Loans, Unpaid Bills)
    'EQUITY',       -- Owner's stake in the business
    'REVENUE',      -- Money earned from operations
    'EXPENSE'       -- Money spent running the business
);

CREATE TYPE normal_balance AS ENUM (
    'DEBIT',   -- ASSET, EXPENSE accounts increase with debits
    'CREDIT'   -- LIABILITY, EQUITY, REVENUE accounts increase with credits
);

CREATE TABLE chart_of_accounts (
    id              BIGSERIAL           PRIMARY KEY,
    company_id      BIGINT              NOT NULL,                          -- Tenant isolation
    account_code    VARCHAR(20)         NOT NULL,                          -- e.g. "1001", "4001"
    account_name    VARCHAR(150)        NOT NULL,                          -- e.g. "Cash in Hand"
    human_label     VARCHAR(150)        NOT NULL,                          -- e.g. "My Cash" (shown to user)
    account_type    account_type        NOT NULL,
    normal_balance  normal_balance      NOT NULL,
    parent_id       BIGINT              REFERENCES chart_of_accounts(id),  -- Hierarchical COA
    is_system       BOOLEAN             NOT NULL DEFAULT FALSE,             -- System accounts cannot be deleted
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    description     TEXT,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_account_code_per_company UNIQUE (company_id, account_code),
    CONSTRAINT uq_account_name_per_company UNIQUE (company_id, account_name)
);

-- Fast lookups by company and type (dashboard queries)
CREATE INDEX idx_coa_company_type ON chart_of_accounts(company_id, account_type);
CREATE INDEX idx_coa_company_active ON chart_of_accounts(company_id, is_active);
