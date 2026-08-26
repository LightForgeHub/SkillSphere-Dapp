"use client";

import { useEffect, useState } from "react";
import { ExternalLink, CheckCircle, Loader2 } from "lucide-react";
import { getSubmittedDisputes } from "@/lib/disputes-store";
import type { SubmittedDispute } from "@/lib/disputes";
import { mockSessions, mockExperts } from "@/utils/data/mock-data";
import { formatDate, formatTime } from "@/utils/time";

interface DisputeSession {
  id: string;
  seeker: {
    name: string;
    address: string;
  };
  expert: {
    name: string;
    address: string;
  };
  amount: string;
  status: "pending" | "resolved";
  createdAt: string;
  evidence: {
    chatHistory?: string;
    screenshots?: string[];
    notes: string;
  };
}

interface ArbitrationPanelProps {
  disputes?: DisputeSession[];
  onResolve?: (disputeId: string, resolution: "seeker" | "expert") => Promise<void>;
}

const MOCK_DISPUTES: DisputeSession[] = [
  {
    id: "disp-001",
    seeker: {
      name: "John Doe",
      address: "GBPB5QWBNRGRW7YBJUKHQFZ6YJ7EWDNMRXSQNQPSLCBFXGVEBYZM4OK3",
    },
    expert: {
      name: "Alice Smith",
      address: "GCZST3K4QR3F5DQBCZ2JPQQ7XJ5QVZVZCL4YVQKVKHXQRL7BSCFQR3D",
    },
    amount: "250 XLM",
    status: "pending",
    createdAt: "2024-06-28T10:30:00Z",
    evidence: {
      chatHistory:
        "QmXxxx...chat_history_ipfs_hash",
      screenshots: [
        "QmYyyy...screenshot_1_ipfs_hash",
        "QmZzzz...screenshot_2_ipfs_hash",
      ],
      notes: "Expert did not provide the agreed upon service quality. Session was cut short.",
    },
  },
  {
    id: "disp-002",
    seeker: {
      name: "Jane Smith",
      address: "GDVVS5XXYY5RCQZ3QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ",
    },
    expert: {
      name: "Bob Johnson",
      address: "GBZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    },
    amount: "500 XLM",
    status: "pending",
    createdAt: "2024-06-29T14:15:00Z",
    evidence: {
      screenshots: ["QmAaaa...screenshot_ipfs_hash"],
      notes: "Payment dispute - funds were deducted but session never started.",
    },
  },
];

export default function ArbitrationPanel({ disputes = MOCK_DISPUTES, onResolve }: ArbitrationPanelProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolvedDisputes, setResolvedDisputes] = useState<Set<string>>(new Set());
  // Start empty so the server HTML and the client's first (hydration) render
  // match — localStorage is only available in the browser, so it is loaded
  // after mount. React updates the list immediately afterwards without a
  // hydration mismatch.
  const [submittedAppeals, setSubmittedAppeals] = useState<SubmittedDispute[]>([]);
  useEffect(() => {
    setSubmittedAppeals(getSubmittedDisputes());
  }, []);

  // Map submitted appeals into the SAME DisputeSession card model as the
  // mock disputes so every card in this panel renders identically.
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const submittedAsDisputes: DisputeSession[] = submittedAppeals.map((appeal) => {
    const session = mockSessions.find((s) => s.id === appeal.sessionId);
    const expert = mockExperts.find((e) => e.id === session?.expertId);
    const attachments = appeal.evidence.map((f) => f.name);
    const notes = [
      appeal.evidenceDescription || appeal.reason,
      attachments.length > 0
        ? `Attachments (${attachments.length}): ${attachments.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      id: appeal.id,
      seeker: {
        name: capitalize(appeal.raisedBy),
        address: appeal.claimantAddress || "—",
      },
      expert: {
        name: session?.expertName ?? "Unassigned",
        address: expert?.walletAddress ?? "—",
      },
      amount: session?.price ?? "—",
      status: "pending" as const,
      createdAt: appeal.createdAt,
      evidence: { notes },
    };
  });

  // Newest submissions first, then the existing dispute list below.
  const sortedSubmittedAppeals = [...submittedAsDisputes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const allDisputes = [...sortedSubmittedAppeals, ...disputes];

  const handleResolve = async (disputeId: string, resolution: "seeker" | "expert") => {
    setResolving(disputeId);
    try {
      if (onResolve) {
        await onResolve(disputeId, resolution);
      }
      setResolvedDisputes((prev) => new Set([...prev, disputeId]));
    } catch (error) {
      console.error("Error resolving dispute:", error);
    } finally {
      setResolving(null);
    }
  };

  const getIPFSUrl = (hash: string): string => {
    return `https://ipfs.io/ipfs/${hash}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Dispute Arbitration Panel</h2>
        <p className="text-sm text-muted-foreground">
          Review and resolve active disputes. All evidence is stored on IPFS.
        </p>
      </div>

      {allDisputes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-8 text-center">
          <p className="text-muted-foreground">No active disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allDisputes.map((dispute) => {
            const isResolved = resolvedDisputes.has(dispute.id);
            const isResolving = resolving === dispute.id;

            return (
              <div
                key={dispute.id}
                className="rounded-lg border border-border bg-card p-6 hover:border-border/80 transition-colors"
              >
                {/* Header with ID and Status */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-mono font-semibold text-foreground">
                      {dispute.id}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
{formatDate(dispute.createdAt)} at{" "}
                    {formatTime(dispute.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-400">
                        <Loader2 className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Parties and Amount */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Seeker</p>
                    <p className="text-sm font-medium text-foreground">
                      {dispute.seeker.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {dispute.seeker.address.slice(0, 10)}...
                      {dispute.seeker.address.slice(-10)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount in Dispute</p>
                    <p className="text-lg font-bold text-foreground">
                      {dispute.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expert</p>
                    <p className="text-sm font-medium text-foreground">
                      {dispute.expert.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {dispute.expert.address.slice(0, 10)}...
                      {dispute.expert.address.slice(-10)}
                    </p>
                  </div>
                </div>

                {/* Evidence Section */}
                <div className="mb-4 pb-4 border-b border-border">
                  <p className="text-sm font-semibold text-foreground/90 mb-3">Evidence</p>
                  <div className="space-y-3">
                    {dispute.evidence.notes && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                        <p className="text-sm text-foreground/75 whitespace-pre-line">
                          {dispute.evidence.notes}
                        </p>
                      </div>
                    )}

                    {dispute.evidence.chatHistory && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Chat History:</span>
                        <a
                          href={getIPFSUrl(dispute.evidence.chatHistory)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          View on IPFS
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {dispute.evidence.screenshots &&
                      dispute.evidence.screenshots.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Screenshots:</p>
                          <div className="flex flex-wrap gap-2">
                            {dispute.evidence.screenshots.map((screenshot, idx) => (
                              <a
                                key={idx}
                                href={getIPFSUrl(screenshot)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors px-3 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30"
                              >
                                Screenshot {idx + 1}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Action Buttons */}
                {!isResolved && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleResolve(dispute.id, "seeker")}
                      disabled={isResolving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-medium text-sm hover:bg-emerald-500/30 hover:border-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Resolve for Seeker
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleResolve(dispute.id, "expert")}
                      disabled={isResolving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400 font-medium text-sm hover:bg-amber-500/30 hover:border-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Resolve for Expert
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
