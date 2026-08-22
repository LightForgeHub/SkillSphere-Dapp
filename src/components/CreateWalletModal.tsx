"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Wallet, ShieldCheck } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";

type ModalState = "idle" | "connecting" | "connected" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function CreateWalletModal({ open, onClose }: Props) {
  const { connect, address, walletType, error: walletError } = useWallet();
  const [state, setState] = useState<ModalState>("idle");
  const [method, setMethod] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      setState("idle");
      setMethod(null);
      setErrorMsg(null);
    }
  }, [open]);

  // Focus trap handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTORS);
        const firstElement = focusableElements[0] as HTMLElement | undefined;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [onClose]
  );

  // Manage focus and event listeners when modal opens/closes
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element
      setTimeout(() => {
        const focusableElements = modalRef.current?.querySelectorAll(FOCUSABLE_SELECTORS);
        if (focusableElements && focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }, 0);
    } else {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  function clickOutside(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function handleConnect(walletName: "Freighter" | "Lobstr" | "Albedo") {
    setMethod(walletName);
    setState("connecting");
    setErrorMsg(null);

    const success = await connect();

    if (success) {
      setState("connected");
      setTimeout(() => onClose(), 1000);
    } else {
      setState("error");
      setErrorMsg("Connection request was cancelled or declined in wallet.");
    }
  }

  const modalTitleId = "connect-wallet-modal-title";

  return (
    <div
      ref={backdropRef}
      onMouseDown={clickOutside}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="relative w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <h3 id={modalTitleId} className="text-lg font-bold text-foreground">Connect Wallet</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground">
          Select a Stellar wallet to connect and stream per-second consultation payments on SkillSphere.
        </p>

        <div className="space-y-3 pt-2">
          {state === "idle" && (
            <div className="space-y-3">
              {/* Freighter */}
              <button
                onClick={() => handleConnect("Freighter")}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-medium transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-purple-300" />
                  <span className="font-bold">Freighter Wallet</span>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20">
                  Browser Extension
                </span>
              </button>

              {/* Lobstr */}
              <button
                onClick={() => handleConnect("Lobstr")}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold">Lobstr Wallet</span>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20">
                  Mobile / Web
                </span>
              </button>

              {/* Albedo */}
              <button
                onClick={() => handleConnect("Albedo")}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-muted/60 hover:bg-muted text-foreground border border-border/60 rounded-xl font-medium transition-all"
              >
                <span>Albedo Link</span>
                <span className="text-[11px] font-semibold text-muted-foreground">Web-based</span>
              </button>
            </div>
          )}

          {state === "connecting" && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Connecting to {method}…</p>
                <p className="text-xs text-muted-foreground">
                  Please approve the access request in your {method} wallet popup.
                </p>
              </div>
            </div>
          )}

          {state === "connected" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <div>
                <p className="text-sm font-bold">{method || walletType} Connected!</p>
                <p className="text-xs text-emerald-300/80 font-mono truncate max-w-[280px]">
                  {address}
                </p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold">Connection Cancelled</p>
                <p className="text-xs text-red-300/80">
                  {errorMsg || walletError || `Connection request to ${method} was rejected or closed.`}
                </p>
                <button
                  onClick={() => void handleConnect((method as "Freighter" | "Lobstr" | "Albedo") ?? "Freighter")}
                  className="mr-2 text-xs font-semibold underline text-purple-400 hover:text-purple-300"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
