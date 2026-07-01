"use client";

import { useState, useCallback } from "react";

/**
 * Dispatches a manual heartbeat ping for the current expert.
 * Updates last_heartbeat timestamp on the backend, ensuring
 * visibility in the search index.
 * 
 * Uses the EXACT API call pattern from existing hooks (fetch + JSON).
 */
export async function pingHeartbeat(expertId: string): Promise<{ lastHeartbeat: number }> {
  const response = await fetch(`/api/experts/${expertId}/heartbeat`, {
    method: "POST",
  });
  
  if (!response.ok) {
    throw new Error("Failed to send heartbeat");
  }
  
  return response.json();
}

/**
 * Custom hook for managing heartbeat ping state and operations.
 * Handles loading, error, and success states for heartbeat operations.
 */
export function useHeartbeatPing(expertId: string) {
  const [isPinging, setIsPinging] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);

  const handlePingNow = useCallback(async () => {
    setIsPinging(true);
    setPingError(null);
    
    try {
      const result = await pingHeartbeat(expertId);
      setLastHeartbeat(result.lastHeartbeat);
    } catch (error) {
      setPingError("Failed to send heartbeat. Please try again.");
    } finally {
      setIsPinging(false);
    }
  }, [expertId]);

  return {
    isPinging,
    pingError,
    lastHeartbeat,
    handlePingNow,
    setLastHeartbeat,
    setPingError,
  };
}
