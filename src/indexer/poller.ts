/* eslint-disable @typescript-eslint/no-explicit-any */
import { rpc } from '@stellar/stellar-sdk';
import { IndexerConfig } from './config';
import { DBClient, ProcessedEventRecord, SessionUpdate, TransactionRecord } from './db/client';
import { EventDecoder, DecodedEvent } from './decoder';

export class SorobanEventPoller {
  private config: IndexerConfig;
  private dbClient: DBClient;
  private rpcServer: rpc.Server;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastProcessedLedger: number = 0;
  private mockEventsQueue: any[] = [];

  constructor(config: IndexerConfig, dbClient: DBClient) {
    this.config = config;
    this.dbClient = dbClient;
    this.rpcServer = new rpc.Server(this.config.rpcUrl, { allowHttp: true });
  }

  /**
   * Helper method for tests/simulations to push simulated on-chain contract events.
   */
  public pushSimulatedEvent(rawEvent: any) {
    this.mockEventsQueue.push(rawEvent);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.dbClient.init();
    this.lastProcessedLedger = await this.dbClient.getLastLedger('soroban_indexer', this.config.startLedger);

    console.log(`[SorobanIndexer] Service started. Resume ledger sequence checkpoint: ${this.lastProcessedLedger}`);
    console.log(`[SorobanIndexer] Monitoring Escrow (${this.config.escrowContractId}) & Dispute (${this.config.disputeContractId})`);

    await this.pollOnce();
    this.scheduleNextPoll();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[SorobanIndexer] Polling service stopped gracefully.');
  }

  private scheduleNextPoll() {
    if (!this.isRunning) return;
    this.pollTimer = setTimeout(async () => {
      await this.pollOnce();
      this.scheduleNextPoll();
    }, this.config.pollIntervalMs);
  }

  /**
   * Performs a single polling tick.
   */
  async pollOnce(): Promise<{ eventsProcessed: number; lastLedger: number }> {
    let eventsProcessedCount = 0;
    try {
      // 1. Process simulated queue first (for simulation & integration tests)
      if (this.mockEventsQueue.length > 0) {
        const simQueue = [...this.mockEventsQueue];
        this.mockEventsQueue = [];
        for (const rawEvt of simQueue) {
          const processed = await this.processSingleEvent(rawEvt);
          if (processed) eventsProcessedCount++;
        }
      }

      // 2. Query Soroban RPC for live events if server endpoint is reachable
      const startLedger = this.lastProcessedLedger + 1;
      let rawEvents: any[] = [];

      try {
        const response = await this.rpcServer.getEvents({
          startLedger: startLedger,
          filters: [
            {
              type: 'contract',
              contractIds: [this.config.escrowContractId, this.config.disputeContractId],
            },
          ],
          limit: this.config.batchLimit,
        });

        if (response && Array.isArray(response.events)) {
          rawEvents = response.events;
        }
      } catch (rpcErr: any) {
        // RPC network or endpoint unreachable - log warning, do not crash poller
        console.warn(`[SorobanIndexer] Soroban RPC poll warning (${this.config.rpcUrl}): ${rpcErr?.message || rpcErr}`);
      }

      // 3. Process raw events from RPC
      for (const rawEvt of rawEvents) {
        const processed = await this.processSingleEvent(rawEvt);
        if (processed) eventsProcessedCount++;
      }

    } catch (err: any) {
      // Catch-all to guarantee service resilience
      console.error(`[SorobanIndexer] Error during polling tick: ${err?.message || err}`);
    }

    return {
      eventsProcessed: eventsProcessedCount,
      lastLedger: this.lastProcessedLedger,
    };
  }

  /**
   * Process a single event idempotently and update DB state.
   */
  public async processSingleEvent(rawEvent: any): Promise<boolean> {
    // Decode event safely without throwing
    const decoded: DecodedEvent = EventDecoder.decodeEvent(rawEvent);

    // Filter relevant topic events
    const topic = decoded.topic.toLowerCase();
    const isTargetEvent = [
      'fund_session', 'start_session',
      'pause_session',
      'refund_session', 'cancel_session',
      'complete_session', 'settle_session',
      'resolve_dispute'
    ].some(t => topic.includes(t));

    // Update last ledger checkpoint if this event has a higher sequence
    if (decoded.ledgerSequence > this.lastProcessedLedger) {
      this.lastProcessedLedger = decoded.ledgerSequence;
    }

    // Idempotency check: skip if event ID already processed
    const alreadyProcessed = await this.dbClient.isEventProcessed(decoded.eventId);
    if (alreadyProcessed) {
      console.log(`[SorobanIndexer] Skipping duplicate event ${decoded.eventId}`);
      // Still update ledger checkpoint
      await this.dbClient.saveLedger('soroban_indexer', this.lastProcessedLedger);
      return false;
    }

    // Prepare processed event DB record
    const eventRecord: ProcessedEventRecord = {
      eventId: decoded.eventId,
      contractId: decoded.contractId,
      topic: decoded.topic,
      ledgerSequence: decoded.ledgerSequence,
      transactionHash: decoded.transactionHash,
      payload: decoded.payload,
    };

    let sessionUpdate: SessionUpdate | undefined;
    let txRecord: TransactionRecord | undefined;

    const sessionId = decoded.payload.session_id || decoded.payload.sessionId || decoded.payload.id || 'session_1';
    const amount = decoded.payload.amount || decoded.payload.price || decoded.payload.payout_amount || decoded.payload.refund_amount || '50 XLM';

    if (isTargetEvent) {
      if (topic.includes('fund_session') || topic.includes('start_session')) {
        sessionUpdate = {
          sessionId,
          status: 'active',
          transactionHash: decoded.transactionHash,
          price: String(amount),
        };
        txRecord = {
          id: `tx_dep_${decoded.eventId}`,
          hash: decoded.transactionHash || `hash_${decoded.eventId}`,
          type: 'deposit',
          amount: String(amount),
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          network: 'testnet',
          sessionId,
        };
      } else if (topic.includes('pause_session')) {
        sessionUpdate = {
          sessionId,
          status: 'paused',
          transactionHash: decoded.transactionHash,
        };
      } else if (topic.includes('refund_session') || topic.includes('cancel_session')) {
        sessionUpdate = {
          sessionId,
          status: 'cancelled',
          transactionHash: decoded.transactionHash,
        };
        txRecord = {
          id: `tx_ref_${decoded.eventId}`,
          hash: decoded.transactionHash || `hash_${decoded.eventId}`,
          type: 'refund',
          amount: String(amount),
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          network: 'testnet',
          sessionId,
        };
      } else if (topic.includes('complete_session') || topic.includes('settle_session')) {
        sessionUpdate = {
          sessionId,
          status: 'completed',
          transactionHash: decoded.transactionHash,
        };
        txRecord = {
          id: `tx_stl_${decoded.eventId}`,
          hash: decoded.transactionHash || `hash_${decoded.eventId}`,
          type: 'settlement',
          amount: String(amount),
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          network: 'testnet',
          sessionId,
        };
      } else if (topic.includes('resolve_dispute')) {
        sessionUpdate = {
          sessionId,
          status: 'completed',
          transactionHash: decoded.transactionHash,
        };
        txRecord = {
          id: `tx_dsp_${decoded.eventId}`,
          hash: decoded.transactionHash || `hash_${decoded.eventId}`,
          type: 'settlement',
          amount: String(amount),
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          network: 'testnet',
          sessionId,
        };
      }
    }

    // Persist event record, domain state update, and updated ledger checkpoint sequence
    await this.dbClient.recordEventAndStateUpdate(
      eventRecord,
      sessionUpdate,
      txRecord,
      this.lastProcessedLedger
    );

    console.log(`[SorobanIndexer] Successfully processed event ${decoded.eventId} (Topic: ${decoded.topic}, Ledger: ${decoded.ledgerSequence})`);
    return true;
  }

  public getLastProcessedLedger(): number {
    return this.lastProcessedLedger;
  }
}
