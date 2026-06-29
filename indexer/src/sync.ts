/**
 * SkillSphere off-chain event ingestion daemon (#352).
 *
 * Polls the Soroban RPC getEvents API for SessionCreated, SessionStarted,
 * and SessionSettled contract events and writes them to PostgreSQL via Prisma.
 * The last processed ledger is persisted in SyncCursor so the daemon resumes
 * safely after a restart.
 *
 * Required env vars:
 *   DATABASE_URL              – Postgres connection string
 *   SKILLSPHERE_CONTRACT_ID   – deployed contract address (C…)
 *   SOROBAN_RPC_URL           – defaults to testnet
 *   INDEXER_POLL_INTERVAL_MS  – defaults to 5000
 */

import { PrismaClient } from "@prisma/client";
import { Server } from "stellar-sdk/rpc";
import { scValToNative, xdr } from "stellar-sdk";

// ── Config ────────────────────────────────────────────────────────────────────

const CONTRACT_ID = process.env.SKILLSPHERE_CONTRACT_ID ?? "";
const RPC_URL =
  process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const POLL_MS = Number(process.env.INDEXER_POLL_INTERVAL_MS ?? "5000");

if (!CONTRACT_ID) {
  console.error("[sync] SKILLSPHERE_CONTRACT_ID is required");
  process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const rpc = new Server(RPC_URL);

// ── Event topic symbols (mirrors contracts/src/events.rs) ─────────────────────

const TOPIC_SESSION_CREATED = "sessCreat";
const TOPIC_SESSION_STARTED = "sessStart";
const TOPIC_SESSION_SETTLED = "sessSettl";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SorobanEvent {
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  id: string;
  txHash: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decode the first topic symbol of an event (the event_type discriminator). */
function topicSymbol(event: SorobanEvent): string {
  try {
    return scValToNative(event.topic[0]) as string;
  } catch {
    return "";
  }
}

/** Decode the event value (a map or tuple) as a plain JS object. */
function decodeValue(val: xdr.ScVal): Record<string, unknown> {
  try {
    return scValToNative(val) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── Per-event handlers ────────────────────────────────────────────────────────

async function handleSessionCreated(ev: SorobanEvent): Promise<void> {
  // Payload shape (from webhook envelope): (event_type, session_id, timestamp, payload)
  // payload = { seeker, expert, rate_per_second, escrow_amount }
  const sessionId = String(scValToNative(ev.topic[1]));
  const payload = decodeValue(ev.value);

  await prisma.sessionCreated.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      txHash: ev.txHash,
      ledgerSeq: ev.ledger,
      timestamp: new Date(ev.ledgerClosedAt),
      seekerAddress: String(payload.seeker ?? ""),
      expertAddress: String(payload.expert ?? ""),
      ratePerSecond: BigInt(String(payload.rate_per_second ?? "0")),
      escrowAmount: BigInt(String(payload.escrow_amount ?? "0")),
    },
    update: {},
  });
}

async function handleSessionStarted(ev: SorobanEvent): Promise<void> {
  const sessionId = String(scValToNative(ev.topic[1]));
  const payload = decodeValue(ev.value);

  await prisma.sessionStarted.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      txHash: ev.txHash,
      ledgerSeq: ev.ledger,
      timestamp: new Date(ev.ledgerClosedAt),
      seekerAddress: String(payload.seeker ?? ""),
      expertAddress: String(payload.expert ?? ""),
      ratePerSecond: BigInt(String(payload.rate_per_second ?? "0")),
      startedAt: BigInt(String(payload.started_at ?? "0")),
    },
    update: {},
  });
}

async function handleSessionSettled(ev: SorobanEvent): Promise<void> {
  const sessionId = String(scValToNative(ev.topic[1]));
  const payload = decodeValue(ev.value);

  await prisma.sessionSettled.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      txHash: ev.txHash,
      ledgerSeq: ev.ledger,
      timestamp: new Date(ev.ledgerClosedAt),
      expertAddress: String(payload.expert ?? ""),
      expertPayout: BigInt(String(payload.expert_payout ?? "0")),
      seekerRefund: BigInt(String(payload.seeker_refund ?? "0")),
      settledAt: BigInt(String(payload.settled_at ?? "0")),
    },
    update: {},
  });
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function getLastLedger(): Promise<number> {
  const cursor = await prisma.syncCursor.findUnique({ where: { id: 1 } });
  return cursor?.lastLedgerSeq ?? 0;
}

async function setLastLedger(seq: number): Promise<void> {
  await prisma.syncCursor.upsert({
    where: { id: 1 },
    create: { id: 1, lastLedgerSeq: seq },
    update: { lastLedgerSeq: seq },
  });
}

async function tick(): Promise<void> {
  const fromLedger = await getLastLedger();

  const response = await rpc.getEvents({
    startLedger: fromLedger,
    filters: [
      {
        type: "contract",
        contractIds: [CONTRACT_ID],
        topics: [
          [`*`], // topic[0] = webhook symbol, topic[1] = event_type discriminator
        ],
      },
    ],
    limit: 100,
  });

  const events = (response.events ?? []) as unknown as SorobanEvent[];
  if (events.length === 0) return;

  let maxLedger = fromLedger;

  for (const ev of events) {
    const symbol = topicSymbol(ev);
    try {
      if (symbol === TOPIC_SESSION_CREATED) await handleSessionCreated(ev);
      else if (symbol === TOPIC_SESSION_STARTED) await handleSessionStarted(ev);
      else if (symbol === TOPIC_SESSION_SETTLED) await handleSessionSettled(ev);
      // Unknown event types are silently skipped.
    } catch (err) {
      console.error(`[sync] error processing event ${ev.id} (${symbol}):`, err);
    }

    if (ev.ledger > maxLedger) maxLedger = ev.ledger;
  }

  await setLastLedger(maxLedger);
  console.log(
    `[sync] processed ${events.length} event(s), cursor → ledger ${maxLedger}`
  );
}

async function run(): Promise<void> {
  console.log(
    `[sync] starting; contract=${CONTRACT_ID} rpc=${RPC_URL} poll=${POLL_MS}ms`
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[sync] tick error:", err);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

run().catch((err) => {
  console.error("[sync] fatal:", err);
  process.exit(1);
});
