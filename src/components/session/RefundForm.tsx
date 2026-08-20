"use client";

import { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Coins,
  Info,
  RotateCcw,
  Scale,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { TxProgressStepper } from "@/components/ui/TxProgressStepper";
import { useSorobanTx, TxStep } from "@/hooks/useSorobanTx";
import { useWallet } from "@/providers/WalletProvider";
import { cn } from "@/components/ui/utils";

// Types

export type RefundableSessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "disputed";

export type SettlementDivision =
  | "full_refund"
  | "split_50_50"
  | "split_75_25"
  | "custom";

export type RefundActorRole = "seeker" | "admin";

interface RefundFormProps {
  /** Identifier of the session whose escrow is being refunded. */
  sessionId: string;
  /** Human-readable session title shown for context. */
  sessionTitle: string;
  /** Current lifecycle status of the session. */
  sessionStatus: RefundableSessionStatus;
  /** Total XLM currently locked in escrow, e.g. "120.00". */
  escrowAmount: string;
  /** Who is initiating the refund. Admins unlock the custom-split option. */
  userRole?: RefundActorRole;
  /** Fired once the refund transaction completes successfully. */
  onRefundSubmitted?: (refundId: string, division: SettlementDivision) => void;
}

type FormStep = "form" | "confirm" | "success";

// Settlement presets - percentage refunded to the SEEKER.

const DIVISION_META: Record <
  SettlementDivision,
  { label: string; seekerPct: number | null; description: string }
> = {
  full_refund: {
    label: "Full Refund - 100% to seeker",
    seekerPct: 100,
    description: "All escrowed funds are returned to the seeker.",
  },
  split_50_50: {
    label: "50 / 50 Split",
    seekerPct: 50,
    description: "Escrow is divided equally between seeker and expert.",
  },
  split_75_25: {
    label: "75 / 25 - seeker favoured",
    seekerPct: 75,
    description: "Seeker recovers 75%; the expert keeps 25% for work delivered.",
  },
  custom: {
    label: "Custom split (admin)",
    seekerPct: null, // resolved from the slider
    description: "Manually set the seeker's share of the escrowed funds.",
  },
};

const REFUNDABLE_STATUSES: RefundableSessionStatus[] = ["active", "paused"];

function parseEscrow(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatXlm(n: number): string {
  return `${n.toFixed(2)} XLM`;
}

// Sub-components

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="px-4 py-3 flex justify-between items-start gap-3">
      <span className="text-xs text-foreground/50 shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs font-medium text-foreground/90 text-right",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
}

// RefundForm (inline card variant)

/**
 * Renders the refund / settlement card for a session. The parent controls
 * mounting; the card itself also guards on sessionStatus so the actionable
 * form only appears for active or paused sessions.
 */
export function RefundForm({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId,
  sessionTitle,
  sessionStatus,
  escrowAmount,
  userRole = "seeker",
  onRefundSubmitted,
}: RefundFormProps) {
  const { address, connect, isLoading: walletLoading } = useWallet();
  const {
    step: txStep,
    error: txError,
    executeTx,
    reset: resetTx,
  } = useSorobanTx();

  const [step, setStep] = useState<FormStep>("form");
  const [division, setDivision] = useState<SettlementDivision>("full_refund");
  const [customSeekerPct, setCustomSeekerPct] = useState<number>(50);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const divisionId = useId();
  const customId = useId();

  const escrow = parseEscrow(escrowAmount);
  const isRefundable = REFUNDABLE_STATUSES.includes(sessionStatus);
  const isAdmin = userRole === "admin";

  const seekerPct =
    division === "custom"
      ? customSeekerPct
      : DIVISION_META[division].seekerPct ?? 0;
  const expertPct = 100 - seekerPct;
  const seekerAmount = (escrow * seekerPct) / 100;
  const expertAmount = escrow - seekerAmount;

  const isTxInFlight =
    txStep !== TxStep.IDLE &&
    txStep !== TxStep.SUCCESS &&
    txStep !== TxStep.ERROR;

  useEffect(() => {
    if (txStep === TxStep.SUCCESS && step !== "success") {
      const id = refundId ?? `REFUND_${Date.now()}`;
      setRefundId(id);
      setStep("success");
      onRefundSubmitted?.(id, division);
    }
    if (txStep === TxStep.ERROR) {
      setSubmitError(txError ?? "Refund transaction failed. Please try again.");
    }
  }, [txStep, txError, step, division, refundId, onRefundSubmitted]);

  function handleDivisionChange(value: string) {
    setDivision(value as SettlementDivision);
    setSubmitError(null);
  }

  function handleConfirm() {
    setSubmitError(null);
    setRefundId(`REFUND_${Date.now()}`);

    // Drives PREPARING -> AWAITING_SIGNATURE (Freighter prompt) -> SUBMITTING
    // -> CONFIRMING -> SUCCESS, surfaced by the TxProgressStepper overlay below.
    void executeTx(async () => {
      // TODO(on-chain): replace this simulated settlement with the real
      // Soroban contract call once the binding is wired, e.g.
      //   settle_session(sessionId, seekerBps, expertBps)
      // signed through Freighter. seekerBps = seekerPct * 100.
      await Promise.resolve();
    });
  }

  function handleReset() {
    setStep("form");
    setDivision("full_refund");
    setCustomSeekerPct(50);
    setRefundId(null);
    setSubmitError(null);
    resetTx();
  }

  function handleTxModalClose() {
    resetTx();
  }

  return (
    <section
      aria-labelledby="refund-form-heading"
      className="rounded-2xl border border-[#9B59FF]/25 bg-gradient-to-br from-[#9B59FF]/5 to-blue-500/5 p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl border border-[#9B59FF]/30 bg-[#9B59FF]/10 p-2.5">
          <RotateCcw className="size-5 text-[#9B59FF]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id="refund-form-heading"
            className="text-base font-semibold text-foreground"
          >
            Request Refund
          </h2>
          <p className="text-xs text-foreground/50 mt-0.5 truncate">
            Recover escrowed funds for &ldquo;{sessionTitle}&rdquo;
          </p>
        </div>
        <Badge
          variant={isRefundable ? "info" : "secondary"}
          className="shrink-0 capitalize"
        >
          {sessionStatus}
        </Badge>
      </div>

      {/* Gate: non-refundable status */}
      {!isRefundable && (
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <Info
            className="size-4 shrink-0 text-foreground/40 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-foreground/60 leading-relaxed">
            Refunds can only be requested while a session is{" "}
            <span className="font-medium text-foreground/80">active</span> or{" "}
            <span className="font-medium text-foreground/80">paused</span>. This
            session is currently{" "}
            <span className="font-medium text-foreground/80">
              {sessionStatus}
            </span>
            .
          </p>
        </div>
      )}

      {/* Gate: wallet not connected */}
      {isRefundable && !address && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
            <Wallet
              className="size-4 shrink-0 text-blue-400 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-xs text-foreground/60 leading-relaxed">
              Connect your Freighter wallet to initiate an on-chain refund.
            </p>
          </div>
          <Button
            onClick={() => void connect()}
            disabled={walletLoading}
            className="w-full gap-2"
            type="button"
          >
            <Wallet className="size-4" aria-hidden="true" />
            {walletLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        </div>
      )}

      {/* Main flow */}
      {isRefundable && address && (
        <>
          {step === "form" && (
            <div className="space-y-5">
              {/* Escrow summary */}
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <Coins
                  className="size-4 shrink-0 text-[#9B59FF]"
                  aria-hidden="true"
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs text-foreground/50">
                    Locked in escrow
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatXlm(escrow)}
                  </span>
                </div>
              </div>

              {/* Settlement division */}
              <div className="space-y-1.5">
                <label
                  htmlFor={divisionId}
                  className="block text-xs font-medium text-foreground/70"
                >
                  Settlement division{" "}
                  <span className="text-red-400" aria-hidden="true">
                    *
                  </span>
                </label>
                <Select value={division} onValueChange={handleDivisionChange}>
                  <SelectTrigger id={divisionId} aria-label="Settlement division">
                    <SelectValue placeholder="Select how funds are divided" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_refund">
                      {DIVISION_META.full_refund.label}
                    </SelectItem>
                    <SelectItem value="split_50_50">
                      {DIVISION_META.split_50_50.label}
                    </SelectItem>
                    <SelectItem value="split_75_25">
                      {DIVISION_META.split_75_25.label}
                    </SelectItem>
                    {isAdmin && (
                      <SelectItem value="custom">
                        {DIVISION_META.custom.label}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-foreground/30">
                  {DIVISION_META[division].description}
                </p>
              </div>

              {/* Custom slider (admin only) */}
              {division === "custom" && isAdmin && (
                <div className="space-y-2">
                  <label
                    htmlFor={customId}
                    className="flex items-center justify-between text-xs font-medium text-foreground/70"
                  >
                    <span>Seeker share</span>
                    <span className="font-mono text-foreground/90">
                      {customSeekerPct}%
                    </span>
                  </label>
                  <input
                    id={customId}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={customSeekerPct}
                    onChange={(e) =>
                      setCustomSeekerPct(parseInt(e.target.value, 10))
                    }
                    className="w-full accent-[#9B59FF]"
                    aria-valuetext={`${customSeekerPct} percent to seeker`}
                  />
                </div>
              )}

              {/* Breakdown */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-foreground/50">
                    <Scale className="size-3.5" aria-hidden="true" /> Seeker
                    refund ({seekerPct}%)
                  </span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {formatXlm(seekerAmount)}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-foreground/50">
                    Expert settlement ({expertPct}%)
                  </span>
                  <span className="text-sm font-medium text-foreground/80">
                    {formatXlm(expertAmount)}
                  </span>
                </div>
              </div>

              {/* Freighter notice */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                <Info
                  className="size-4 shrink-0 text-blue-400 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-xs text-foreground/60 leading-relaxed">
                  You will be asked to approve this refund in Freighter before it
                  is submitted on-chain.
                </p>
              </div>

              <Button
                className="w-full gap-2"
                disabled={escrow <= 0}
                onClick={() => setStep("confirm")}
                type="button"
              >
                Review Refund
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
                <SummaryRow label="Session" value={sessionTitle} />
                <SummaryRow
                  label="Division"
                  value={DIVISION_META[division].label}
                />
                <SummaryRow
                  label="Seeker refund"
                  value={`${formatXlm(seekerAmount)} (${seekerPct}%)`}
                  valueClass="text-emerald-400"
                />
                <SummaryRow
                  label="Expert settlement"
                  value={`${formatXlm(expertAmount)} (${expertPct}%)`}
                />
              </div>

              {submitError && (
                <p
                  role="alert"
                  className="flex items-center gap-1.5 text-xs text-red-400"
                >
                  <AlertTriangle
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {submitError}
                </p>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <AlertTriangle
                  className="size-4 shrink-0 text-amber-400 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-xs text-foreground/60 leading-relaxed">
                  On-chain refunds are irreversible once confirmed. Verify the
                  settlement split before signing.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setStep("form")}
                  disabled={isTxInFlight}
                  type="button"
                >
                  Go Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={handleConfirm}
                  disabled={isTxInFlight}
                  type="button"
                >
                  <Coins className="size-4" aria-hidden="true" />
                  {isTxInFlight ? "Processing..." : "Confirm & Sign"}
                </Button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="relative">
                <div
                  className="absolute inset-0 bg-emerald-500/30 rounded-full blur-lg animate-pulse"
                  aria-hidden="true"
                />
                <div className="relative rounded-full border border-emerald-500/50 bg-emerald-500/15 p-4">
                  <CheckCircle2
                    className="size-8 text-emerald-400"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">
                  Refund Submitted
                </h3>
                <p className="text-xs text-foreground/55 max-w-xs leading-relaxed">
                  {formatXlm(seekerAmount)} has been refunded to the seeker for
                  &ldquo;{sessionTitle}&rdquo;.
                </p>
              </div>

              {refundId && (
                <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between text-xs">
                  <span className="text-foreground/50">Refund ID</span>
                  <span className="font-mono font-semibold text-foreground/80">
                    {refundId}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleReset}
                type="button"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                New Refund
              </Button>
            </div>
          )}
        </>
      )}

      {/* Transaction progress overlay (self-managing) */}
      <TxProgressStepper
        step={txStep}
        error={txError}
        onClose={handleTxModalClose}
      />
    </section>
  );
}

// RefundFormModal (overlay wrapper)

interface RefundFormModalProps extends RefundFormProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Wraps RefundForm inside the shared Modal for contexts where the refund flow
 * should open as an overlay rather than render as an inline card.
 */
export function RefundFormModal({
  isOpen,
  onClose,
  ...formProps
}: RefundFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Refund" className="max-w-xl">
      <div className="p-6">
        <RefundForm {...formProps} />
      </div>
    </Modal>
  );
}
