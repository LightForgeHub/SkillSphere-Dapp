"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  isConnected,
  getAddress,
  getNetwork,
  setAllowed,
} from "@stellar/freighter-api";

// Mock wallet configuration for CI/testing environments
const MOCK_ENABLED = process.env.NEXT_PUBLIC_MOCK_WALLET === "true";
const MOCK_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJQNZVIU3TWCYGIQUI5GUDFQD";
const MOCK_NETWORK = "TESTNET";
const MOCK_BALANCE = "1000.00";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletState {
  /** Stellar public key (G…) of the connected account, or null */
  address: string | null;
  /** Network string returned by Freighter, e.g. "TESTNET" | "PUBLIC" */
  network: string | null;
  /** XLM balance fetched from Horizon, or null while loading */
  balance: string | null;
  isLoading: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Horizon balance helper ───────────────────────────────────────────────────

const HORIZON_URLS: Record<string, string> = {
  PUBLIC: "https://horizon.stellar.org",
  TESTNET: "https://horizon-testnet.stellar.org",
  FUTURENET: "https://horizon-futurenet.stellar.org",
};

async function fetchXlmBalance(
  address: string,
  network: string
): Promise<string | null> {
  try {
    const baseUrl = HORIZON_URLS[network] ?? HORIZON_URLS.TESTNET;
    const res = await fetch(`${baseUrl}/accounts/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const native = (data.balances as Array<{ asset_type: string; balance: string }>).find(
      (b) => b.asset_type === "native"
    );
    return native ? parseFloat(native.balance).toFixed(2) : null;
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    network: null,
    balance: null,
    isLoading: false,
    error: null,
  });

  // Re-hydrate state (address + network + balance) from Freighter or mock
  const refresh = useCallback(async () => {
    try {
      if (MOCK_ENABLED) {
        setState((prev) => ({
          ...prev,
          address: MOCK_ADDRESS,
          network: MOCK_NETWORK,
          balance: MOCK_BALANCE,
          error: null,
        }));
        return;
      }

      const connResult = await isConnected();
      if (!connResult.isConnected) return;

      const [addrResult, netResult] = await Promise.all([
        getAddress(),
        getNetwork(),
      ]);

      if (addrResult.error || netResult.error) return;

      const address = addrResult.address;
      const network = netResult.network;
      const balance = await fetchXlmBalance(address, network);

      setState((prev) => ({ ...prev, address, network, balance, error: null }));
    } catch (err) {
      console.error("[WalletProvider] refresh error:", err);
    }
  }, []);

  // On mount: check if the user already had the wallet connected
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll for network / account changes every 3 s while connected.
  // Skip polling if using mock wallet.
  useEffect(() => {
    if (!state.address || MOCK_ENABLED) return;

    const id = setInterval(async () => {
      try {
        const [addrResult, netResult] = await Promise.all([
          getAddress(),
          getNetwork(),
        ]);

        const newAddress = addrResult.error ? null : addrResult.address;
        const newNetwork = netResult.error ? null : netResult.network;

        // Something changed → full refresh
        if (newAddress !== state.address || newNetwork !== state.network) {
          if (!newAddress) {
            // User disconnected inside Freighter
            setState({
              address: null,
              network: null,
              balance: null,
              isLoading: false,
              error: null,
            });
          } else {
            const balance = newAddress
              ? await fetchXlmBalance(newAddress, newNetwork ?? "TESTNET")
              : null;
            setState((prev) => ({
              ...prev,
              address: newAddress,
              network: newNetwork,
              balance,
              error: null,
            }));
          }
        }
      } catch {
        // silently ignore poll errors
      }
    }, 3000);

    return () => clearInterval(id);
  }, [state.address, state.network]);

  // ── connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      if (MOCK_ENABLED) {
        setState((prev) => ({
          ...prev,
          address: MOCK_ADDRESS,
          network: MOCK_NETWORK,
          balance: MOCK_BALANCE,
          isLoading: false,
          error: null,
        }));
        return;
      }

      // setAllowed() opens the Freighter approval popup if not yet authorised
      const allowResult = await setAllowed();
      if (allowResult.error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: allowResult.error ?? "Connection rejected",
        }));
        return;
      }

      await refresh();
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [refresh]);

  // ── disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setState({
      address: null,
      network: null,
      balance: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return ctx;
}