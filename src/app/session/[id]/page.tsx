"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { LiveCounter } from "@/components/session/LiveCounter";
import { SessionNotes } from "@/components/session/SessionNotes";
import { AppealFormModal } from "@/components/session/AppealForm";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useWallet } from "@/providers/WalletProvider";
import { CodeWorkspace } from "@/components/session/CodeWorkspace";
import {
  User,
  Wallet,
  CircleStop,
  Zap,
  ArrowLeft,
  Timer,
  Coins,
  Gauge,
  AlertTriangle,
  Code2,
  Gavel,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { Dispute } from "../../../../utils/types/types";

interface SessionData {
  id: string;
  expertName: string;
  expertAvatar: string;
  category: string;
  ratePerSecond: number;
  escrowBalance: number;
  status: "active" | "upcoming" | "completed" | "cancelled";
}

const MOCK_SESSION: SessionData = {
  id: "s1",
  expertName: "Alex Rivera",
  expertAvatar: "",
  category: "Blockchain Development",
  ratePerSecond: 0.00005,
  escrowBalance: 10,
  status: "active",
};

/**
 * Mock dispute — represents a settled dispute on this session that the seeker
 * may wish to appeal. In production this would come from the contract / API.
 */
const MOCK_DISPUTE: Dispute = {
  id: "d1",
  sessionId: "s1",
  raisedBy: "seeker",
  reason: "Expert did not cover the agreed topics and ended the session early.",
  status: "resolved",
  verdict: "favour_expert",
  verdictNote: "Insufficient evidence provided by seeker.",
  evidence: [],
  createdAt: "2025-06-20T10:00:00Z",
  resolvedAt: "2025-06-22T14:30:00Z",
};

const SESSION_TIMEOUT_SECONDS = 3600;

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const wallet = useWallet();
  const sessionId = params.id as string;

  const [session] = useState<SessionData>(() => ({
    ...MOCK_SESSION,
    id: sessionId,
  }));
  const [totalStreamed, setTotalStreamed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_TIMEOUT_SECONDS);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);

  /**
   * A resolved dispute attached to this session, if any.
   * Only render the appeal entry-point when this is non-null and the
   * dispute status is "resolved".
   */
  const sessionDispute: Dispute | null = MOCK_DISPUTE;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
      const remaining = Math.max(0, SESSION_TIMEOUT_SECONDS - (Date.now() - start) / 1000);
      setRemainingSeconds(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEndSession = useCallback(() => {
    setIsEnding(true);
    setShowEndConfirm(false);
    setTimeout(() => {
      router.push(`/dashboard/sessions/${sessionId}`);
    }, 2000);
  }, [router, sessionId]);

  const saveNotesToServer = useCallback(async (content: string) => {
    await fetch(`/api/session/${sessionId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }, [sessionId]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const remainingBalance = Math.max(0, session.escrowBalance - totalStreamed);
  const hourlyRate = session.ratePerSecond * 3600;

  return (
    <div className="min-h-screen bg-[#0B0113] flex flex-col">
      <div className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={cn("gap-2", showCodeEditor && "bg-white/10 text-white")}
          >
            <Code2 className="size-4" />
            {showCodeEditor ? "Hide Editor" : "Open Code Editor"}
          </Button>
        </div>

        <div className={cn("grid gap-6", showCodeEditor ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 lg:grid-cols-3 max-w-5xl mx-auto")}>
          <div className={cn("space-y-6 flex flex-col", showCodeEditor ? "" : "lg:col-span-2")}>
            <Card variant="glow" className="relative overflow-hidden flex-1 min-h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="flex flex-col items-center justify-center h-full py-16">
                <LiveCounter
                  ratePerSecond={session.ratePerSecond}
                  onTotalChange={setTotalStreamed}
                  remainingSeconds={remainingSeconds}
                  className="mb-8"
                />

                <div className="flex items-center gap-3">
                  <Badge variant="success" className="text-xs">
                    <span className="size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Session Active
                  </Badge>
                  <Badge variant="info" className="text-xs">
                    <Zap className="size-3" />
                    Live
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              {[
                {
                  icon: Timer,
                  label: "Duration",
                  value: formatTime(elapsed),
                },
                {
                  icon: Coins,
                  label: "Rate",
                  value: `${hourlyRate.toFixed(4)} /hr`,
                },
                {
                  icon: Wallet,
                  label: "Escrow",
                  value: `${session.escrowBalance.toFixed(2)}`,
                },
                {
                  icon: Gauge,
                  label: "Remaining",
                  value: `${remainingBalance.toFixed(4)}`,
                  highlight: remainingBalance < session.escrowBalance * 0.2,
                },
              ].map((stat) => (
                <Card key={stat.label} variant="glass" className="text-center">
                  <CardContent className="py-4">
                    <stat.icon className="size-4 mx-auto mb-2 text-white/40" />
                    <p className="text-xs text-white/50 mb-1">{stat.label}</p>
                    <p
                      className={cn(
                        "text-lg font-bold font-mono tabular-nums",
                        stat.highlight
                          ? "text-amber-400"
                          : "text-white"
                      )}
                    >
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {showCodeEditor ? (
            <div className="h-[600px] xl:h-auto">
              <CodeWorkspace onClose={() => setShowCodeEditor(false)} />
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="py-6 space-y-5">
                  <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <User className="size-4 text-white/50" />
                    Expert
                  </h3>

                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {session.expertName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {session.expertName}
                      </p>
                      <p className="text-xs text-white/50 truncate">
                        {session.category}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Wallet className="size-4 text-white/50" />
                    Wallet
                  </h3>

                  {wallet.address ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Connected</span>
                        <Badge variant="success" className="text-[10px]">
                          {wallet.network ?? "Unknown"}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-white/70 truncate">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/50">Balance</span>
                        <span className="text-white font-mono">
                          {wallet.balance ?? "—"} XLM
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className="text-xs text-white/50">
                        Connect your wallet to stream payments
                      </p>
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={wallet.connect}
                        disabled={wallet.isLoading}
                        className="w-full"
                      >
                        {wallet.isLoading ? "Connecting..." : "Connect Wallet"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <SessionNotes
                    sessionId={sessionId}
                    onSaveToServer={saveNotesToServer}
                  />
                </CardContent>
              </Card>

              {/* Appeal button — only visible when there is a resolved dispute */}
              {sessionDispute?.status === "resolved" && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/60"
                  onClick={() => setShowAppealModal(true)}
                  type="button"
                >
                  <Gavel className="size-5" />
                  Appeal Dispute Decision
                </Button>
              )}

              <Button
                variant="destructive"
                size="lg"
                className="w-full"
                disabled={isEnding}
                onClick={() => setShowEndConfirm(true)}
              >
                <CircleStop className="size-5" />
                {isEnding ? "Settling..." : "End Session"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showEndConfirm} onClose={() => setShowEndConfirm(false)}>
        <div className="text-center space-y-4">
          <div className="mx-auto size-14 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="size-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">End Session?</h2>
          <p className="text-sm text-white/60">
            The session will be settled immediately.{" "}
            <strong className="text-white">{totalStreamed.toFixed(7)} XLM</strong>{" "}
            will be transferred to {session.expertName}, and the remaining{" "}
            {remainingBalance.toFixed(7)} XLM will be refunded to your wallet.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setShowEndConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndSession}
            >
              Confirm & Settle
            </Button>
          </div>
        </div>
      </Modal>

      {/* Appeal Form Modal — only mounted when a resolved dispute exists */}
      {sessionDispute?.status === "resolved" && (
        <AppealFormModal
          isOpen={showAppealModal}
          onClose={() => setShowAppealModal(false)}
          dispute={sessionDispute}
          sessionTitle={session.category}
          onAppealSubmitted={() => setShowAppealModal(false)}
        />
      )}
    </div>
  );
}
