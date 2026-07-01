"use client";

/**
 * DevToolsSwitcher
 *
 * A developer-only overlay that is visible **only** in localhost / sandbox mode
 * (i.e. when `process.env.NEXT_PUBLIC_SANDBOX_MODE === "true"` OR when the
 * app is running on localhost).
 *
 * Features:
 *  • Collapsible panel anchored to the right side of the viewport
 *  • Three mock personas: Alice (Seeker), Bob (Expert), Admin
 *  • Switching a persona instantly updates the connected wallet context address
 */

import React, { useEffect, useState } from "react";
import { ChevronRight, FlaskConical, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSandboxWallet } from "@/providers/WalletProvider";

// ─── Mock Profiles ────────────────────────────────────────────────────────────

export interface MockProfile {
  id: string;
  label: string;
  role: "seeker" | "expert" | "admin";
  address: string;
  network: string;
  balance: string;
}

export const MOCK_PROFILES: MockProfile[] = [
  {
    id: "alice",
    label: "Alice",
    role: "seeker",
    address: "GBRPYHIL2CI3WHZDTOOQFC6EB4KJJGUJQNZVIU3TWCYGIQUI5GUDFQD",
    network: "TESTNET",
    balance: "500.00",
  },
  {
    id: "bob",
    label: "Bob",
    role: "expert",
    address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZS0CNKBFJ5DDUQNZXZXT",
    network: "TESTNET",
    balance: "1200.50",
  },
  {
    id: "admin",
    label: "Admin",
    role: "admin",
    address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    network: "TESTNET",
    balance: "9999.99",
  },
];

// ─── Role badge colours ───────────────────────────────────────────────────────

const roleBadgeClass: Record<MockProfile["role"], string> = {
  seeker: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  expert: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  admin: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
};

// ─── Sandbox detection ────────────────────────────────────────────────────────

function isSandboxEnv(): boolean {
  if (typeof window === "undefined") return false;
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";
  const sandboxFlag = process.env.NEXT_PUBLIC_SANDBOX_MODE === "true";
  return isLocalhost || sandboxFlag;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DevToolsSwitcher() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  // Only show in sandbox / localhost environment
  useEffect(() => {
    setVisible(isSandboxEnv());
  }, []);

  // Access the sandbox-specific setter from WalletProvider
  const { activeMockProfile, setMockProfile } = useSandboxWallet();

  if (!visible) return null;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex items-center"
      role="region"
      aria-label="Developer Tools Switcher"
    >
      {/* Sliding panel */}
      <div
        className={cn(
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/60 rounded-l-xl shadow-2xl w-56 p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700/50">
            <FlaskConical className="size-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Sandbox Mode
            </span>
          </div>

          {/* Profile list */}
          <ul className="space-y-1.5" role="listbox" aria-label="Select mock profile">
            {MOCK_PROFILES.map((profile) => {
              const isActive = activeMockProfile?.id === profile.id;
              return (
                <li key={profile.id} role="option" aria-selected={isActive}>
                  <button
                    onClick={() => setMockProfile(profile)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left",
                      "text-xs transition-colors duration-150",
                      isActive
                        ? "bg-primary/20 border border-primary/40 text-white"
                        : "hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 border border-transparent"
                    )}
                    aria-pressed={isActive}
                    title={`Switch to ${profile.label} (${profile.address.slice(0, 6)}…${profile.address.slice(-4)})`}
                  >
                    <User className="size-3.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{profile.label}</div>
                      <div className="text-[10px] opacity-60 truncate font-mono">
                        {profile.address.slice(0, 8)}…
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-medium px-1.5 py-0.5 rounded-full capitalize shrink-0",
                        roleBadgeClass[profile.role]
                      )}
                    >
                      {profile.role}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Active address footer */}
          {activeMockProfile && (
            <div className="mt-3 pt-2 border-t border-zinc-700/50">
              <p className="text-[10px] text-zinc-500 mb-0.5">Active address</p>
              <p className="text-[10px] font-mono text-zinc-400 break-all">
                {activeMockProfile.address}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Balance:{" "}
                <span className="text-zinc-300">{activeMockProfile.balance} XLM</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle tab */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center justify-center",
          "bg-amber-500 hover:bg-amber-400 text-zinc-900",
          "w-7 h-14 rounded-l-lg shadow-lg",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        )}
        aria-label={open ? "Close dev tools panel" : "Open dev tools panel"}
        aria-expanded={open}
        title="Toggle sandbox dev tools"
      >
        <ChevronRight
          className={cn(
            "size-4 transition-transform duration-300",
            open ? "rotate-0" : "rotate-180"
          )}
        />
      </button>
    </div>
  );
}
