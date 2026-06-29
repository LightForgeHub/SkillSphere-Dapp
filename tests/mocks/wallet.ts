/**
 * Mock wallet provider for CI/testing environments.
 * Provides simulated Freighter wallet responses without requiring browser extensions.
 */

export const MOCK_WALLET_ADDRESS = "GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJQNZVIU3TWCYGIQUI5GUDFQD";
export const MOCK_NETWORK = "TESTNET";
export const MOCK_BALANCE = "1000.00";

export interface MockWalletConfig {
  address: string;
  network: string;
  balance: string;
  enabled: boolean;
}

/**
 * Get mock wallet configuration from environment.
 * Set NEXT_PUBLIC_MOCK_WALLET=true to enable.
 */
export function getMockWalletConfig(): MockWalletConfig {
  const enabled = process.env.NEXT_PUBLIC_MOCK_WALLET === "true";
  return {
    address: MOCK_WALLET_ADDRESS,
    network: MOCK_NETWORK,
    balance: MOCK_BALANCE,
    enabled,
  };
}

/**
 * Mock Freighter API responses for testing.
 * These simulate the actual Freighter extension API.
 */
export const mockFreighterApi = {
  isConnected: async () => ({
    isConnected: true,
    error: null,
  }),

  getAddress: async () => ({
    address: MOCK_WALLET_ADDRESS,
    error: null,
  }),

  getNetwork: async () => ({
    network: MOCK_NETWORK,
    error: null,
  }),

  setAllowed: async () => ({
    error: null,
  }),

  signTransaction: async (xdr: string) => ({
    signedXDR: xdr,
    error: null,
  }),

  signAuthEntry: async (challenge: string) => ({
    signedAuthEntry: challenge,
    error: null,
  }),
};

/**
 * Simulate signature verification.
 * In CI environments, we return success for any signature.
 */
export function verifySignature(
  _publicKey: string,
  _signedXDR: string
): boolean {
  return true;
}

/**
 * Simulate transaction submission.
 * Returns a mock transaction hash.
 */
export function simulateTransactionSubmission(
  _xdr: string
): { hash: string; error: null } | { hash: null; error: string } {
  const mockHash = "0000000000000000000000000000000000000000000000000000000000000000";
  return {
    hash: mockHash,
    error: null,
  };
}

/**
 * Mock balance update for testing.
 */
export function getMockBalance(address?: string): string {
  if (!address) return MOCK_BALANCE;
  return MOCK_BALANCE;
}
