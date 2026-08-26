import type { DisputeAdapter, SubmitDisputeParams, SubmitDisputeResult } from "../disputes";
import { allocateDisputeId } from "../disputes-store";

// ---------------------------------------------------------------------------
// Mock dispute adapter (local / demo only)
// ---------------------------------------------------------------------------
//
// Exercises the SAME transaction flow as the real Soroban adapter so the UI
// can be verified end-to-end before pointing NEXT_PUBLIC_DISPUTE_CONTRACT_ID
// at a deployed contract. It ONLY runs when NEXT_PUBLIC_DISPUTE_ADAPTER=mock.

/**
 * Deterministic fake confirmation matching the shape the real adapter
 * returns, including the sequential `disp-###` id format.
 */
export class MockDisputeAdapter implements DisputeAdapter {
  /**
   * Submits deterministically and resolves after simulated confirmation latency.
   */
  async submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult> {
    const txHash =
      "abc1234567890defabcdef1234567890abcdef1234567890abc" +
      params.sessionId.padEnd(6, "0");

    const result: SubmitDisputeResult = {
      id: allocateDisputeId(),
      txHash,
    };

    // Simulate the latency of a real sign + broadcast + confirm round-trip so
    // the PREPARING -> AWAITING -> SUBMITTING -> CONFIRMING states render.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return result;
  }
}
