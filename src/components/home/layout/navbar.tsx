"use client";

import React, { useState } from "react";
import { Menu, X, Search, Bell, Wallet, LogOut, Check, Copy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import CreateWalletModal from "@/components/CreateWalletModal";
import { useWallet } from "@/providers/WalletProvider";
import { useCurrency, type DisplayCurrency } from "@/hooks/useCurrency";

const DISPLAY_CURRENCIES: DisplayCurrency[] = ["XLM", "USD", "EUR", "GBP", "JPY"];

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname() ?? "";
  const { address, balance, network, isLoading, isWrongNetwork, disconnect } = useWallet();
  const { selectedCurrency, setSelectedCurrency, convert } = useCurrency();

  const authRoutes = ["/login", "/sign-in", "/sign-up"];
  if (authRoutes.includes(pathname)) return null;

  const isLandingPage = pathname === "/";

  async function handleCopyAddress() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      {/* Wrong network banner */}
      {address && isWrongNetwork && (
        <div
          role="alert"
          className="w-full border-b border-red-500/50 bg-red-900/80 px-4 py-2 text-center text-sm font-medium text-red-200"
        >
          Freighter Wallet is set to {network}. Please switch to TESTNET in Freighter extension settings.
        </div>
      )}

      <div
        className="w-full h-[78px] flex items-center text-foreground overflow-x-hidden border-b border-border/40"
        style={{
          backgroundColor: "var(--background)",
          backgroundImage: "var(--bg-full-pattern)",
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "center, center, center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <nav className="backdrop-blur-sm h-full w-full">
          <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-full items-center">

              {/* Logo */}
              <div className="flex items-center">
                <Link href="/">
                  <span className="text-3xl font-jersey-10 tracking-[3px] font-bold cursor-pointer bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    SkillSphere
                  </span>
                </Link>
              </div>

              {/* Desktop Search */}
              <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search experts, skills, or topics…"
                    className="w-full bg-card/40 border rounded-xl border-border/50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Desktop Nav Links */}
              <div className="hidden lg:flex items-center font-inter font-normal space-x-6">
                {!isLandingPage && (
                  <Link href="/" className="text-sm hover:text-purple-400 transition-colors">
                    Home
                  </Link>
                )}
                <Link
                  href="/explore-experts"
                  className={`text-sm hover:text-purple-400 transition-colors ${pathname === "/explore-experts" ? "text-purple-400 font-semibold" : ""}`}
                >
                  Explore Experts
                </Link>
                <Link
                  href="/marketplace"
                  className={`text-sm hover:text-purple-400 transition-colors ${pathname === "/marketplace" ? "text-purple-400 font-semibold" : ""}`}
                >
                  Marketplace
                </Link>
                <Link
                  href="/dashboard"
                  className={`text-sm hover:text-purple-400 transition-colors ${pathname.startsWith("/dashboard") ? "text-purple-400 font-semibold" : ""}`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/faqs"
                  className={`text-sm hover:text-purple-400 transition-colors ${pathname === "/faqs" ? "text-purple-400 font-semibold" : ""}`}
                >
                  FAQ&apos;s
                </Link>
              </div>

              {/* Desktop Right Actions */}
              <div className="hidden md:flex items-center space-x-4 ml-6">
                <ThemeToggle />

                <select
                  value={selectedCurrency}
                  onChange={(event) => setSelectedCurrency(event.target.value as DisplayCurrency)}
                  className="rounded-lg border border-border bg-card/40 px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  aria-label="Select display currency"
                >
                  {DISPLAY_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>

                {isLandingPage ? (
                  <>
                    <Link href="/login">
                      <button className="px-4 h-8 text-sm border border-border rounded-lg hover:border-purple-500 transition-colors cursor-pointer">
                        Sign in
                      </button>
                    </Link>
                    <Link href="/sign-up">
                      <button className="px-4 h-8 text-sm bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors cursor-pointer text-white">
                        Get Started
                      </button>
                    </Link>
                  </>
                ) : address ? (
                  // Connected wallet display
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-600/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs text-purple-300 font-medium">
                        {shortenAddress(address)}
                      </span>
                      {balance && (
                        <span className="text-xs font-mono text-muted-foreground border-l border-border/40 pl-2">
                          {convert(Number(balance))}
                        </span>
                      )}
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 text-muted-foreground hover:text-white transition-colors"
                        aria-label="Copy address"
                        title="Copy Address"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={disconnect}
                      className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      aria-label="Disconnect wallet"
                      title="Disconnect Wallet"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Connect wallet button
                  <button
                    onClick={() => setWalletOpen(true)}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/20 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{isLoading ? "Connecting…" : "Connect Wallet"}</span>
                  </button>
                )}

                <button className="p-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors" aria-label="Notifications">
                  <Bell className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Dropdown */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 space-y-4 border-t border-border bg-background/95 backdrop-blur-md px-2">
                <Link href="/explore-experts" className="block text-sm font-medium hover:text-purple-400">
                  Explore Experts
                </Link>
                <Link href="/marketplace" className="block text-sm font-medium hover:text-purple-400">
                  Marketplace
                </Link>
                <Link href="/dashboard" className="block text-sm font-medium hover:text-purple-400">
                  Dashboard
                </Link>
                <Link href="/faqs" className="block text-sm font-medium hover:text-purple-400">
                  FAQ&apos;s
                </Link>

                <div className="pt-2 border-t border-border/40">
                  <label className="flex items-center justify-between text-sm">
                    <span>Currency</span>
                    <select
                      value={selectedCurrency}
                      onChange={(event) => setSelectedCurrency(event.target.value as DisplayCurrency)}
                      className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
                      aria-label="Select display currency"
                    >
                      {DISPLAY_CURRENCIES.map((currency) => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </label>

                  {address ? (
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 bg-red-500/10 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect ({shortenAddress(address)})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setWalletOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-white bg-purple-600 rounded-lg font-semibold"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        <CreateWalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
      </div>
    </>
  );
}
