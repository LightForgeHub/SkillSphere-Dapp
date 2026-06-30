"use client";

import React from 'react';
import SessionHistory from '@/components/dashboard/SessionHistory';

export default function TransactionsDemoPage() {
  return (
    <div
      className="min-h-screen w-full text-foreground"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: "var(--bg-full-pattern)",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Stellar Explorer Integration Demo</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            View transaction history with integrated Stellar.Expert links. Supports both Testnet and Mainnet networks.
          </p>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Explorer Utility Functions</h3>
            <ul className="space-y-2 text-sm text-muted-foreground font-mono">
              <li className="flex gap-2">
                <span className="text-purple-400">→</span>
                <code>formatExplorerUrl(hash, network)</code>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">→</span>
                <code>shortenHash(hash)</code>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">→</span>
                <code>getExplorerLink(hash, network)</code>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">→</span>
                <code>copyHashToClipboard(hash)</code>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">→</span>
                <code>normalizeNetwork(network)</code>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Features Demonstrated</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Shortened hash display</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>External link to Stellar.Expert</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>One-click hash copy button</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Network badge (Testnet/Mainnet)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-400">✓</span>
                <span>Status indicators for transactions</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Session History Component */}
        <div className="mb-12">
          <SessionHistory />
        </div>

        {/* Implementation Details */}
        <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4 font-semibold">Explorer URL Patterns:</p>
            <div className="space-y-3 text-xs text-muted-foreground font-mono bg-black/50 p-4 rounded">
              <div>
                <span className="text-blue-400">Testnet:</span> https://testnet.stellar.expert/tx/{'{hash}'}
              </div>
              <div>
                <span className="text-orange-400">Mainnet:</span> https://stellar.expert/explorer/mainnet/tx/{'{hash}'}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-4 font-semibold">Usage in Components:</p>
            <pre className="text-xs text-muted-foreground font-mono bg-black/50 p-4 rounded overflow-x-auto">
{`import { formatExplorerUrl, shortenHash } from '@/utils/explorer';

const hash = 'a123456789abcdef1234567890abcdef1234567890abcdef1234567890abcd';
const url = formatExplorerUrl(hash, 'testnet');
const short = shortenHash(hash); // "a1234567...0abcd"

<a href={url} target="_blank" rel="noopener noreferrer">
  {short}
  <ExternalLink size={14} />
</a>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
