import { loadIndexerConfig } from './config';
import { createDBClient } from './db/client';
import { SorobanEventPoller } from './poller';

async function main() {
  console.log('====================================================');
  console.log('  SkillSphere Stellar / Soroban Event Indexer Daemon');
  console.log('====================================================');

  const config = loadIndexerConfig();
  console.log(`RPC Endpoint: ${config.rpcUrl}`);
  console.log(`Escrow Contract ID: ${config.escrowContractId}`);
  console.log(`Dispute Contract ID: ${config.disputeContractId}`);
  console.log(`Polling Interval: ${config.pollIntervalMs} ms`);
  console.log(`Database URL: ${config.databaseUrl ? config.databaseUrl.replace(/:[^:@]+@/, ':****@') : 'InMemory Fallback'}`);

  const dbClient = createDBClient(config.databaseUrl);
  const poller = new SorobanEventPoller(config, dbClient);

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down indexer daemon...`);
    await poller.stop();
    await dbClient.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await poller.start();
  } catch (err) {
    console.error('Fatal error in Soroban indexer daemon:', err);
    await dbClient.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
