import type { DisputeAdapter, SubmitDisputeParams, SubmitDisputeResult } from "../disputes";

// ---------------------------------------------------------------------------
// Mock dispute adapter (local / demo only)
// ---------------------------------------------------------------------------
//
// Exercises the SAME transaction flow as the real Soroban adapter so the UI
// can be verified end-to-end before the `submit_dispute` contract entry point
// is deployed. It ONLY runs when NEXT_PUBLIC_DISPUTE_ADAPTER=mock.

/**
 * Deterministic fake confirmation matching the shape the real adapter returns.
 */
export class MockDisputeAdapter implements DisputeAdapter {
  async submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult> {
    const txHash =
      "abc1234567890defabcdef1234567890abcdef1234567890abc" +
      params.sessionId.padEnd(6, "0");

    const result: SubmitDisputeResult = {
      id: `DISPUTE-${params.sessionId}-${Date.now()}`,
      txHash,
    };

    // Simulate the latency of a real sign + broadcast + confirm round-trip so
    // the PREPARING -> AWAITING -> SUBMITTING -> CONFIRMING states render.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return result;
  }
}