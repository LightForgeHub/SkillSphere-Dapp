"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";

type ModalState = "idle" | "connecting" | "connected" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateWalletModal({ open, onClose }: Props) {
  const [state, setState] = useState<ModalState>("idle");
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const { connect, error } = useWallet();

  // reset when opened
  useEffect(() => {
    if (open) {
      setState("idle");
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function clickOutside(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleConnect() {
    setState("connecting");
    const connected = await connect();
    setState(connected ? "connected" : "error");
  }

  return (
    <div
      ref={backdropRef}
      onMouseDown={clickOutside}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="relative w-[min(520px,94%)] bg-[var(--background)] border border-white/10 rounded-xl p-6">
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute right-3 top-3 p-2 rounded-md hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose a wallet to connect to SkillSphere.</p>

        <div className="mt-6 space-y-3">
          {/* Default / Options */}
          {state === "idle" && (
            <div>
              <button onClick={() => void handleConnect()} className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#4B0082] to-[#1E90FF] text-white border border-white/10 rounded-lg hover:opacity-90 transition-opacity">
                <span>Freighter</span>
                <span className="text-xs text-white/90">Recommended</span>
              </button>
            </div>
          )}

          {/* Connecting */}
          {state === "connecting" && (
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white/60 animate-bounce" />
              </div>
              <div>
                <div className="text-sm">Connecting to Freighter…</div>
                <div className="text-xs text-muted-foreground">Please approve the connection in your wallet.</div>
              </div>
            </div>
          )}

          {/* Connected */}
          {state === "connected" && (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-sm">Connected</div>
                <div className="text-xs text-muted-foreground">Freighter is now connected.</div>
              </div>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div>
                <div className="text-sm">Connection failed</div>
                <div className="text-xs text-muted-foreground">
                  {error ?? "Unable to connect to Freighter. Please try again."}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          {state === "error" && (
            <button
              onClick={() => void handleConnect()}
              className="mr-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Try again
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-white/5 rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
}
