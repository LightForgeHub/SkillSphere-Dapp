"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { LiveCounter } from "@/components/session/LiveCounter";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useWallet } from "@/providers/WalletProvider";
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
} from "lucide-react";
import { cn } from "@/components/ui/utils";

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
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
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

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const remainingBalance = Math.max(0, session.escrowBalance - totalStreamed);
  const hourlyRate = session.ratePerSecond * 3600;

  return (
    <div className="min-h-screen bg-[#0B0113]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-6"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="glow" className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="flex flex-col items-center justify-center py-16">
                <LiveCounter
                  ratePerSecond={session.ratePerSecond}
                  onTotalChange={setTotalStreamed}
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: Timer,
                  label: "Duration",
                  value: formatTime(elapsed),
                },
                {
                  icon: Coins,
                  label: "Rate",
                  value: `${hourlyRate.toFixed(4)} XLM/hr`,
                },
                {
                  icon: Wallet,
                  label: "Escrow",
                  value: `${session.escrowBalance.toFixed(2)} XLM`,
                },
                {
                  icon: Gauge,
                  label: "Remaining",
                  value: `${remainingBalance.toFixed(4)} XLM`,
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
    </div>
  );
}
