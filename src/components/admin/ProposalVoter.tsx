"use client";

import React, { useState } from "react";
import {
  Gavel,
  CheckCircle,
  FileText,
  AlertTriangle,
  UserCheck,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Inbox,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

// Types matching the schema and dispute guidelines
export type DisputeVerdict = "favour_expert" | "favour_seeker" | "split";

export interface ArbitrationProposal {
  id: string;
  disputeId: string;
  sessionId: string;
  reason: string;
  amount: string;
  verdict: DisputeVerdict;
  verdictNote: string;
  signaturesCount: number;
  signaturesRequired: number;
  votedMembers: string[];
  status: "pending" | "signed" | "executed";
  createdAt: string;
  seeker: {
    name: string;
    address: string;
  };
  expert: {
    name: string;
    address: string;
  };
}

const INITIAL_PROPOSALS: ArbitrationProposal[] = [
  {
    id: "PROP-2026-001",
    disputeId: "DISP-4092",
    sessionId: "SESS-9938",
    reason: "Expert did not show up for the second half of the pre-paid system design session and failed to deliver notes.",
    amount: "1,500 XLM",
    verdict: "favour_seeker",
    verdictNote: "The logs indicate the expert disconnected after 20 minutes of a 60-minute session. Full refund to seeker is justified.",
    signaturesCount: 1,
    signaturesRequired: 3,
    votedMembers: ["GBX4...K2LM"],
    status: "pending",
    createdAt: "2026-06-28T14:30:00Z",
    seeker: { name: "Nora", address: "GAAAA...W2K4" },
    expert: { name: "Mr. Sam", address: "GBX4...K2LM" }
  },
  {
    id: "PROP-2026-002",
    disputeId: "DISP-8821",
    sessionId: "SESS-1049",
    reason: "Seeker claims work was of poor quality, but expert provided proof of fully functioning smart contracts matching the specification.",
    amount: "3,200 XLM",
    verdict: "favour_expert",
    verdictNote: "GitHub repository analysis shows all deliverables were completed on time and pass the automated test suites.",
    signaturesCount: 2,
    signaturesRequired: 3,
    votedMembers: ["GAAAA...W2K4", "GCSW...P9QZ"],
    status: "pending",
    createdAt: "2026-06-29T09:15:00Z",
    seeker: { name: "Mrs. Lulu", address: "GD33...S8X2" },
    expert: { name: "Alex Rivera", address: "GCBB...R6YY" }
  },
  {
    id: "PROP-2026-003",
    disputeId: "DISP-5110",
    sessionId: "SESS-3081",
    reason: "Technical miscommunications led to project delay. Both parties agree that sharing the escrow balance is the fairest path forward.",
    amount: "2,000 XLM",
    verdict: "split",
    verdictNote: "50/50 split agreed upon by both parties after arbitration mediation.",
    signaturesCount: 0,
    signaturesRequired: 3,
    votedMembers: [],
    status: "pending",
    createdAt: "2026-06-30T07:00:00Z",
    seeker: { name: "DevCorp", address: "GDF4...J2N1" },
    expert: { name: "Elena Rostova", address: "GA99...M8TT" }
  }
];

export default function ProposalVoter() {
  const [proposals, setProposals] = useState<ArbitrationProposal[]>(INITIAL_PROPOSALS);
  const [selectedProposal, setSelectedProposal] = useState<ArbitrationProposal | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [currentMemberAddress] = useState("GDBC...W789"); // Simulated committee member address

  const handleSign = (proposalId: string) => {
    setProposals(prev =>
      prev.map(prop => {
        if (prop.id === proposalId) {
          // Check if already signed
          if (prop.votedMembers.includes(currentMemberAddress)) {
            return prop;
          }
          const updatedVotedMembers = [...prop.votedMembers, currentMemberAddress];
          const updatedSignaturesCount = prop.signaturesCount + 1;
          const updatedStatus = updatedSignaturesCount >= prop.signaturesRequired ? "executed" : "pending";
          return {
            ...prop,
            signaturesCount: updatedSignaturesCount,
            votedMembers: updatedVotedMembers,
            status: updatedStatus
          };
        }
        return prop;
      })
    );

    // Update selected proposal if open
    if (selectedProposal && selectedProposal.id === proposalId) {
      const updatedSelected = proposals.find(p => p.id === proposalId);
      if (updatedSelected) {
        const alreadyVoted = updatedSelected.votedMembers.includes(currentMemberAddress);
        if (!alreadyVoted) {
          const count = updatedSelected.signaturesCount + 1;
          setSelectedProposal({
            ...updatedSelected,
            signaturesCount: count,
            votedMembers: [...updatedSelected.votedMembers, currentMemberAddress],
            status: count >= updatedSelected.signaturesRequired ? "executed" : "pending"
          });
        }
      }
    }

    setShowSignModal(false);
  };

  const getVerdictBadge = (verdict: DisputeVerdict) => {
    switch (verdict) {
      case "favour_seeker":
        return <Badge variant="info">Favour Seeker</Badge>;
      case "favour_expert":
        return <Badge variant="default">Favour Expert</Badge>;
      case "split":
        return <Badge variant="warning">Split Decision</Badge>;
    }
  };

  const getProgressPercentage = (signed: number, required: number) => {
    return Math.min(100, (signed / required) * 100);
  };

  const totalPending = proposals.filter(p => p.status === "pending").length;
  const totalExecuted = proposals.filter(p => p.status === "executed").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#110719] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Action</p>
            <p className="text-3xl font-bold mt-1 text-white">{totalPending}</p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#110719] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Signed/Executed</p>
            <p className="text-3xl font-bold mt-1 text-white">{totalExecuted}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#110719] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Member Status</p>
            <p className="text-sm font-bold mt-2 text-purple-300 truncate max-w-[150px]">{currentMemberAddress}</p>
          </div>
          <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposals List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gavel className="w-5 h-5 text-purple-400" />
              Arbitration Proposals
            </h2>
            <span className="text-xs text-gray-400">{proposals.length} active disputes</span>
          </div>

          <div className="space-y-3">
            {proposals.map(proposal => {
              const userSigned = proposal.votedMembers.includes(currentMemberAddress);
              return (
                <div
                  key={proposal.id}
                  onClick={() => setSelectedProposal(proposal)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    selectedProposal?.id === proposal.id
                      ? "bg-[#1d0e2b] border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "bg-[#110719] border-white/10 hover:border-white/20 hover:bg-[#150a20]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-400">{proposal.id}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs font-mono text-gray-400">Dispute {proposal.disputeId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getVerdictBadge(proposal.verdict)}
                      {proposal.status === "executed" ? (
                        <Badge variant="published">Executed</Badge>
                      ) : (
                        <Badge variant="draft">Pending Signatures</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-200 line-clamp-2 mb-4">{proposal.reason}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div>
                        Amount: <span className="font-semibold text-white">{proposal.amount}</span>
                      </div>
                      <div>
                        Created: <span className="font-semibold text-white">{new Date(proposal.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Signatures status indicator */}
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-300">
                          {proposal.signaturesCount}/{proposal.signaturesRequired} signed
                        </span>
                        <div className="w-24 bg-white/10 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(proposal.signaturesCount, proposal.signaturesRequired)}%` }}
                          />
                        </div>
                      </div>

                      {proposal.status !== "executed" && !userSigned && (
                        <Button
                          size="sm"
                          variant="glow"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProposal(proposal);
                            setShowSignModal(true);
                          }}
                          className="gap-1.5"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          Sign
                        </Button>
                      )}
                      {userSigned && proposal.status !== "executed" && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Signed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Proposal Details Sidebar */}
        <div className="bg-[#110719] border border-white/10 rounded-2xl p-6 h-fit space-y-6">
          {selectedProposal ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400">{selectedProposal.id}</span>
                  {selectedProposal.status === "executed" ? (
                    <Badge variant="published">Executed</Badge>
                  ) : (
                    <Badge variant="draft">Pending Action</Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">Proposal Details</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Session & Dispute ID</label>
                  <div className="text-sm font-mono text-gray-200 flex items-center gap-2">
                    <span>{selectedProposal.sessionId}</span>
                    <span className="text-gray-600">/</span>
                    <span>{selectedProposal.disputeId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Seeker</label>
                    <div className="text-sm font-semibold text-white">{selectedProposal.seeker.name}</div>
                    <div className="text-[10px] font-mono text-gray-500 truncate">{selectedProposal.seeker.address}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Expert</label>
                    <div className="text-sm font-semibold text-white">{selectedProposal.expert.name}</div>
                    <div className="text-[10px] font-mono text-gray-500 truncate">{selectedProposal.expert.address}</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Reason for Dispute</label>
                  <p className="text-sm text-gray-200 leading-relaxed bg-white/5 border border-white/5 rounded-xl p-3">
                    {selectedProposal.reason}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Proposed Resolution Verdict</label>
                  <div className="flex items-center gap-2 mb-2">
                    {getVerdictBadge(selectedProposal.verdict)}
                    <span className="text-sm font-semibold text-white">{selectedProposal.amount} Escrow Release</span>
                  </div>
                  <p className="text-xs text-gray-300 italic bg-purple-950/20 border border-purple-500/10 rounded-xl p-3">
                    &quot;{selectedProposal.verdictNote}&quot;
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-gray-300">Signatures Progress</span>
                    <span className="text-xs font-mono text-white bg-white/10 px-2 py-0.5 rounded">
                      {selectedProposal.signaturesCount}/{selectedProposal.signaturesRequired}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(selectedProposal.signaturesCount, selectedProposal.signaturesRequired)}%` }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block">Signers</label>
                    {selectedProposal.votedMembers.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No signatures cast yet</p>
                    ) : (
                      <div className="space-y-1">
                        {selectedProposal.votedMembers.map((address, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{address}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedProposal.status !== "executed" && !selectedProposal.votedMembers.includes(currentMemberAddress) ? (
                <Button
                  variant="glow"
                  className="w-full gap-2 mt-4"
                  onClick={() => setShowSignModal(true)}
                >
                  <PenTool className="w-4 h-4" />
                  Sign Proposal
                </Button>
              ) : selectedProposal.status === "executed" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center py-3 rounded-xl text-sm font-semibold mt-4">
                  Proposal Executed successfully
                </div>
              ) : (
                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-center py-3 rounded-xl text-xs mt-4">
                  You have signed this proposal. Waiting for other committee members.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <Inbox className="w-12 h-12 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-400">Select a proposal to view full details and vote status.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedProposal && (
        <Modal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          title="Sign Arbitration Proposal"
          className="max-w-md"
        >
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Confirm Committee Signature</h4>
                <p className="text-sm text-gray-300 mt-1">
                  By signing this proposal, you authorize the resolution and disbursement of <strong>{selectedProposal.amount}</strong> to the designated beneficiary based on the verdict.
                </p>
              </div>
            </div>

            <div className="bg-[#110719] p-4 rounded-xl border border-white/5 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Proposal ID:</span>
                <span className="font-mono text-white font-semibold">{selectedProposal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Verdict:</span>
                <span className="font-semibold text-white">
                  {selectedProposal.verdict.toUpperCase().replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Member Address:</span>
                <span className="font-mono text-white">{currentMemberAddress}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowSignModal(false)}>
                Cancel
              </Button>
              <Button variant="glow" onClick={() => handleSign(selectedProposal.id)}>
                Confirm & Sign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
