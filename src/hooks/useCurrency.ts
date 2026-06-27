"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisplayCurrency = "XLM" | "USD" | "EUR" | "GBP" | "JPY";

export interface CurrencyRates {
  usd: number;
  eur: number;
  gbp: number;
  jpy: number;
}

export interface UseCurrencyReturn {
  selectedCurrency: DisplayCurrency;
  setSelectedCurrency: (currency: DisplayCurrency) => void;
  rates: CurrencyRates | null;
  convert: (xlmAmount: number) => string;
  isLoading: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd,eur,gbp,jpy";

const REFRESH_INTERVAL_MS = 60_000;

const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  XLM: "XLM",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

const CURRENCY_DECIMALS: Record<DisplayCurrency, number> = {
  XLM: 4,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrency(): UseCurrencyReturn {
  const [selectedCurrency, setSelectedCurrency] =
    useState<DisplayCurrency>("USD");
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error(`CoinGecko responded with ${res.status}`);
      const data = (await res.json()) as {
        stellar: CurrencyRates;
      };
      setRates(data.stellar);
    } catch {
      // Leave stale rates in place on failure so UI remains functional
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const convert = useCallback(
    (xlmAmount: number): string => {
      const symbol = CURRENCY_SYMBOLS[selectedCurrency];
      const decimals = CURRENCY_DECIMALS[selectedCurrency];

      if (selectedCurrency === "XLM") {
        return `${xlmAmount.toFixed(decimals)} ${symbol}`;
      }

      if (!rates) {
        // Rates not yet loaded; show raw XLM as fallback
        return `${xlmAmount.toFixed(4)} XLM`;
      }

      const rate = rates[selectedCurrency.toLowerCase() as keyof CurrencyRates];
      const converted = xlmAmount * rate;

      // JPY has no decimal places; prefix the symbol for fiat currencies
      const formatted =
        selectedCurrency === "JPY"
          ? `${symbol}${Math.round(converted).toLocaleString()}`
          : `${symbol}${converted.toFixed(decimals)}`;

      return formatted;
    },
    [selectedCurrency, rates]
  );

  return { selectedCurrency, setSelectedCurrency, rates, convert, isLoading };
}
