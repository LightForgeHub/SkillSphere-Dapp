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
  isLoading: boolean;
  isSigning: boolean;
  error: string | null;
}

export interface SignTransactionOptions {
  /**
   * Override the currently selected Freighter network passphrase.
   * Most callers should omit this.
   */
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
  isLoading: false,
  isSigning: false,
  error: null,
};

const WalletContext = createContext<WalletContextValue | null>(null);
const SandboxWalletContext = createContext<SandboxWalletContextValue | null>(
  null,
);

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
    typeof error.message === "string"
  ) {
    return error.message;
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
      typeof parsed.address === "string" &&
      "network" in parsed &&
      typeof parsed.network === "string" &&
      "networkPassphrase" in parsed &&
      typeof parsed.networkPassphrase === "string"
    ) {
      return {
        address: parsed.address,
        network: parsed.network,
        networkPassphrase: parsed.networkPassphrase,
      };
    }
  } catch {
    // An invalid cache should behave like no prior connection.
  }

  safeLocalStorage.remove(WALLET_CACHE_KEY);
  return null;
}

function cacheConnection(connection: CachedWalletConnection): void {
  safeLocalStorage.set(WALLET_CACHE_KEY, JSON.stringify(connection));
}

async function fetchXlmBalance(
  address: string,
  network: string,
): Promise<string | null> {
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
      !Array.isArray(data.balances)
    ) {
      return null;
    }

    const nativeBalance = data.balances.find(
      (balance): balance is { asset_type: string; balance: string } =>
        typeof balance === "object" &&
        balance !== null &&
        "asset_type" in balance &&
        balance.asset_type === "native" &&
        "balance" in balance &&
        typeof balance.balance === "string",
    );

    return nativeBalance
      ? Number.parseFloat(nativeBalance.balance).toFixed(2)
      : null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
  const [activeMockProfile, setActiveMockProfile] =
    useState<MockProfile | null>(null);

  const setRealConnection = useCallback(
    (connection: CachedWalletConnection) => {
      cacheConnection(connection);
      setState((previous) => ({
        ...previous,
        ...connection,
        balance:
          previous.address === connection.address &&
          previous.network === connection.network
            ? previous.balance
            : null,
        isLoading: false,
        error: null,
      }));

      // Balance availability must not delay or invalidate a wallet connection.
      void fetchXlmBalance(connection.address, connection.network).then(
        (balance) => {
          setState((previous) =>
            previous.address === connection.address &&
            previous.network === connection.network
              ? { ...previous, balance }
              : previous,
          );
        },
      );
    },
    [],
  );

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
            ? getErrorMessage(
                connectionResult.error,
                "Unable to detect the Freighter extension.",
              )
            : "Freighter is not installed or is unavailable.",
        );
        return false;
      }

      const [addressResult, networkResult] = await Promise.all([
        getAddress(),
        getNetwork(),
      ]);

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
      clearRealConnection(
        getErrorMessage(error, "Failed to restore the wallet connection."),
      );
      return false;
    }
  }, [clearRealConnection, setRealConnection]);

  // Restore only a connection the user previously initiated on this site.
  useEffect(() => {
    if (MOCK_ENABLED) {
      void refresh();
      return;
    }

    const cached = readCachedConnection();
    if (!cached) return;

    setState((previous) => ({
      ...previous,
      ...cached,
      isLoading: true,
      error: null,
    }));
    void refresh();
  }, [refresh]);

  // Freighter does not currently emit a browser event for account/network
  // changes. Its official watcher polls both and invokes us only on a change.
  useEffect(() => {
    if (!state.address || MOCK_ENABLED || activeMockProfile) return;

    let cancelled = false;
    const watcher = new WatchWalletChanges(WALLET_WATCH_INTERVAL_MS);

    watcher.watch(
      ({ address, network, networkPassphrase, error: watchError }) => {
        if (cancelled) return;

        if (watchError) {
          setState((previous) => ({
            ...previous,
            error: getErrorMessage(
              watchError,
              "Unable to read wallet changes from Freighter.",
            ),
          }));
          return;
        }

        if (!address) {
          clearRealConnection();
          return;
        }

        setRealConnection({ address, network, networkPassphrase });
      },
    );

    return () => {
      cancelled = true;
      watcher.stop();
    };
  }, [
    activeMockProfile,
    clearRealConnection,
    setRealConnection,
    state.address,
  ]);

  const connect = useCallback(async (): Promise<boolean> => {
    setActiveMockProfile(null);
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: null,
    }));

    if (MOCK_ENABLED) {
      await refresh();
      return true;
    }

    try {
      const connectionResult = await isConnected();
      if (connectionResult.error || !connectionResult.isConnected) {
        throw new Error(
          connectionResult.error
            ? getErrorMessage(
                connectionResult.error,
                "Unable to detect the Freighter extension.",
              )
            : "Freighter is not installed. Install or enable the extension and try again.",
        );
      }

      // requestAccess opens Freighter's approval prompt and returns the selected
      // public key. In API v6 this replaces the old getPublicKey flow.
      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) {
        throw new Error(
          getErrorMessage(accessResult.error, "Wallet connection was rejected."),
        );
      }

      const networkResult = await getNetwork();
      if (networkResult.error) {
        throw new Error(
          getErrorMessage(
            networkResult.error,
            "Unable to read the selected Freighter network.",
          ),
        );
      }

      setRealConnection({
        address: accessResult.address,
        network: networkResult.network,
        networkPassphrase: networkResult.networkPassphrase,
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
    async (
      transactionXdr: string,
      options?: SignTransactionOptions,
    ): Promise<string> => {
      if (!transactionXdr.trim()) {
        throw new Error("A transaction XDR is required.");
      }

      if (MOCK_ENABLED || activeMockProfile) return transactionXdr;

      if (!state.address || !state.network || !state.networkPassphrase) {
        throw new Error("Connect Freighter before signing a transaction.");
      }

      if (state.network !== EXPECTED_NETWORK) {
        throw new Error(
          `Switch Freighter to ${EXPECTED_NETWORK} before signing a transaction.`,
        );
      }

      setState((previous) => ({
        ...previous,
        isSigning: true,
        error: null,
      }));

      try {
        const result = await signFreighterTransaction(transactionXdr, {
          address: state.address,
          networkPassphrase:
            options?.networkPassphrase ?? state.networkPassphrase,
        });

        if (result.error || !result.signedTxXdr) {
          throw new Error(
            getErrorMessage(
              result.error,
              "Freighter did not return a signed transaction.",
            ),
          );
        }

        return result.signedTxXdr;
      } catch (error) {
        const message = getErrorMessage(
          error,
          "Failed to sign the transaction.",
        );
        setState((previous) => ({ ...previous, error: message }));
        throw new Error(message);
      } finally {
        setState((previous) => ({ ...previous, isSigning: false }));
      }
    },
    [
      activeMockProfile,
      state.address,
      state.network,
      state.networkPassphrase,
    ],
  );

  const setMockProfile = useCallback((profile: MockProfile) => {
    setActiveMockProfile(profile);
    setState({
      address: profile.address,
      network: profile.network,
      networkPassphrase: "",
      balance: profile.balance,
      isLoading: false,
      isSigning: false,
      error: null,
    });
  }, []);

  const contextValue: WalletContextValue = {
    ...state,
    isWrongNetwork:
      state.network !== null && state.network !== EXPECTED_NETWORK,
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
