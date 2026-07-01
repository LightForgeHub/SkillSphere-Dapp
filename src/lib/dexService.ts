// DEX service: live Stellar DEX swap-rate fetching for XLM ⇄ USDC
// used by the checkout swap widget before funding a session.
//
// Rates come from Horizon's `/paths/strict-send` endpoint, which queries
// live on-chain order books — no external price oracle is involved.

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface StellarAsset {
  code: string;
  // null for the network-native asset (XLM); otherwise the issuing account key
  issuer: string | null;
}

/** Stellar lumens — network-native, no issuer */
export const XLM: StellarAsset = { code: "XLM", issuer: null };

/**
 * Circle-issued USDC on Stellar mainnet. We intentionally target the canonical
 * Centre issuer (no bridge variant) per the integration spec.
 */
export const USDC: StellarAsset = {
  code: "USDC",
  issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
};

// ─── Horizon ──────────────────────────────────────────────────────────────────

// Per integration direction: rate fetches use mainnet regardless of the
// wallet's connected network, since we only display live prices and never
// post swaps to a network-specific USDC issuer from this layer.
const HORIZON_URL = "https://horizon.stellar.org";

// Matches the on-chain DEX contract default in contracts/src/dex.rs.
// Kept here as a configurable constant but not surfaced in the widget UI.
export const DEFAULT_MAX_SLIPPAGE_BPS = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PathHop {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface SwapPath {
  source_amount: string;
  destination_amount: string;
  destination_asset_code: string;
  destination_asset_issuer: string;
  path: PathHop[];
}

export interface SwapQuote {
  sourceAmount: number;
  destinationAmount: number;
  // destination units per 1 unit of source
  rate: number;
  path: SwapPath;
}

// ─── Horizon query helpers ────────────────────────────────────────────────────

function assetParams(asset: StellarAsset, role: "source" | "destination"): URLSearchParams {
  const params = new URLSearchParams();
  if (asset.issuer === null) {
    params.set(`${role}_asset_type`, "native");
  } else {
    params.set(`${role}_asset_type`, "credit_alphanum4");
    params.set(`${role}_asset_code`, asset.code);
    params.set(`${role}_asset_issuer`, asset.issuer);
  }
  return params;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Query Horizon `/paths/strict-send` for live swap paths from `source` → `dest`
 * given a fixed source amount. Returns paths sorted best-rate-last by Horizon;
 * caller should re-select the best via `getBestPath`.
 */
export async function fetchSwapPaths(
  source: StellarAsset,
  dest: StellarAsset,
  sourceAmount: number,
): Promise<SwapPath[]> {
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) return [];

  const params = new URLSearchParams();
  params.set("source_amount", sourceAmount.toFixed(7));
  for (const [k, v] of assetParams(source, "source")) params.set(k, v);
  for (const [k, v] of assetParams(dest, "destination")) params.set(k, v);

  const res = await fetch(`${HORIZON_URL}/paths/strict-send?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Horizon responded with ${res.status}`);
  }
  const data = (await res.json()) as {
    _embedded?: { records?: SwapPath[] };
  };
  return data._embedded?.records ?? [];
}

/**
 * Pick the path delivering the highest destination amount (best rate for the user).
 */
export function getBestPath(paths: SwapPath[]): SwapPath | null {
  if (paths.length === 0) return null;
  return paths.reduce((best, current) =>
    parseFloat(current.destination_amount) > parseFloat(best.destination_amount)
      ? current
      : best,
  );
}

/**
 * Build a full quote (estimated output + rate) for a `source` → `dest` swap.
 * Returns null if no path is currently available for the requested amount.
 */
export async function getSwapQuote(
  source: StellarAsset,
  dest: StellarAsset,
  sourceAmount: number,
): Promise<SwapQuote | null> {
  const paths = await fetchSwapPaths(source, dest, sourceAmount);
  const best = getBestPath(paths);
  if (!best) return null;

  const src = parseFloat(best.source_amount);
  const dst = parseFloat(best.destination_amount);
  if (!Number.isFinite(src) || src <= 0) return null;

  return {
    sourceAmount: src,
    destinationAmount: dst,
    rate: dst / src,
    path: best,
  };
}

/**
 * Reference rate (destination per 1 unit of source) for display purposes.
 * Uses a meaningful reference amount to keep the queried order book deep.
 */
export async function getReferenceRate(
  source: StellarAsset,
  dest: StellarAsset,
  referenceAmount = 100,
): Promise<number | null> {
  const quote = await getSwapQuote(source, dest, referenceAmount);
  return quote?.rate ?? null;
}