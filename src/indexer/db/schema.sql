-- Ledger Checkpoints Table
CREATE TABLE IF NOT EXISTS ledger_checkpoints (
    id VARCHAR(64) PRIMARY KEY,
    last_ledger_sequence BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Processed Events Table (for Idempotency)
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(128) PRIMARY KEY,
    contract_id VARCHAR(128) NOT NULL,
    topic VARCHAR(64) NOT NULL,
    ledger_sequence BIGINT NOT NULL,
    transaction_hash VARCHAR(128),
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(256),
    expert_id VARCHAR(128),
    seeker_id VARCHAR(128),
    status VARCHAR(64) NOT NULL,
    price VARCHAR(64),
    transaction_hash VARCHAR(128),
    network VARCHAR(32) DEFAULT 'testnet',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(128) PRIMARY KEY,
    hash VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount VARCHAR(64) NOT NULL,
    date VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    network VARCHAR(32) DEFAULT 'testnet',
    session_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_events_contract ON processed_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_processed_events_ledger ON processed_events(ledger_sequence);
CREATE INDEX IF NOT EXISTS idx_transactions_session ON transactions(session_id);
