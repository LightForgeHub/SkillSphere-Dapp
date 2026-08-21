"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction as signFreighterTransaction,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import type { MockProfile } from "@/components/ui/DevToolsSwitcher";
import { safeLocalStorage } from "@/utils/safeLocalStorage";

const MOCK_ENABLED = process.env.NEXT_PUBLIC_MOCK_WALLET === "true";
const MOCK_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJQNZVIU3TWCYGIQUI5GUDFQD";
const MOCK_NETWORK = "TESTNET";
const MOCK_BALANCE = "1000.00";
const EXPECTED_NETWORK = "TESTNET";
const WALLET_CACHE_KEY = "skillsphere.freighter.connection";
const WALLET_WATCH_INTERVAL_MS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CachedWalletConnection {
  address: string;
  network: string;
  networkPassphrase: string;
}

interface WalletState {
  /** Stellar public key (G…) of the connected account, or null. */
  address: string | null;
  /** Network returned by Freighter, for example TESTNET or PUBLIC. */
  network: string | null;
  /** Passphrase belonging to the selected Freighter network. */
  networkPassphrase: string | null;
  /** Native XLM balance fetched from Horizon. */
  balance: string | null;
  /** Connected wallet type name, e.g. "Freighter" | "Lobstr" | "Albedo" */
  walletType: string | null;
  isLoading: boolean;
  isSigning: boolean;
  error: string | null;
}

export interface SignTransactionOptions {
  networkPassphrase?: string;
}

interface WalletContextValue extends WalletState {
  isWrongNetwork: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  signTransaction: (
    transactionXdr: string,
    options?: SignTransactionOptions,
  ) => Promise<string>;
}

interface SandboxWalletContextValue extends WalletContextValue {
  activeMockProfile: MockProfile | null;
  setMockProfile: (profile: MockProfile) => void;
}

const INITIAL_STATE: WalletState = {
  address: null,
  network: null,
  networkPassphrase: null,
  balance: null,
  walletType: null,
  isLoading: false,
  isSigning: false,
  error: null,
};

const WalletContext = createContext<WalletContextValue | null>(null);
const SandboxWalletContext = createContext<SandboxWalletContextValue | null>(null);

const HORIZON_URLS: Record<string, string> = {
  PUBLIC: "https://horizon.stellar.org",
  TESTNET: "https://horizon-testnet.stellar.org",
  FUTURENET: "https://horizon-futurenet.stellar.org",
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

function readCachedConnection(): CachedWalletConnection | null {
  const cached = safeLocalStorage.get(WALLET_CACHE_KEY);
  if (!cached) return null;
  try {
    const parsed: unknown = JSON.parse(cached);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "address" in parsed &&
      typeof (parsed as Record<string, unknown>).address === "string" &&
      "network" in parsed &&
      typeof (parsed as Record<string, unknown>).network === "string" &&
      "networkPassphrase" in parsed &&
      typeof (parsed as Record<string, unknown>).networkPassphrase === "string"
    ) {
      const p = parsed as { address: string; network: string; networkPassphrase: string };
      return { address: p.address, network: p.network, networkPassphrase: p.networkPassphrase };
    }
  } catch {
    // Invalid cache — treat as no prior connection.
  }
  safeLocalStorage.remove(WALLET_CACHE_KEY);
  return null;
}

function cacheConnection(connection: CachedWalletConnection): void {
  safeLocalStorage.set(WALLET_CACHE_KEY, JSON.stringify(connection));
}

async function fetchXlmBalance(address: string, network: string): Promise<string | null> {
  const baseUrl = HORIZON_URLS[network];
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${baseUrl}/accounts/${address}`);
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("balances" in data) ||
      !Array.isArray((data as Record<string, unknown>).balances)
    ) {
      return null;
    }
    const balances = (data as { balances: unknown[] }).balances;
    const nativeBalance = balances.find(
      (b): b is { asset_type: string; balance: string } =>
        typeof b === "object" &&
        b !== null &&
        "asset_type" in b &&
        (b as Record<string, unknown>).asset_type === "native" &&
        "balance" in b &&
        typeof (b as Record<string, unknown>).balance === "string",
    );
    return nativeBalance
      ? Number.parseFloat(nativeBalance.balance).toFixed(2)
      : null;
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
  const [activeMockProfile, setActiveMockProfile] = useState<MockProfile | null>(null);

  const setRealConnection = useCallback((connection: CachedWalletConnection & { walletType?: string }) => {
    cacheConnection(connection);
    setState((previous) => ({
      ...previous,
      ...connection,
      walletType: connection.walletType ?? previous.walletType ?? "Freighter",
      balance:
        previous.address === connection.address && previous.network === connection.network
          ? previous.balance
          : null,
      isLoading: false,
      error: null,
    }));

    void fetchXlmBalance(connection.address, connection.network).then((balance) => {
      setState((previous) =>
        previous.address === connection.address && previous.network === connection.network
          ? { ...previous, balance }
          : previous,
      );
    });
  }, []);

  const clearRealConnection = useCallback((error: string | null = null) => {
    safeLocalStorage.remove(WALLET_CACHE_KEY);
    setState({ ...INITIAL_STATE, error });
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (MOCK_ENABLED) {
      setState({
        address: MOCK_ADDRESS,
        network: MOCK_NETWORK,
        networkPassphrase: "",
        balance: MOCK_BALANCE,
        walletType: "Freighter",
        isLoading: false,
        isSigning: false,
        error: null,
      });
      return true;
    }

    try {
      const connectionResult = await isConnected();
      if (connectionResult.error || !connectionResult.isConnected) {
        clearRealConnection(
          connectionResult.error
            ? getErrorMessage(connectionResult.error, "Unable to detect the Freighter extension.")
            : "Freighter is not installed or is unavailable.",
        );
        return false;
      }

      const [addressResult, networkResult] = await Promise.all([getAddress(), getNetwork()]);

      if (addressResult.error || networkResult.error || !addressResult.address) {
        clearRealConnection(
          getErrorMessage(
            addressResult.error ?? networkResult.error,
            "Freighter is no longer authorized for this site.",
          ),
        );
        return false;
      }

      setRealConnection({
        address: addressResult.address,
        network: networkResult.network,
        networkPassphrase: networkResult.networkPassphrase,
      });
      return true;
    } catch (error) {
      clearRealConnection(getErrorMessage(error, "Failed to restore the wallet connection."));
      return false;
    }
  }, [clearRealConnection, setRealConnection]);

  // Restore prior connection on mount
  useEffect(() => {
    if (MOCK_ENABLED) {
      void refresh();
      return;
    }
    const cached = readCachedConnection();
    if (!cached) return;
    setState((previous) => ({ ...previous, ...cached, isLoading: true, error: null }));
    void refresh();
  }, [refresh]);

  // Watch for Freighter account / network changes
  useEffect(() => {
    if (!state.address || MOCK_ENABLED || activeMockProfile) return;

    let cancelled = false;
    const watcher = new WatchWalletChanges(WALLET_WATCH_INTERVAL_MS);

    watcher.watch(({ address, network, networkPassphrase, error: watchError }) => {
      if (cancelled) return;

      if (watchError) {
        setState((previous) => ({
          ...previous,
          error: getErrorMessage(watchError, "Unable to read wallet changes from Freighter."),
        }));
        return;
      }

      if (!address) {
        clearRealConnection();
        return;
      }

      setRealConnection({ address, network, networkPassphrase });
    });

    return () => {
      cancelled = true;
      watcher.stop();
    };
  }, [activeMockProfile, clearRealConnection, setRealConnection, state.address]);

  const connect = useCallback(async (): Promise<boolean> => {
    setActiveMockProfile(null);
    setState((previous) => ({ ...previous, isLoading: true, error: null }));

    if (MOCK_ENABLED) {
      await refresh();
      return true;
    }

    try {
      const connectionResult = await isConnected();
      if (connectionResult.error || !connectionResult.isConnected) {
        throw new Error(
          connectionResult.error
            ? getErrorMessage(connectionResult.error, "Unable to detect the Freighter extension.")
            : "Freighter is not installed. Install or enable the extension and try again.",
        );
      }

      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) {
        throw new Error(
          getErrorMessage(accessResult.error, "Wallet connection was rejected."),
        );
      }

      const networkResult = await getNetwork();
      if (networkResult.error) {
        throw new Error(
          getErrorMessage(networkResult.error, "Unable to read the selected Freighter network."),
        );
      }

      setRealConnection({
        address: accessResult.address,
        network: networkResult.network,
        networkPassphrase: networkResult.networkPassphrase,
        walletType: "Freighter",
      });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to connect wallet.");
      safeLocalStorage.remove(WALLET_CACHE_KEY);
      setState({ ...INITIAL_STATE, error: message });
      return false;
    }
  }, [refresh, setRealConnection]);

  const disconnect = useCallback(() => {
    setActiveMockProfile(null);
    clearRealConnection();
  }, [clearRealConnection]);

  const signTransaction = useCallback(
    async (transactionXdr: string, options?: SignTransactionOptions): Promise<string> => {
      if (!transactionXdr.trim()) throw new Error("A transaction XDR is required.");
      if (MOCK_ENABLED || activeMockProfile) return transactionXdr;
      if (!state.address || !state.network || !state.networkPassphrase) {
        throw new Error("Connect Freighter before signing a transaction.");
      }
      if (state.network !== EXPECTED_NETWORK) {
        throw new Error(`Switch Freighter to ${EXPECTED_NETWORK} before signing a transaction.`);
      }

      setState((previous) => ({ ...previous, isSigning: true, error: null }));

      try {
        const result = await signFreighterTransaction(transactionXdr, {
          address: state.address,
          networkPassphrase: options?.networkPassphrase ?? state.networkPassphrase,
        });

        if (result.error || !result.signedTxXdr) {
          throw new Error(
            getErrorMessage(result.error, "Freighter did not return a signed transaction."),
          );
        }

        return result.signedTxXdr;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to sign the transaction.");
        setState((previous) => ({ ...previous, error: message }));
        throw new Error(message);
      } finally {
        setState((previous) => ({ ...previous, isSigning: false }));
      }
    },
    [activeMockProfile, state.address, state.network, state.networkPassphrase],
  );

  const setMockProfile = useCallback((profile: MockProfile) => {
    setActiveMockProfile(profile);
    setState({
      address: profile.address,
      network: profile.network,
      networkPassphrase: "",
      balance: profile.balance,
      walletType: "Freighter (Sandbox)",
      isLoading: false,
      isSigning: false,
      error: null,
    });
  }, []);

  const contextValue: WalletContextValue = {
    ...state,
    isWrongNetwork: state.network !== null && state.network !== EXPECTED_NETWORK,
    connect,
    disconnect,
    signTransaction,
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return context;
}

export function useSandboxWallet(): SandboxWalletContextValue {
  const context = useContext(SandboxWalletContext);
  if (!context) {
    throw new Error("useSandboxWallet must be used inside <WalletProvider>");
  }
  return context;
}
