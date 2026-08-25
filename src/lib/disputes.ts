import { SorobanDisputeAdapter, type SorobanWalletContext } from "./soroban/disputes";
import { MockDisputeAdapter } from "./soroban/mock-disputes";
import { saveSubmittedDispute } from "./disputes-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Evidence is stored as metadata only — never binary uploads. */
export interface DisputeEvidenceMeta {
  name: string;
  size: number;
  type: string;
}

export interface SubmitDisputeParams {
  sessionId: string;
  raisedBy: "seeker" | "expert";
  reason: string;
  evidenceDescription: string;
  evidence: DisputeEvidenceMeta[];
}

export type SubmittedDisputeStatus = "pending" | "submitted" | "failed";

export interface SubmittedDispute {
  id: string;
  sessionId: string;
  raisedBy: "seeker" | "expert";
  reason: string;
  evidenceDescription: string;
  evidence: DisputeEvidenceMeta[];
  status: SubmittedDisputeStatus;
  createdAt: string;
  txHash?: string;
  /** Wallet address of the party who submitted the appeal (when connected). */
  claimantAddress?: string;
}

export interface SubmitDisputeResult {
  id: string;
  txHash: string;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * A dispute adapter owns every detail of how a dispute reaches the ledger.
 * The UI only talks to {@link submitDispute} and never sees XDR, Soroban
 * argument encoding, or wallet/network specifics.
 *
 * Both the real (Soroban) and demo (mock) adapters traverse the same
 * transaction state machine so the UI is verified identically in each mode.
 */
export interface DisputeAdapter {
  submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult>;
}

// ---------------------------------------------------------------------------
// Adapter selection
// ---------------------------------------------------------------------------

/**
 * Explicit server-safe selection. Production DEFAULTS to the real Soroban
 * adapter; the mock adapter is only enabled for local/demo development via
 * NEXT_PUBLIC_DISPUTE_ADAPTER=mock.
 */
function resolveDisputeAdapter(): DisputeAdapter {
  const mode =
    process.env.NEXT_PUBLIC_DISPUTE_ADAPTER === "mock"
      ? "mock"
      : "soroban";

  return mode === "mock" ? new MockDisputeAdapter() : new SorobanDisputeAdapter();
}

const disputeAdapter = resolveDisputeAdapter();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submits a dispute appeal via the configured adapter and records a local
 * projection so the current frontend can render the submission immediately.
 *
 * The local projection is a frontend convenience only — the on-chain
 * transaction remains the authoritative submission.
 *
 * @param wallet the connected wallet context used to sign the on-chain
 *               submission (only consumed by the real Soroban adapter).
 * @throws if the underlying adapter rejects (the caller keeps the form state
 *         so the user can retry; no successful projection is written).
 */
export async function submitDispute(
  params: SubmitDisputeParams,
  wallet?: SorobanWalletContext
): Promise<SubmitDisputeResult> {
  if (disputeAdapter instanceof SorobanDisputeAdapter && wallet) {
    disputeAdapter.bind(wallet);
  }

  const result = await disputeAdapter.submitDispute(params);

  const projection: SubmittedDispute = {
    id: result.id,
    sessionId: params.sessionId,
    raisedBy: params.raisedBy,
    reason: params.reason,
    evidenceDescription: params.evidenceDescription || "",
    evidence: params.evidence,
    status: "submitted",
    createdAt: new Date().toISOString(),
    txHash: result.txHash,
    claimantAddress: wallet?.address,
  };

  saveSubmittedDispute(projection);
  return result;
}