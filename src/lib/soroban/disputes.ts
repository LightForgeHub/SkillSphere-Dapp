import type { DisputeAdapter, SubmitDisputeParams, SubmitDisputeResult } from "../disputes";

// ---------------------------------------------------------------------------
// Soroban dispute adapter (real submission path)
// ---------------------------------------------------------------------------
//
// Submits an appeal by invoking the expected `submit_dispute` entry on the
// reputation-scoring contract:
//
//   submit_dispute(
//     caller:               Address, // connected wallet (seeker or expert)
//     session_id:           u64,     // reviewed session being contested
//     reason:               String,  // grounds for the appeal
//     evidence_description: String,  // narrative description
//     evidence:             Vec<Bytes>, // evidence metadata (encoded)
//     raised_by:            Symbol,  // "seeker" | "expert"
//   )
//
// The exact argument encoding is isolated here so the UI never depends on
// contract details. When a deployed contract exposes `submit_dispute`, only
// this adapter needs to be pointed at it — the UI, the store and the mock
// adapter are unchanged.

const CONTRACT_ID =
  process.env.NEXT_PUBLIC_DISPUTE_CONTRACT_ID ||
  "CCYUGVNBPA2Z7Z6U6Y6XU6Y6XU6Y6XU6Y6XU6Y6XU6Y";

/** Adapter needs the wallet context (uses the project's existing wallet). */
export interface SorobanWalletContext {
  address: string;
  networkPassphrase: string;
  signTransaction: (
    xdr: string,
    options?: { networkPassphrase?: string }
  ) => Promise<string>;
}

export class SorobanContractSeamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SorobanContractSeamError";
  }
}

/**
 * Real Soroban submit_dispute implementation.
 *
 * Intended pipeline (same state machine as every other on-chain flow):
 *
 *   build invocation -> simulate -> assemble -> Freighter sign -> submit -> confirm
 *
 * The sign/submit/confirm half is gated behind a typed `SorobanContractSeamError`
 * because the `submit_dispute` entry point is not yet deployed on the configured
 * contract. `call` is therefore not reachable in the current repo state; the error
 * below keeps the on-chain path explicit instead of silently faking a confirmed
 * transaction. The contract id above is the single config seam to update.
 */
export class SorobanDisputeAdapter implements DisputeAdapter {
  private wallet: SorobanWalletContext | null = null;

  bind(wallet: SorobanWalletContext): void {
    this.wallet = wallet;
  }

  async submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult> {
    // `params` is reserved for the future `new rpc.Contract(CONTRACT_ID).call(
    //   "submit_dispute", wallet.address, sessionId, reason, evidenceMetadata, raisedBy
    // )` invocation. Referenced here so the interface stays concretely typed.
    void params;

    const wallet = this.wallet;
    if (!wallet || !wallet.address) {
      throw new SorobanContractSeamError("Connect your wallet to submit an appeal.");
    }

    void CONTRACT_ID;
    void wallet;

    throw new SorobanContractSeamError(
      "The submit_dispute entry point is not deployed on the configured contract yet. " +
        "Enable NEXT_PUBLIC_DISPUTE_ADAPTER=mock for a local demo submission of the same " +
        "transaction flow, or deploy the expected contract so this adapter can sign and " +
        "confirm the transaction."
    );
  }
}