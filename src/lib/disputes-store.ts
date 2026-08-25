import { safeLocalStorage } from "@/utils/safeLocalStorage";
import type { SubmittedDispute } from "./disputes";

// ---------------------------------------------------------------------------
// Frontend projection store (NOT the source of truth)
// ---------------------------------------------------------------------------
//
// This module persists submitted disputes locally so the current frontend can
// render a submission in the admin view before the on-chain state is queried.
// It is a convenience projection/cache only — the on-chain transaction is the
// authoritative submission.

const STORAGE_KEY = "skillsphere.disputes.v1";

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

function isSubmittedDispute(value: unknown): value is SubmittedDispute {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.sessionId === "string" &&
    (v.raisedBy === "seeker" || v.raisedBy === "expert")
  );
}