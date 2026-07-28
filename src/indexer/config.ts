export interface IndexerConfig {
  rpcUrl: string;
  escrowContractId: string;
  disputeContractId: string;
  pollIntervalMs: number;
  batchLimit: number;
  databaseUrl?: string;
  startLedger: number;
}

export function loadIndexerConfig(): IndexerConfig {
  return {
    rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    escrowContractId: process.env.ESCROW_CONTRACT_ID || 'CC3W26Q6Q32A7O5ZFX2Q37W7EX5R2N3O5W4Q2Z5W4Q2Z5W4Q2Z5W4Q2Z',
    disputeContractId: process.env.DISPUTE_CONTRACT_ID || 'CD3W26Q6Q32A7O5ZFX2Q37W7EX5R2N3O5W4Q2Z5W4Q2Z5W4Q2Z5W4Q2Z',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '3000', 10),
    batchLimit: parseInt(process.env.BATCH_LIMIT || '100', 10),
    databaseUrl: process.env.DATABASE_URL,
    startLedger: parseInt(process.env.START_LEDGER || '1', 10),
  };
}
