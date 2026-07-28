import assert from 'assert';
import { loadIndexerConfig } from '../src/indexer/config';
import { InMemoryDBClient, PostgresDBClient } from '../src/indexer/db/client';
import { EventDecoder } from '../src/indexer/decoder';
import { SorobanEventPoller } from '../src/indexer/poller';
import { xdr, scValToNative } from '@stellar/stellar-sdk';

async function runIndexerTests() {
  console.log('--- Running Soroban Event Indexer Unit & Integration Tests ---');

  // Test 1: XDR Event Decoder (Topics and Values)
  console.log('\n[Test 1] EventDecoder - Decoding topics and payload formats');
  {
    const rawFundEvent = {
      id: 'evt_test_101',
      contractId: 'CC3W26Q6Q32A7O5ZFX2Q37W7EX5R2N3O5W4Q2Z5W4Q2Z5W4Q2Z5W4Q2Z',
      topic: ['fund_session'],
      ledger: 1001,
      txHash: 'hash_1001',
      value: { session_id: 'session_101', amount: '150 XLM' },
    };

    const decoded = EventDecoder.decodeEvent(rawFundEvent);
    assert.strictEqual(decoded.eventId, 'evt_test_101');
    assert.strictEqual(decoded.topic, 'fund_session');
    assert.strictEqual(decoded.ledgerSequence, 1001);
    assert.strictEqual(decoded.payload.session_id, 'session_101');
    assert.strictEqual(decoded.payload.amount, '150 XLM');
    assert.strictEqual(decoded.decodedSuccessfully, true);
    console.log('✓ Successfully decoded fund_session event topics and payload.');
  }

  // Test 2: Non-crashing resilience on corrupted or invalid XDR payload
  console.log('\n[Test 2] EventDecoder - Corrupted & Malformed Payload Non-Crash Resilience');
  {
    const corruptedEvent = {
      id: 'evt_corrupt_999',
      contractId: 'CC3W26Q6Q32A7O5ZFX2Q37W7EX5R2N3O5W4Q2Z5W4Q2Z5W4Q2Z5W4Q2Z',
      topic: 'INVALID_BASE64_XDR_!!!',
      ledger: 1002,
      txHash: 'hash_corrupt',
      value: 'NOT_VALID_XDR_OR_JSON',
    };

    let decoded: any;
    assert.doesNotThrow(() => {
      decoded = EventDecoder.decodeEvent(corruptedEvent);
    }, 'EventDecoder should never throw on corrupt inputs');

    assert.strictEqual(decoded.eventId, 'evt_corrupt_999');
    assert.strictEqual(typeof decoded.payload, 'object');
    console.log('✓ EventDecoder gracefully handled corrupt payload without crashing.');
  }

  // Test 3: Event Poller - Simulated Event Processing & DB Updates within < 5s
  console.log('\n[Test 3] SorobanEventPoller - Simulated Event Trigger DB Update (< 5 seconds)');
  {
    const config = loadIndexerConfig();
    const dbClient = new InMemoryDBClient();
    const poller = new SorobanEventPoller(config, dbClient);

    await poller.start();

    const startTime = Date.now();
    poller.pushSimulatedEvent({
      id: 'evt_sim_501',
      contractId: config.escrowContractId,
      topic: ['fund_session'],
      ledger: 2001,
      txHash: 'hash_sim_501',
      value: { session_id: 'session_501', amount: '200 XLM' },
    });

    const result = await poller.pollOnce();
    const durationMs = Date.now() - startTime;

    assert.strictEqual(result.eventsProcessed, 1);
    assert(durationMs < 5000, `Event processing duration ${durationMs}ms exceeded 5 second threshold`);

    const session = await dbClient.getSession('session_501');
    assert.ok(session, 'Session record should exist in DB');
    assert.strictEqual(session?.status, 'active');
    assert.strictEqual(session?.price, '200 XLM');

    const tx = await dbClient.getTransaction('tx_dep_evt_sim_501');
    assert.ok(tx, 'Deposit transaction should be recorded');
    assert.strictEqual(tx?.type, 'deposit');
    assert.strictEqual(tx?.status, 'completed');

    await poller.stop();
    console.log(`✓ Contract event triggered database update in ${durationMs}ms (< 5s).`);
  }

  // Test 4: Idempotency & Duplicate Prevention
  console.log('\n[Test 4] SorobanEventPoller - Idempotency & Duplicate Event Prevention');
  {
    const config = loadIndexerConfig();
    const dbClient = new InMemoryDBClient();
    const poller = new SorobanEventPoller(config, dbClient);

    await poller.start();

    const eventPayload = {
      id: 'evt_duplicate_777',
      contractId: config.escrowContractId,
      topic: ['complete_session'],
      ledger: 3001,
      txHash: 'hash_dup_777',
      value: { session_id: 'session_777', payout_amount: '300 XLM' },
    };

    // First push
    poller.pushSimulatedEvent(eventPayload);
    const res1 = await poller.pollOnce();
    assert.strictEqual(res1.eventsProcessed, 1);

    // Second push with identical event ID
    poller.pushSimulatedEvent(eventPayload);
    const res2 = await poller.pollOnce();
    assert.strictEqual(res2.eventsProcessed, 0, 'Duplicate event should be skipped');

    await poller.stop();
    console.log('✓ Idempotency check prevented double processing of duplicate event.');
  }

  // Test 5: Checkpoint Recovery & Restart from Last Ledger Sequence
  console.log('\n[Test 5] SorobanEventPoller - Restart Continuation from Last Saved Ledger Checkpoint');
  {
    const config = loadIndexerConfig();
    const sharedDbClient = new InMemoryDBClient();

    // First run
    const poller1 = new SorobanEventPoller(config, sharedDbClient);
    await poller1.start();
    poller1.pushSimulatedEvent({
      id: 'evt_ledger_901',
      contractId: config.escrowContractId,
      topic: ['pause_session'],
      ledger: 8888,
      txHash: 'hash_ledger_901',
      value: { session_id: 'session_901' },
    });
    await poller1.pollOnce();
    await poller1.stop();

    // Check saved checkpoint
    const lastLedgerSaved = await sharedDbClient.getLastLedger('soroban_indexer', 1);
    assert.strictEqual(lastLedgerSaved, 8888, 'Saved ledger sequence should equal 8888');

    // Restart poller (simulating process restart)
    const poller2 = new SorobanEventPoller(config, sharedDbClient);
    await poller2.start();
    const restoredLedger = poller2.getLastProcessedLedger();
    assert.strictEqual(restoredLedger, 8888, 'Restored poller should start from saved ledger sequence 8888');

    const session = await sharedDbClient.getSession('session_901');
    assert.strictEqual(session?.status, 'paused');

    await poller2.stop();
    console.log('✓ Poller restart successfully resumed from last saved ledger sequence (8888).');
  }

  // Test 6: Dispute Contract Event Handling (`resolve_dispute`)
  console.log('\n[Test 6] SorobanEventPoller - Dispute Contract Event Handling');
  {
    const config = loadIndexerConfig();
    const dbClient = new InMemoryDBClient();
    const poller = new SorobanEventPoller(config, dbClient);

    await poller.start();
    poller.pushSimulatedEvent({
      id: 'evt_dispute_123',
      contractId: config.disputeContractId,
      topic: ['resolve_dispute'],
      ledger: 4001,
      txHash: 'hash_dispute_123',
      value: { dispute_id: 'dsp_01', session_id: 'session_dispute_01', amount: '500 XLM' },
    });
    await poller.pollOnce();

    const session = await dbClient.getSession('session_dispute_01');
    assert.strictEqual(session?.status, 'completed');

    await poller.stop();
    console.log('✓ Successfully processed resolve_dispute event from Dispute smart contract.');
  }

  console.log('\n========================================================');
  console.log('  ALL SOROBAN EVENT INDEXER TESTS PASSED SUCCESSFULLY!  ');
  console.log('========================================================\n');
}

runIndexerTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
