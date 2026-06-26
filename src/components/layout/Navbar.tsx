"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, LogOut, Copy, Check, Menu, X, Zap } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useCurrency, type DisplayCurrency } from "@/hooks/useCurrency";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function networkBadgeColor(network: string | null): string {
  switch (network) {
    case "PUBLIC":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "TESTNET":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-zinc-700/40 text-zinc-400 border-zinc-600/30";
  }
}

// ─── WalletButton ─────────────────────────────────────────────────────────────

interface WalletButtonProps {
  convert: (xlmAmount: number) => string;
  selectedCurrency: DisplayCurrency;
}

function WalletButton({ convert, selectedCurrency }: WalletButtonProps) {
  const { address, network, balance, isLoading, error, connect, disconnect } =
    useWallet();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleCopy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={connect}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-violet-500/50 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-200 transition-all hover:bg-violet-600/40 hover:border-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet className="h-4 w-4" />
          {isLoading ? "Connecting…" : "Connect Wallet"}
        </button>
        {error && (
          <p className="text-xs text-red-400 max-w-[200px] text-right">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 transition-all hover:border-zinc-500 hover:bg-zinc-700/60"
      >
        {/* Network badge */}
        {network && (
          <span
            className={`hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${networkBadgeColor(network)}`}
          >
            {network}
          </span>
        )}

        {/* Balance (converted to selected currency) */}
        {balance !== null && (
          <span className="hidden sm:inline text-zinc-300 font-mono text-xs">
            {convert(Number(balance))}
          </span>
        )}

        {/* Address */}
        <span className="font-mono text-xs text-violet-300">
          {shortenAddress(address)}
        </span>

        <Wallet className="h-4 w-4 text-violet-400" />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />

          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
            {/* Network + balance summary */}
            <div className="mb-3 rounded-lg bg-zinc-800/60 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400">Network</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${networkBadgeColor(network)}`}
                >
                  {network ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Balance</span>
                <div className="text-right">
                  <span className="text-sm font-mono font-medium text-zinc-200">
                    {balance !== null ? convert(Number(balance)) : "—"}
                  </span>
                  {balance !== null && selectedCurrency !== "XLM" && (
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {balance} XLM
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Full address */}
            <div className="mb-3">
              <p className="mb-1 text-xs text-zinc-400">Address</p>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-2 py-1.5">
                <p className="flex-1 truncate font-mono text-[11px] text-zinc-300">
                  {address}
                </p>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Disconnect */}
            <button
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 hover:border-red-400"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/sessions", label: "Sessions" },
  { href: "/dashboard", label: "Dashboard" },
];

const DISPLAY_CURRENCIES: DisplayCurrency[] = ["XLM", "USD", "EUR", "GBP", "JPY"];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { address, network } = useWallet();
  const { selectedCurrency, setSelectedCurrency, convert } = useCurrency();

  return (
    <>
      {/* Network mismatch alert banner */}
      {address && network !== null && network !== "TESTNET" && (
        <div className="w-full bg-red-900/80 border-b border-red-500/50 py-2 px-4 text-center text-sm font-medium text-red-200">
          Freighter Wallet is set to {network}. Please switch to TESTNET in Freighter extension settings.
        </div>
      )}
    <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Zap className="h-5 w-5" />
          SkillSphere
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Currency selector */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as DisplayCurrency)}
            className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-2 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
            aria-label="Select display currency"
          >
            {DISPLAY_CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-zinc-900">
                {c}
              </option>
            ))}
          </select>

          <WalletButton convert={convert} selectedCurrency={selectedCurrency} />

          {/* Mobile menu toggle */}
          <button
            className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 transition-colors md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="border-t border-zinc-800/60 bg-zinc-950/95 px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-3">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
    </>
  );
}