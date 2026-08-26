import type { DisputeAdapter, SubmitDisputeParams, SubmitDisputeResult } from "../disputes";
import { getSubmittedDisputes } from "../disputes-store";

// ---------------------------------------------------------------------------
// Mock dispute adapter (local / demo only)
// ---------------------------------------------------------------------------
//
// Exercises the SAME transaction flow as the real Soroban adapter so the UI
// can be verified end-to-end before the `submit_dispute` contract entry point
// is deployed. It ONLY runs when NEXT_PUBLIC_DISPUTE_ADAPTER=mock.

/** The seeded demo cards in ArbitrationPanel occupy disp-001 and disp-002. */
const FIRST_FREE_SEQUENCE = 3;

/**
 * Next sequential id in the panel's existing `disp-###` format, continuing
 * after both previously submitted appeals and the two seeded demo disputes.
 */
function nextDisputeId(): string {
  const maxExisting = getSubmittedDisputes().reduce((max, d) => {
    const match = /^disp-(\d+)$/.exec(d.id);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  const sequence = Math.max(maxExisting + 1, FIRST_FREE_SEQUENCE);
  return `disp-${String(sequence).padStart(3, "0")}`;
}

/**
 * Deterministic fake confirmation matching the shape the real adapter returns.
 */
export class MockDisputeAdapter implements DisputeAdapter {
  async submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult> {
    const txHash =
      "abc1234567890defabcdef1234567890abcdef1234567890abc" +
      params.sessionId.padEnd(6, "0");

    const result: SubmitDisputeResult = {
      id: nextDisputeId(),
      txHash,
    };

    // Simulate the latency of a real sign + broadcast + confirm round-trip so
    // the PREPARING -> AWAITING -> SUBMITTING -> CONFIRMING states render.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return result;
  }
}
