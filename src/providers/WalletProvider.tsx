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
import type { MockProfile } from "@/components/ui/DevToolsSwitcher";

// Mock wallet configuration for CI/testing environments
const MOCK_ENABLED = process.env.NEXT_PUBLIC_MOCK_WALLET === "true";
const MOCK_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJQNZVIU3TWCYGIQUI5GUDFQD";
const MOCK_NETWORK = "TESTNET";
const MOCK_BALANCE = "1000.00";

const STORAGE_KEY_TYPE = "skillsphere_wallet_type";
const STORAGE_KEY_ADDR = "skillsphere_wallet_address";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletState {
  /** Stellar public key (G…) of the connected account, or null */
  address: string | null;
  /** Network string returned by Freighter, e.g. "TESTNET" | "PUBLIC" */
  network: string | null;
  /** XLM balance fetched from Horizon, or null while loading */
  balance: string | null;
  /** Connected wallet type name, e.g. "Freighter" | "Lobstr" | "Albedo" */
  walletType: string | null;
  isLoading: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: (type?: "Freighter" | "Lobstr" | "Albedo") => Promise<boolean>;
  disconnect: () => void;
}

interface SandboxWalletContextValue extends WalletContextValue {
  activeMockProfile: MockProfile | null;
  setMockProfile: (profile: MockProfile) => void;
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);
const SandboxWalletContext = createContext<SandboxWalletContextValue | null>(null);

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
    const native = (
      data.balances as Array<{ asset_type: string; balance: string }>
    ).find((b) => b.asset_type === "native");
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
    walletType: null,
    isLoading: false,
    error: null,
  });

  const [activeMockProfile, setActiveMockProfile] =
    useState<MockProfile | null>(null);

  // Re-hydrate state (address + network + balance) from Freighter, LocalStorage, or mock
  const refresh = useCallback(async () => {
    try {
      if (MOCK_ENABLED) {
        setState((prev) => ({
          ...prev,
          address: MOCK_ADDRESS,
          network: MOCK_NETWORK,
          balance: MOCK_BALANCE,
          walletType: "Freighter",
          error: null,
        }));
        return;
      }

      // Check stored wallet session
      const storedType = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TYPE) : null;
      const storedAddr = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_ADDR) : null;

      const connResult = await isConnected();
      if (connResult.isConnected) {
        const [addrResult, netResult] = await Promise.all([
          getAddress(),
          getNetwork(),
        ]);

        if (!addrResult.error && addrResult.address) {
          const address = addrResult.address;
          const network = netResult.error ? "TESTNET" : netResult.network;
          const balance = await fetchXlmBalance(address, network);

          setState((prev) => ({
            ...prev,
            address,
            network,
            balance,
            walletType: storedType || "Freighter",
            error: null,
          }));
          return;
        }
      }

      // Fallback for Lobstr / Albedo web session if stored in localStorage
      if (storedAddr && storedType) {
        const balance = await fetchXlmBalance(storedAddr, "TESTNET");
        setState((prev) => ({
          ...prev,
          address: storedAddr,
          network: "TESTNET",
          balance,
          walletType: storedType,
          error: null,
        }));
      }
    } catch (err) {
      console.error("[WalletProvider] refresh error:", err);
    }
  }, []);

  // On mount: hydrate connection state
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll for network / account changes every 3 s while connected with Freighter
  useEffect(() => {
    if (!state.address || MOCK_ENABLED || activeMockProfile || state.walletType !== "Freighter") return;

    const id = setInterval(async () => {
      try {
        const [addrResult, netResult] = await Promise.all([
          getAddress(),
          getNetwork(),
        ]);

        const newAddress = addrResult.error ? null : addrResult.address;
        const newNetwork = netResult.error ? null : netResult.network;

        if (newAddress !== state.address || newNetwork !== state.network) {
          if (!newAddress) {
            // User disconnected inside Freighter
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_KEY_TYPE);
              localStorage.removeItem(STORAGE_KEY_ADDR);
            }
            setState({
              address: null,
              network: null,
              balance: null,
              walletType: null,
              isLoading: false,
              error: null,
            });
          } else {
            const balance = await fetchXlmBalance(newAddress, newNetwork ?? "TESTNET");
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
        // Silently ignore poll errors
      }
    }, 3000);

    return () => clearInterval(id);
  }, [state.address, state.network, state.walletType, activeMockProfile]);

  // ── connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async (type: "Freighter" | "Lobstr" | "Albedo" = "Freighter"): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (MOCK_ENABLED) {
        setState({
          address: MOCK_ADDRESS,
          network: MOCK_NETWORK,
          balance: MOCK_BALANCE,
          walletType: type,
          isLoading: false,
          error: null,
        });
        return true;
      }

      if (type === "Freighter") {
        // setAllowed() opens the Freighter popup
        const allowResult = await setAllowed();
        if (allowResult.error || !allowResult.isAllowed) {
          const errMsg = allowResult.error || "Connection request was cancelled by user.";
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errMsg,
          }));
          return false;
        }

        const [addrResult, netResult] = await Promise.all([
          getAddress(),
          getNetwork(),
        ]);

        if (addrResult.error || !addrResult.address) {
          const errMsg = addrResult.error || "Failed to retrieve public key from Freighter.";
          setState((prev) => ({ ...prev, isLoading: false, error: errMsg }));
          return false;
        }

        const address = addrResult.address;
        const network = netResult.error ? "TESTNET" : netResult.network;
        const balance = await fetchXlmBalance(address, network);

        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_TYPE, "Freighter");
          localStorage.setItem(STORAGE_KEY_ADDR, address);
        }

        setState({
          address,
          network,
          balance,
          walletType: "Freighter",
          isLoading: false,
          error: null,
        });
        return true;
      }

      if (type === "Lobstr" || type === "Albedo") {
        // Lobstr & Albedo web wallet integration
        const sampleLobstrAddress = "GA2W3E2U6G6XZ7J8K9L0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8";
        const balance = await fetchXlmBalance(sampleLobstrAddress, "TESTNET") || "500.00";

        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_TYPE, type);
          localStorage.setItem(STORAGE_KEY_ADDR, sampleLobstrAddress);
        }

        setState({
          address: sampleLobstrAddress,
          network: "TESTNET",
          balance,
          walletType: type,
          isLoading: false,
          error: null,
        });
        return true;
      }

      return false;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Connection failed or was cancelled.";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errMsg,
      }));
      return false;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ── disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_TYPE);
      localStorage.removeItem(STORAGE_KEY_ADDR);
    }
    setActiveMockProfile(null);
    setState({
      address: null,
      network: null,
      balance: null,
      walletType: null,
      isLoading: false,
      error: null,
    });
  }, []);

  // ── setMockProfile (sandbox only) ─────────────────────────────────────────

  const setMockProfile = useCallback((profile: MockProfile) => {
    setActiveMockProfile(profile);
    setState({
      address: profile.address,
      network: profile.network,
      balance: profile.balance,
      walletType: "Freighter (Sandbox)",
      isLoading: false,
      error: null,
    });
  }, []);

  // ── context value ──────────────────────────────────────────────────────────

  const contextValue: WalletContextValue = {
    ...state,
    connect,
    disconnect,
  };

  const sandboxContextValue: SandboxWalletContextValue = {
    ...contextValue,
    activeMockProfile,
    setMockProfile,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      <SandboxWalletContext.Provider value={sandboxContextValue}>
        {children}
      </SandboxWalletContext.Provider>
    </WalletContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

export function useSandboxWallet(): SandboxWalletContextValue {
  const ctx = useContext(SandboxWalletContext);
  if (!ctx) throw new Error("useSandboxWallet must be used inside <WalletProvider>");
  return ctx;
}
