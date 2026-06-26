/**
 * Stellar Explorer Utility
 * Generates links to Stellar.Expert for viewing transactions on different networks
 */

type Network = 'testnet' | 'mainnet';

const EXPLORER_URLS = {
  testnet: 'https://testnet.stellar.expert/tx',
  mainnet: 'https://stellar.expert/explorer/mainnet/tx',
} as const;

/**
 * Format a transaction hash into a Stellar.Expert URL
 * @param hash - Transaction hash
 * @param network - Network (testnet or mainnet)
 * @returns Full URL to view transaction on Stellar.Expert
 */
export function formatExplorerUrl(hash: string, network: Network = 'testnet'): string {
  const baseUrl = EXPLORER_URLS[network];
  return `${baseUrl}/${hash}`;
}

/**
 * Format a transaction hash into a shortened hash display (first 8 + last 8 chars)
 * @param hash - Transaction hash
 * @returns Shortened hash
 */
export function shortenHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

/**
 * Get the explorer display URL for a transaction
 * @param hash - Transaction hash
 * @param network - Network (testnet or mainnet)
 * @returns Object containing display text and URL
 */
export function getExplorerLink(hash: string, network: Network = 'testnet') {
  return {
    text: shortenHash(hash),
    url: formatExplorerUrl(hash, network),
    fullHash: hash,
    network,
  };
}

/**
 * Copy a transaction hash to clipboard
 * @param hash - Transaction hash
 */
export function copyHashToClipboard(hash: string): void {
  if (typeof window !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(hash);
  }
}

/**
 * Determine the network from the hash or metadata
 * @param network - Network identifier
 * @returns Standardized network name
 */
export function normalizeNetwork(network: string | undefined): Network {
  if (!network) return 'testnet';
  const normalized = network.toLowerCase();
  return normalized.includes('main') ? 'mainnet' : 'testnet';
}
