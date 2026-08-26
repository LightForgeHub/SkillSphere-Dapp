import { safeLocalStorage } from "@/utils/safeLocalStorage";
import type { DisputeEvidenceMeta, SubmittedDispute } from "./disputes";

// ---------------------------------------------------------------------------
// Frontend projection store (NOT the source of truth)
// ---------------------------------------------------------------------------
//
// This module persists submitted disputes locally so the current frontend can
// render a submission in the admin view before the on-chain state is queried.
// It is a convenience projection/cache only — the on-chain transaction is the
// authoritative submission.

const STORAGE_KEY = "skillsphere.disputes.v1";

/** The seeded demo cards in ArbitrationPanel occupy disp-001 and disp-002. */
const FIRST_FREE_SEQUENCE = 3;

/**
 * Persist a successful dispute submission to the local projection store.
 */
export function saveSubmittedDispute(dispute: SubmittedDispute): void {
  const disputes = loadAll();
  disputes.push(dispute);
  safeLocalStorage.set(STORAGE_KEY, JSON.stringify(disputes));
}

/**
 * Read all locally submitted disputes (newest first). Tolerates malformed or
 * missing values rather than throwing during render.
 */
export function getSubmittedDisputes(): SubmittedDispute[] {
  return loadAll();
}

/**
 * Allocates the next sequential dispute id in the admin panel's existing
 * `disp-###` format, continuing after previously submitted appeals and the
 * two seeded demo disputes so React keys never collide.
 */
export function allocateDisputeId(): string {
  const maxExisting = getSubmittedDisputes().reduce((max, d) => {
    const match = /^disp-(\d+)$/.exec(d.id);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  const sequence = Math.max(maxExisting + 1, FIRST_FREE_SEQUENCE);
  return `disp-${String(sequence).padStart(3, "0")}`;
}

/**
 * Loads and parses every stored dispute, silently dropping any record that
 * fails the structural type guard (stale schema or hand-edited storage).
 */
function loadAll(): SubmittedDispute[] {
  const raw = safeLocalStorage.get(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSubmittedDispute);
  } catch {
    return [];
  }
}

/**
 * Structural guard covering every field consumers dereference — not just the
 * identity fields — so malformed records are dropped instead of crashing a
 * downstream `evidence.map(...)` during render.
 */
function isSubmittedDispute(value: unknown): value is SubmittedDispute {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  if (
    typeof v.id !== "string" ||
    typeof v.sessionId !== "string" ||
    typeof v.reason !== "string" ||
    typeof v.evidenceDescription !== "string" ||
    typeof v.createdAt !== "string" ||
    (v.raisedBy !== "seeker" && v.raisedBy !== "expert")
  ) {
    return false;
  }

  if (
    v.status !== "pending" &&
    v.status !== "submitted" &&
    v.status !== "failed"
  ) {
    return false;
  }

  return isEvidenceMetaList(v.evidence);
}

/**
 * Narrows an unknown value to the evidence metadata list shape, validating
 * every `{ name, size, type }` entry individually.
 */
function isEvidenceMetaList(value: unknown): value is DisputeEvidenceMeta[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const e = item as Record<string, unknown>;
    return (
      typeof e.name === "string" &&
      typeof e.size === "number" &&
      typeof e.type === "string"
    );
  });
}
