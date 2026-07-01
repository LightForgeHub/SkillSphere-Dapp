"use client";

import React, { useEffect, useState, useCallback } from "react";
import { cn } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RpcStatus = "healthy" | "degraded" | "outage" | "loading";

export interface EndpointHealth {
  label: string;
  url: string;
  status: RpcStatus;
  /** Round-trip time in ms, undefined while loading or on outage */
  latencyMs?: number;
}

interface StatusIndicatorProps {
  /** Additional class names for the root element */
  className?: string;
  /** How often to poll in milliseconds (default: 30 000) */
  pollIntervalMs?: number;
  /** Show latency numbers next to each endpoint label */
  showLatency?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ??
  "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";

/** ms thresholds that determine badge colour */
const DEGRADED_THRESHOLD_MS = 1000;
const OUTAGE_TIMEOUT_MS = 8000;

const DEFAULT_POLL_INTERVAL_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ping a URL with a HEAD request (falling back to GET) and return the
 * round-trip latency in milliseconds.  Throws on network error or timeout.
 */
async function pingEndpoint(url: string): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    OUTAGE_TIMEOUT_MS,
  );

  const start = performance.now();
  try {
    await fetch(url, {
      method: "HEAD",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    // Some servers reject HEAD – retry with GET
    await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  return Math.round(performance.now() - start);
}

function latencyToStatus(latencyMs: number): RpcStatus {
  if (latencyMs >= DEGRADED_THRESHOLD_MS) return "degraded";
  return "healthy";
}

// ---------------------------------------------------------------------------
// Dot colours
// ---------------------------------------------------------------------------

const dotColors: Record<RpcStatus, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  outage: "bg-red-500",
  loading: "bg-gray-500",
};

const labelColors: Record<RpcStatus, string> = {
  healthy: "text-emerald-400",
  degraded: "text-amber-400",
  outage: "text-red-400",
  loading: "text-gray-400",
};

const labelText: Record<RpcStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  outage: "Outage",
  loading: "Checking…",
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useRpcHealth(pollIntervalMs: number) {
  const [endpoints, setEndpoints] = useState<EndpointHealth[]>([
    { label: "Horizon", url: HORIZON_URL, status: "loading" },
    { label: "Soroban RPC", url: SOROBAN_RPC_URL, status: "loading" },
  ]);

  const checkAll = useCallback(async () => {
    const results = await Promise.all(
      endpoints.map(async (ep) => {
        try {
          const latencyMs = await pingEndpoint(ep.url);
          return {
            ...ep,
            status: latencyToStatus(latencyMs),
            latencyMs,
          } satisfies EndpointHealth;
        } catch {
          return {
            ...ep,
            status: "outage" as RpcStatus,
            latencyMs: undefined,
          } satisfies EndpointHealth;
        }
      }),
    );
    setEndpoints(results);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkAll();
    const id = setInterval(checkAll, pollIntervalMs);
    return () => clearInterval(id);
  }, [checkAll, pollIntervalMs]);

  /** Roll up to the worst individual status */
  const overall: RpcStatus = endpoints.reduce<RpcStatus>((worst, ep) => {
    const order: RpcStatus[] = ["loading", "healthy", "degraded", "outage"];
    return order.indexOf(ep.status) > order.indexOf(worst)
      ? ep.status
      : worst;
  }, "loading");

  return { endpoints, overall };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PulseDot({ status }: { status: RpcStatus }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {(status === "healthy" || status === "degraded") && (
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-60",
            dotColors[status],
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          dotColors[status],
        )}
      />
    </span>
  );
}

function EndpointRow({
  endpoint,
  showLatency,
}: {
  endpoint: EndpointHealth;
  showLatency: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <PulseDot status={endpoint.status} />
      <span className="text-xs text-gray-400">{endpoint.label}</span>
      {showLatency && endpoint.latencyMs !== undefined && (
        <span className="text-xs text-gray-500">
          {endpoint.latencyMs}&nbsp;ms
        </span>
      )}
      <span className={cn("text-xs font-medium", labelColors[endpoint.status])}>
        {labelText[endpoint.status]}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * `StatusIndicator` — Polls the Stellar Horizon and Soroban RPC endpoints
 * and renders a compact health badge suitable for placement in the app footer.
 *
 * Colour coding:
 *  - 🟢 Green  → Healthy   (response < 1 000 ms)
 *  - 🟠 Orange → Degraded  (response ≥ 1 000 ms)
 *  - 🔴 Red    → Outage    (request failed / timed out)
 */
export function StatusIndicator({
  className,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  showLatency = false,
}: StatusIndicatorProps) {
  const { endpoints, overall } = useRpcHealth(pollIntervalMs);

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      aria-label="Blockchain network status"
      role="status"
    >
      {/* Overall summary pill */}
      <div className="flex items-center gap-2">
        <PulseDot status={overall} />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Network
        </span>
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            labelColors[overall],
          )}
        >
          {labelText[overall]}
        </span>
      </div>

      {/* Per-endpoint rows */}
      <div className="flex flex-col gap-1 pl-1">
        {endpoints.map((ep) => (
          <EndpointRow
            key={ep.url}
            endpoint={ep}
            showLatency={showLatency}
          />
        ))}
      </div>
    </div>
  );
}
