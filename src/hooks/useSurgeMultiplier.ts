"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseSurgeMultiplierReturn {
  multiplier: number;
  isLoading: boolean;
  isSurgeActive: boolean;
  error: string | null;
}

/**
 * Reads the current surge multiplier from the contract/oracle.
 * Returns 1 if surge is inactive or fetch fails.
 *
 * Surge multiplier values:
 * - 100 = 1.0x (no surge)
 * - 120 = 1.2x (20% surge)
 * - 150 = 1.5x (50% surge)
 * etc.
 */
export function useSurgeMultiplier(): UseSurgeMultiplierReturn {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurgeMultiplier = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Replace with actual contract read when oracle/contract hook is available
      // This would typically be:
      // const multiplierBps = await sorobanClient.readContractState("surge_multiplier");
      // const actualMultiplier = multiplierBps / 100;

      // For now, fetch from API endpoint (to be replaced with contract read)
      const res = await fetch("/api/surge-multiplier");
      
      if (!res.ok) {
        throw new Error(`Failed to fetch surge multiplier: ${res.status}`);
      }

      const data = await res.json();
      
      // Assuming API returns { multiplier: 1.2 } or { multiplierBps: 120 }
      const mult = data.multiplier || data.multiplierBps / 100 || 1;
      
      // Ensure multiplier is at least 1
      setMultiplier(Math.max(1, mult));
    } catch (err: any) {
      setError(err.message || "Failed to fetch surge multiplier");
      // Fail gracefully: default to no surge (multiplier = 1)
      setMultiplier(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurgeMultiplier();

    // Poll every 30 seconds for surge changes (matches typical blockchain block times)
    const interval = setInterval(fetchSurgeMultiplier, 30_000);

    return () => clearInterval(interval);
  }, [fetchSurgeMultiplier]);

  return {
    multiplier,
    isLoading,
    isSurgeActive: multiplier > 1,
    error,
  };
}
