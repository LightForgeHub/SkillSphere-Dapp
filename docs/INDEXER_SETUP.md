# Stellar / Soroban Contract Event Indexer Service

The **SkillSphere Soroban Event Indexer** is a backend service designed to monitor, filter, decode, and synchronize on-chain smart contract events from Stellar/Soroban RPC into PostgreSQL.

## Core Features

- **Interval Polling Engine**: Periodically polls the configured Stellar / Soroban RPC endpoint for contract events emitted by Escrow and Dispute smart contracts.
- **XDR Event Decoder**: Decodes binary XDR event topics and payloads into normalized JSON structures (`fund_session`, `pause_session`, `refund_session`, `complete_session`, `resolve_dispute`).
- **Resilient & Crash-Proof**: Safe XDR parsing wrappers ensure malformed event payloads, invalid topics, or network timeouts never crash the indexer daemon.
- **Idempotent Processing**: Records event IDs in `processed_events` to prevent double-processing or duplicate transaction entries.
- **Ledger Sequence Checkpointing**: Automatically persists the `last_ledger_sequence` in `ledger_checkpoints` so service restarts resume smoothly from the last synchronized block.
- **Database Adapters**: Supports PostgreSQL (`pg.Pool`) with auto-migrating SQL schema and an in-memory fallback for local lightweight development or unit tests.

---

## Environment Variables

Configure the service by setting environment variables in `.env` or system environment:

| Variable | Description | Default Value |
|---|---|---|
| `SOROBAN_RPC_URL` | Soroban RPC endpoint URL | `https://soroban-testnet.stellar.org` |
| `ESCROW_CONTRACT_ID` | Soroban Escrow Contract Address | `CC3W26Q6Q...` |
| `DISPUTE_CONTRACT_ID` | Soroban Dispute Contract Address | `CD3W26Q6Q...` |
| `POLL_INTERVAL_MS` | Polling interval in milliseconds | `3000` |
| `BATCH_LIMIT` | Event batch fetch limit | `100` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/skillsphere` |
| `START_LEDGER` | Fallback starting ledger if no checkpoint exists | `1` |

---

## Running the Indexer

### 1. Start the Indexer Daemon

To run the indexer in development or production mode:

```bash
npm run indexer
```

### 2. Run the Unit & Integration Test Suite

To run all event parsing, non-crash error handling, idempotency, and checkpoint recovery tests:

```bash
npm run test:indexer
```

---

## PostgreSQL Database Schema

When `DATABASE_URL` is configured, the indexer auto-initializes the following SQL schema:

```sql
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
```

---

## Supported Contract Events

1. **`fund_session` / `start_session`**
   - Updates `Session` status to `'active'`.
   - Inserts `Transaction` record with type `'deposit'` and status `'completed'`.
2. **`pause_session`**
   - Updates `Session` status to `'paused'`.
3. **`refund_session` / `cancel_session`**
   - Updates `Session` status to `'cancelled'`.
   - Inserts `Transaction` record with type `'refund'` and status `'completed'`.
4. **`complete_session` / `settle_session`**
   - Updates `Session` status to `'completed'`.
   - Inserts `Transaction` record with type `'settlement'` and status `'completed'`.
5. **`resolve_dispute`**
   - Updates `Session` status to `'completed'`.
   - Inserts `Transaction` record with type `'settlement'` and status `'completed'`.
