"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface LiveCounterProps {
  ratePerSecond: number;
  onTotalChange?: (total: number) => void;
  className?: string;
  remainingSeconds?: number;
}

export function LiveCounter({
  ratePerSecond,
  onTotalChange,
  className,
  remainingSeconds = 0,
}: LiveCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [countdown, setCountdown] = useState(remainingSeconds);
  const totalRef = useRef(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    startRef.current = Date.now();
    totalRef.current = 0;
    setCountdown(remainingSeconds);

    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const total = elapsed * ratePerSecond;
      totalRef.current = total;
      setDisplayValue(total);
      onTotalChange?.(total);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [ratePerSecond, onTotalChange, remainingSeconds]);

  useEffect(() => {
    setCountdown(remainingSeconds);
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const formatXLM = (value: number): string => {
    if (value < 0.00001) return value.toFixed(10);
    if (value < 0.01) return value.toFixed(7);
    if (value < 1) return value.toFixed(5);
    return value.toFixed(4);
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getCountdownColor = (seconds: number): string => {
    const mins = seconds / 60;
    if (mins > 10) return "text-emerald-400";
    if (mins > 5) return "text-amber-400";
    return "text-red-400";
  };

  const getCountdownBg = (seconds: number): string => {
    const mins = seconds / 60;
    if (mins > 10) return "border-emerald-500/30 bg-emerald-500/10";
    if (mins > 5) return "border-amber-500/30 bg-amber-500/10";
    return "border-red-500/30 bg-red-500/10 animate-pulse";
  };

  const isWarning = countdown <= 300 && countdown > 0;

  const parts = formatXLM(displayValue).split(".");

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <p className="text-sm font-medium text-white/50 tracking-wide uppercase">
        Streaming
      </p>

      <div className="flex items-baseline gap-0.5 font-mono tracking-tighter tabular-nums">
        <span className="text-6xl font-bold text-white">{parts[0]}</span>
        {parts[1] && (
          <span className="text-4xl font-semibold text-white/60">.{parts[1]}</span>
        )}
        <span className="text-lg font-medium text-white/40 ml-1">XLM</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-white/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
        <span className="text-white/30">|</span>
        <span>
          {ratePerSecond < 0.00001
            ? `${(ratePerSecond * 1_000_000).toFixed(2)} µXLM/s`
            : `${ratePerSecond.toFixed(7)} XLM/s`}
        </span>
      </div>

      {countdown > 0 && (
        <div
          className={cn(
            "mt-4 flex items-center gap-3 rounded-xl border px-5 py-3",
            getCountdownBg(countdown)
          )}
        >
          <Clock className={cn("size-5", getCountdownColor(countdown))} />
          <div className="flex flex-col">
            <span className="text-xs text-white/70">
              Session auto-closes in
            </span>
            <span
              className={cn(
                "text-xl font-bold font-mono tabular-nums",
                getCountdownColor(countdown)
              )}
            >
              {formatTime(countdown)}
            </span>
          </div>
          {isWarning && (
            <AlertTriangle className="size-4 text-red-400 ml-2" />
          )}
        </div>
      )}

      {countdown === 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3">
          <AlertTriangle className="size-5 text-red-400" />
          <span className="text-sm font-medium text-red-400">
            Session expiring — auto-settling shortly
          </span>
        </div>
      )}
    </div>
  );
}
