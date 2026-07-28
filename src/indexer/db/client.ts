/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

export interface ProcessedEventRecord {
  eventId: string;
  contractId: string;
  topic: string;
  ledgerSequence: number;
  transactionHash: string;
  payload: Record<string, unknown>;
}

export interface SessionUpdate {
  sessionId: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled' | 'paused';
  transactionHash?: string;
  price?: string;
  expertId?: string;
  seekerId?: string;
  network?: 'testnet' | 'mainnet';
}

export interface TransactionRecord {
  id: string;
  hash: string;
  type: 'deposit' | 'settlement' | 'withdrawal' | 'refund';
  amount: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  network: 'testnet' | 'mainnet';
  sessionId?: string;
}

export interface DBClient {
  init(): Promise<void>;
  getLastLedger(checkpointId: string, defaultLedger: number): Promise<number>;
  saveLedger(checkpointId: string, ledgerSequence: number): Promise<void>;
  isEventProcessed(eventId: string): Promise<boolean>;
  recordEventAndStateUpdate(
    eventData: ProcessedEventRecord,
    sessionUpdate?: SessionUpdate,
    txRecord?: TransactionRecord,
    newLedgerSequence?: number
  ): Promise<void>;
  getSession(sessionId: string): Promise<SessionUpdate | null>;
  getTransaction(txId: string): Promise<TransactionRecord | null>;
  close(): Promise<void>;
}

let PoolClass: any = null;
try {
  const pg = require('pg');
  PoolClass = pg.Pool;
} catch {
  // pg module fallback when running standalone without PostgreSQL
}

/**
 * PostgreSQL Database Adapter implementing atomic database updates & checkpointing.
 */
export class PostgresDBClient implements DBClient {
  private pool: any = null;
  private connectionString?: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString;
  }

  async init(): Promise<void> {
    if (!this.connectionString) return;
    if (!PoolClass) throw new Error('pg module is not installed');
    
    this.pool = new PoolClass({
      connectionString: this.connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ledger_checkpoints (
            id VARCHAR(64) PRIMARY KEY,
            last_ledger_sequence BIGINT NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS processed_events (
            event_id VARCHAR(128) PRIMARY KEY,
            contract_id VARCHAR(128) NOT NULL,
            topic VARCHAR(64) NOT NULL,
            ledger_sequence BIGINT NOT NULL,
            transaction_hash VARCHAR(128),
            payload JSONB NOT NULL,
            processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

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
      `);
    } finally {
      client.release();
    }
  }

  async getLastLedger(checkpointId: string, defaultLedger: number): Promise<number> {
    if (!this.pool) return defaultLedger;
    const res = await this.pool.query(
      'SELECT last_ledger_sequence FROM ledger_checkpoints WHERE id = $1',
      [checkpointId]
    );
    if (res.rows.length === 0) return defaultLedger;
    return parseInt(res.rows[0].last_ledger_sequence, 10);
  }

  async saveLedger(checkpointId: string, ledgerSequence: number): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO ledger_checkpoints (id, last_ledger_sequence, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET last_ledger_sequence = EXCLUDED.last_ledger_sequence, updated_at = CURRENT_TIMESTAMP`,
      [checkpointId, ledgerSequence]
    );
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    if (!this.pool) return false;
    const res = await this.pool.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1',
      [eventId]
    );
    return res.rows.length > 0;
  }

  async recordEventAndStateUpdate(
    eventData: ProcessedEventRecord,
    sessionUpdate?: SessionUpdate,
    txRecord?: TransactionRecord,
    newLedgerSequence?: number
  ): Promise<void> {
    if (!this.pool) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Store Processed Event (Idempotent ignore on conflict)
      await client.query(
        `INSERT INTO processed_events (event_id, contract_id, topic, ledger_sequence, transaction_hash, payload)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (event_id) DO NOTHING`,
        [
          eventData.eventId,
          eventData.contractId,
          eventData.topic,
          eventData.ledgerSequence,
          eventData.transactionHash,
          JSON.stringify(eventData.payload),
        ]
      );

      // 2. Update Session Status & Tx Hash if sessionUpdate is provided
      if (sessionUpdate) {
        await client.query(
          `INSERT INTO sessions (id, status, transaction_hash, price, expert_id, seeker_id, network, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             transaction_hash = COALESCE(EXCLUDED.transaction_hash, sessions.transaction_hash),
             price = COALESCE(EXCLUDED.price, sessions.price),
             updated_at = CURRENT_TIMESTAMP`,
          [
            sessionUpdate.sessionId,
            sessionUpdate.status,
            sessionUpdate.transactionHash || null,
            sessionUpdate.price || null,
            sessionUpdate.expertId || null,
            sessionUpdate.seekerId || null,
            sessionUpdate.network || 'testnet',
          ]
        );
      }

      // 3. Record Transaction if txRecord is provided
      if (txRecord) {
        await client.query(
          `INSERT INTO transactions (id, hash, type, amount, date, status, network, session_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             amount = EXCLUDED.amount`,
          [
            txRecord.id,
            txRecord.hash,
            txRecord.type,
            txRecord.amount,
            txRecord.date,
            txRecord.status,
            txRecord.network,
            txRecord.sessionId || null,
          ]
        );
      }

      // 4. Update Ledger Checkpoint
      if (newLedgerSequence !== undefined) {
        await client.query(
          `INSERT INTO ledger_checkpoints (id, last_ledger_sequence, updated_at)
           VALUES ('soroban_indexer', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET last_ledger_sequence = EXCLUDED.last_ledger_sequence, updated_at = CURRENT_TIMESTAMP`,
          [newLedgerSequence]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSession(sessionId: string): Promise<SessionUpdate | null> {
    if (!this.pool) return null;
    const res = await this.pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      sessionId: row.id,
      status: row.status,
      transactionHash: row.transaction_hash,
      price: row.price,
      expertId: row.expert_id,
      seekerId: row.seeker_id,
      network: row.network,
    };
  }

  async getTransaction(txId: string): Promise<TransactionRecord | null> {
    if (!this.pool) return null;
    const res = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [txId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      hash: row.hash,
      type: row.type,
      amount: row.amount,
      date: row.date,
      status: row.status,
      network: row.network,
      sessionId: row.session_id,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

/**
 * In-Memory Database Client fallback for testing & non-DB standalone executions.
 */
export class InMemoryDBClient implements DBClient {
  private checkpoints: Map<string, number> = new Map();
  private processedEvents: Set<string> = new Set();
  private eventRecords: Map<string, ProcessedEventRecord> = new Map();
  private sessions: Map<string, SessionUpdate> = new Map();
  private transactions: Map<string, TransactionRecord> = new Map();

  async init(): Promise<void> {}

  async getLastLedger(checkpointId: string, defaultLedger: number): Promise<number> {
    return this.checkpoints.get(checkpointId) ?? defaultLedger;
  }

  async saveLedger(checkpointId: string, ledgerSequence: number): Promise<void> {
    this.checkpoints.set(checkpointId, ledgerSequence);
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  async recordEventAndStateUpdate(
    eventData: ProcessedEventRecord,
    sessionUpdate?: SessionUpdate,
    txRecord?: TransactionRecord,
    newLedgerSequence?: number
  ): Promise<void> {
    this.processedEvents.add(eventData.eventId);
    this.eventRecords.set(eventData.eventId, eventData);

    if (sessionUpdate) {
      const existing = this.sessions.get(sessionUpdate.sessionId);
      this.sessions.set(sessionUpdate.sessionId, {
        ...existing,
        ...sessionUpdate,
      });
    }

    if (txRecord) {
      this.transactions.set(txRecord.id, txRecord);
    }

    if (newLedgerSequence !== undefined) {
      this.checkpoints.set('soroban_indexer', newLedgerSequence);
    }
  }

  async getSession(sessionId: string): Promise<SessionUpdate | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getTransaction(txId: string): Promise<TransactionRecord | null> {
    return this.transactions.get(txId) || null;
  }

  async close(): Promise<void> {}
}

export function createDBClient(connectionString?: string): DBClient {
  if (connectionString && connectionString.trim() !== '') {
    return new PostgresDBClient(connectionString);
  }
  return new InMemoryDBClient();
}
