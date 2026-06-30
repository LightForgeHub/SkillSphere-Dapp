"use client";

import { useState } from "react";
import { External, CheckCircle, XCircle, Loader2 } from "lucide-react";

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
  disputes: DisputeSession[];
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
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Dispute Arbitration Panel</h2>
        <p className="text-sm text-zinc-400">
          Review and resolve active disputes. All evidence is stored on IPFS.
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-8 text-center">
          <p className="text-zinc-400">No active disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => {
            const isResolved = resolvedDisputes.has(dispute.id);
            const isResolving = resolving === dispute.id;

            return (
              <div
                key={dispute.id}
                className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-6 hover:border-zinc-600 transition-colors"
              >
                {/* Header with ID and Status */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-mono font-semibold text-zinc-100">
                      {dispute.id}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(dispute.createdAt).toLocaleDateString()} at{" "}
                      {new Date(dispute.createdAt).toLocaleTimeString()}
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
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Seeker</p>
                    <p className="text-sm font-medium text-zinc-100">
                      {dispute.seeker.name}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      {dispute.seeker.address.slice(0, 10)}...
                      {dispute.seeker.address.slice(-10)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Amount in Dispute</p>
                    <p className="text-lg font-bold text-zinc-100">
                      {dispute.amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Expert</p>
                    <p className="text-sm font-medium text-zinc-100">
                      {dispute.expert.name}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      {dispute.expert.address.slice(0, 10)}...
                      {dispute.expert.address.slice(-10)}
                    </p>
                  </div>
                </div>

                {/* Evidence Section */}
                <div className="mb-4 pb-4 border-b border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-200 mb-3">Evidence</p>
                  <div className="space-y-3">
                    {dispute.evidence.notes && (
                      <div className="rounded-lg bg-zinc-800/40 p-3">
                        <p className="text-xs text-zinc-400 mb-1">Admin Notes</p>
                        <p className="text-sm text-zinc-300">
                          {dispute.evidence.notes}
                        </p>
                      </div>
                    )}

                    {dispute.evidence.chatHistory && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Chat History:</span>
                        <a
                          href={getIPFSUrl(dispute.evidence.chatHistory)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          View on IPFS
                          <External className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {dispute.evidence.screenshots &&
                      dispute.evidence.screenshots.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-400">Screenshots:</p>
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
                                <External className="h-3 w-3" />
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
