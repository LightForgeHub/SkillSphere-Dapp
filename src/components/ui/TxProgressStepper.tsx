import React, { useEffect, useState } from 'react';
import { CheckCircle2, Check, Loader2, XCircle } from 'lucide-react';
import { TxStep } from '@/hooks/useSorobanTx';
import { cn } from './utils';

interface TxProgressStepperProps {
  step: TxStep;
  error: string | null;
  onClose: () => void;
}

const STEPS = [
  'Preparing transaction',
  'Awaiting wallet signature',
  'Submitting to Soroban',
  'Confirming on ledger',
] as const;

export const TxProgressStepper: React.FC<TxProgressStepperProps> = ({ step, error, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (step !== TxStep.IDLE) {
      setIsOpen(true);
    }

    // Auto-close shortly after the flow settles successfully.
    if (step === TxStep.SUCCESS) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  if (!isOpen) return null;

  const isErrored = !!error || step === TxStep.ERROR;
  const isSuccess = step === TxStep.SUCCESS;
  const currentIndex = isErrored ? -1 : isSuccess ? STEPS.length : step - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-label="Transaction progress"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* ── Header ── */}
        <div className="mb-5 flex items-center gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl border',
              isErrored && 'border-red-500/30 bg-red-500/10',
              !isErrored && isSuccess && 'border-emerald-500/30 bg-emerald-500/10',
              !isErrored && !isSuccess && 'border-violet-500/30 bg-violet-500/10'
            )}
          >
            {isErrored ? (
              <XCircle className="size-5 text-red-400" aria-hidden="true" />
            ) : isSuccess ? (
              <CheckCircle2 className="size-5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Loader2 className="size-5 animate-spin text-violet-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {isErrored
                ? 'Transaction failed'
                : isSuccess
                  ? 'Transaction successful'
                  : 'Processing transaction'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isErrored
                ? 'Nothing was submitted on-chain'
                : isSuccess
                  ? 'Submitted successfully'
                  : 'Stellar · Soroban'}
            </p>
          </div>
        </div>

        {/* ── Error body ── */}
        {isErrored ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
              <p className="text-xs leading-relaxed text-red-400">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onClose();
              }}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 py-2 text-sm font-medium text-white transition-colors hover:from-purple-700 hover:to-purple-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          /* ── Step list ── */
          <>
            <ol>
              {STEPS.map((label, idx) => {
                const isCompleted = currentIndex > idx;
                const isCurrent = currentIndex === idx;
                const isLast = idx === STEPS.length - 1;

                return (
                  <li key={label} className="relative flex gap-3 pb-6 last:pb-0">
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute left-[13px] top-8 bottom-0 w-px',
                          isCompleted ? 'bg-emerald-500/50' : 'bg-border'
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        'z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-200',
                        isCompleted &&
                          'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
                        isCurrent &&
                          'border-violet-500/50 bg-violet-500/15 text-violet-400 shadow-glow',
                        !isCompleted &&
                          !isCurrent &&
                          'border-border bg-muted/40 text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : isCurrent ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="min-w-0 pt-1">
                      <p
                        className={cn(
                          'text-xs font-medium leading-none',
                          isCompleted || isCurrent
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {label}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-[11px]',
                          isCurrent ? 'text-violet-400' : isCompleted ? 'text-emerald-400/70' : 'text-transparent'
                        )}
                      >
                        {isCurrent ? 'In progress…' : isCompleted ? 'Done' : '.'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* ── Success banner ── */}
            {isSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-center text-xs font-medium text-emerald-400">
                Transaction confirmed
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
