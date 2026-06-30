"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, RefreshCw, AlertTriangle } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import {
  XLM,
  USDC,
  getSwapQuote,
  getReferenceRate,
  type SwapQuote,
} from "@/lib/dexService";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum native XLM kept aside for Stellar transaction fees (matches FundSessionModal). */
const MIN_XLM_FOR_FEES = 1;
/** Debounce window for re-fetching a quote after the user stops typing. */
const QUOTE_DEBOUNCE_MS = 400;
/** How often the reference rate refreshes in the background. */
const RATE_REFRESH_MS = 30_000;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TokenSwapWidgetProps {
  /** Pre-fill the XLM "You Pay" field, e.g. with a session cost. */
  initialAmount?: number;
  /**
   * Click handler for the swap action. The widget only fetches live rates and
   * surfaces the estimated USDC out; actual on-chain swap execution is delegated
   * to the parent (e.g. the checkout flow) so this layer stays network-agnostic.
   */
  onSwap?: (xlmAmount: number, usdcEstimate: number) => void | Promise<void>;
  /** Disables the swap action (e.g. while a parent transaction is in flight). */
  isSwapping?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TokenSwapWidget({
  initialAmount,
  onSwap,
  isSwapping = false,
  className,
}: TokenSwapWidgetProps) {
  const { address, balance, isLoading: walletLoading } = useWallet();

  const [xlmInput, setXlmInput] = useState<string>(
    initialAmount ? initialAmount.toString() : "",
  );
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [referenceRate, setReferenceRate] = useState<number | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reference rate (background refresh) ─────────────────────────────────────

  const refreshReferenceRate = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshingRate(true);
    try {
      const rate = await getReferenceRate(XLM, USDC);
      if (rate !== null) setReferenceRate(rate);
    } catch {
      // Leave stale rate in place so the UI stays functional
    } finally {
      if (!silent) setIsRefreshingRate(false);
    }
  }, []);

  useEffect(() => {
    refreshReferenceRate();
    const id = setInterval(() => refreshReferenceRate(true), RATE_REFRESH_MS);
    return () => clearInterval(id);
  }, [refreshReferenceRate]);

  // ── Exact quote for the entered amount (debounced) ───────────────────────────

  const xlmAmount = useMemo(() => {
    const n = parseFloat(xlmInput);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [xlmInput]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (xlmAmount <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    setIsFetchingQuote(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = await getSwapQuote(XLM, USDC, xlmAmount);
        setQuote(q);
        if (!q) setError("No swap path available for this amount");
      } catch {
        setError("Failed to fetch live swap rate");
        setQuote(null);
      } finally {
        setIsFetchingQuote(false);
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [xlmAmount]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const walletBalance = balance !== null ? parseFloat(balance) : null;
  const balanceUnavailable =
    walletLoading || !address || walletBalance === null || Number.isNaN(walletBalance);
  const insufficientBalance =
    !balanceUnavailable && walletBalance !== null && walletBalance < xlmAmount + MIN_XLM_FOR_FEES;

  const usdcEstimate = quote?.destinationAmount ?? 0;
  const effectiveRate = quote?.rate ?? referenceRate;

  const canSwap =
    !isSwapping &&
    !isFetchingQuote &&
    xlmAmount > 0 &&
    quote !== null &&
    !balanceUnavailable &&
    !insufficientBalance;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMax = () => {
    if (balanceUnavailable || walletBalance === null) return;
    const max = Math.max(0, walletBalance - MIN_XLM_FOR_FEES);
    setXlmInput(max > 0 ? max.toFixed(7).replace(/\.?0+$/, "") : "0");
  };

  const handleSwap = async () => {
    if (!canSwap || !quote) return;
    await onSwap?.(xlmAmount, quote.destinationAmount);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={`bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-5 space-y-4 ${className ?? ""}`}
    >
      {/* Header / live rate */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Swap XLM → USDC</h3>
        <button
          type="button"
          onClick={() => refreshReferenceRate()}
          disabled={isRefreshingRate}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-300 transition-colors disabled:opacity-50"
          title="Refresh live rate"
        >
          <RefreshCw size={12} className={isRefreshingRate ? "animate-spin" : ""} />
          {effectiveRate
            ? `1 XLM ≈ ${effectiveRate.toFixed(4)} USDC`
            : "Fetching rate…"}
        </button>
      </div>

      {/* You Pay (XLM) */}
      <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>You Pay</span>
          <button
            type="button"
            onClick={handleMax}
            disabled={balanceUnavailable}
            className="text-purple-300 hover:text-purple-200 disabled:opacity-50 transition-colors"
          >
            Max
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="0.0"
            value={xlmInput}
            onChange={(e) => setXlmInput(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-gray-600 w-full"
          />
          <span className="shrink-0 text-sm font-semibold text-gray-200 bg-purple-600/20 px-2 py-1 rounded-md">
            XLM
          </span>
        </div>
        {!balanceUnavailable && walletBalance !== null && (
          <p className="text-xs text-gray-500">
            Balance: {walletBalance.toFixed(2)} XLM
          </p>
        )}
        {balanceUnavailable && address && (
          <p className="text-xs text-gray-500">Balance unavailable</p>
        )}
      </div>

      {/* Direction indicator */}
      <div className="flex justify-center -my-2">
        <div className="bg-purple-500/20 border border-purple-500/40 rounded-full p-1.5">
          <ArrowDown size={14} className="text-purple-300" />
        </div>
      </div>

      {/* You Receive (USDC estimate) */}
      <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>You Receive (estimated)</span>
          {isFetchingQuote && (
            <span className="text-purple-300 animate-pulse">fetching…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-2xl font-semibold text-gray-100">
            {usdcEstimate > 0 ? usdcEstimate.toFixed(4) : "0.0"}
          </span>
          <span className="shrink-0 text-sm font-semibold text-gray-200 bg-purple-600/20 px-2 py-1 rounded-md">
            USDC
          </span>
        </div>
      </div>

      {/* Inline error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
        >
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">{error}</p>
        </div>
      )}

      {/* Insufficient balance warning */}
      {insufficientBalance && walletBalance !== null && (
        <div
          role="alert"
          className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
        >
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200">
            Insufficient XLM (keep {MIN_XLM_FOR_FEES} XLM for fees)
          </p>
        </div>
      )}

      {/* Swap action */}
      <button
        type="button"
        onClick={handleSwap}
        disabled={!canSwap}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-600/50 disabled:to-pink-600/50 rounded-lg font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSwapping
          ? "Swapping…"
          : !address
            ? "Connect wallet to swap"
            : insufficientBalance
              ? "Insufficient balance"
              : "Swap XLM → USDC"}
      </button>
    </div>
  );
}