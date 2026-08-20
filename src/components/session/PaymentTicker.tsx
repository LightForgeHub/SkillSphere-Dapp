"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, LockKeyhole } from "lucide-react";
import { cn } from "@/components/ui/utils";
import styles from "./PaymentTicker.module.css";

export type PaymentTickerStatus = "active" | "paused" | "ended";

export interface PaymentTickerProps {
  escrowAmount: number;
  expertHourlyRate: number;
  sessionStartTime: Date | number | string;
  status?: PaymentTickerStatus;
  className?: string;
  onAmountChange?: (expertEarned: number, escrowRemaining: number) => void;
}

const TICK_INTERVAL_MS = 1_000;

function toTimestamp(value: PaymentTickerProps["sessionStartTime"]): number {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function sanitizeAmount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function formatXlm(value: number): string {
  return `${sanitizeAmount(value).toFixed(4)} XLM`;
}

/**
 * Displays the escrow transfer in real time. `status` must reflect the
 * authoritative session state so payments freeze immediately when paused or
 * ended.
 */
export function PaymentTicker({
  escrowAmount,
  expertHourlyRate,
  sessionStartTime,
  status = "active",
  className,
  onAmountChange,
}: PaymentTickerProps) {
  const safeEscrow = sanitizeAmount(escrowAmount);
  const perSecondRate = sanitizeAmount(expertHourlyRate) / 3_600;
  const startTimestamp = toTimestamp(sessionStartTime);
  const initialElapsedSeconds = Math.max(0, (Date.now() - startTimestamp) / 1_000);
  const initialEarned = Math.min(safeEscrow, initialElapsedSeconds * perSecondRate);

  const [expertEarned, setExpertEarned] = useState(0);
  const earnedAtStatusChangeRef = useRef(initialEarned);
  const activeSinceRef = useRef(Date.now());
  const previousStatusRef = useRef(status);

  useEffect(() => {
    const now = Date.now();
    const previousStatus = previousStatusRef.current;

    if (previousStatus === "active") {
      earnedAtStatusChangeRef.current = Math.min(
        safeEscrow,
        earnedAtStatusChangeRef.current +
          ((now - activeSinceRef.current) / 1_000) * perSecondRate,
      );
    }

    if (status === "active") {
      activeSinceRef.current = now;
    }
    previousStatusRef.current = status;

    const updateAmounts = () => {
      const activeIncrement =
        status === "active"
          ? ((Date.now() - activeSinceRef.current) / 1_000) * perSecondRate
          : 0;
      const earned = Math.min(
        safeEscrow,
        earnedAtStatusChangeRef.current + activeIncrement,
      );
      const remaining = Math.max(0, safeEscrow - earned);

      setExpertEarned(earned);
      onAmountChange?.(earned, remaining);
    };

    updateAmounts();

    if (status !== "active" || safeEscrow === 0 || perSecondRate === 0) {
      return;
    }

    const intervalId = window.setInterval(updateAmounts, TICK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [onAmountChange, perSecondRate, safeEscrow, status]);

  useEffect(() => {
    const elapsedSeconds = Math.max(0, (Date.now() - startTimestamp) / 1_000);
    earnedAtStatusChangeRef.current = Math.min(
      safeEscrow,
      elapsedSeconds * perSecondRate,
    );
    activeSinceRef.current = Date.now();
  }, [perSecondRate, safeEscrow, startTimestamp]);

  const escrowRemaining = Math.max(0, safeEscrow - expertEarned);
  const progress = safeEscrow === 0 ? 0 : (expertEarned / safeEscrow) * 100;
  const isStreaming =
    status === "active" && escrowRemaining > 0 && perSecondRate > 0;
  const statusLabel =
    status === "paused"
      ? "Payment paused"
      : status === "ended" || escrowRemaining === 0
        ? "Payment stopped"
        : "Streaming live";

  return (
    <section
      className={cn(
        styles.ticker,
        status === "paused" && styles.paused,
        status === "ended" && styles.ended,
        "rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5",
        className,
      )}
      aria-label="Live session payment"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Payment stream</p>
          <p className="mt-0.5 text-xs text-foreground/50">
            {formatXlm(perSecondRate)} per second
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
            isStreaming
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-foreground/5 text-foreground/50",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              isStreaming ? "animate-pulse bg-emerald-400" : "bg-foreground/30",
            )}
          />
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <LockKeyhole className="mb-2 size-4 text-violet-400" aria-hidden="true" />
          <p className="text-xs text-foreground/50">Escrow Remaining</p>
          <p className={cn(styles.value, "mt-1 truncate font-mono text-lg font-bold tabular-nums")}>
            {formatXlm(escrowRemaining)}
          </p>
        </div>

        <span className="text-foreground/30" aria-hidden="true">→</span>

        <div className="min-w-0 text-right">
          <CircleDollarSign
            className="mb-2 ml-auto size-4 text-emerald-400"
            aria-hidden="true"
          />
          <p className="text-xs text-foreground/50">Expert Earned</p>
          <p
            className={cn(
              styles.value,
              "mt-1 truncate font-mono text-lg font-bold tabular-nums text-emerald-400",
            )}
          >
            {formatXlm(expertEarned)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className={styles.flow} aria-hidden="true">
          <div className={styles.progress} style={{ width: `${progress}%` }} />
          {isStreaming && (
            <>
              <span className={styles.particle} />
              <span className={styles.particle} />
              <span className={styles.particle} />
            </>
          )}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-foreground/40">
          <span>Locked</span>
          <span>{progress.toFixed(1)}% streamed</span>
          <span>Earned</span>
        </div>
      </div>
    </section>
  );
}

export default PaymentTicker;
