"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import CreateWalletModal from "@/components/CreateWalletModal";
import FundSessionModal from "@/components/marketplace/FundSessionModal";

// ─── Modal registry ────────────────────────────────────────────────────────────

export type ModalType = "connectWallet" | "fundSession" | "feedback";

// Per-modal prop shapes (omit the open/close controls added by the dispatcher)
type ModalProps = {
  connectWallet: Record<string, never>;
  fundSession: { expertName: string; expertHourlyRate: string; onSuccess?: (id: string) => void };
  feedback: Record<string, never>;
};

// ─── Context ───────────────────────────────────────────────────────────────────

interface ModalContextValue {
  openModal: <T extends ModalType>(type: T, props?: ModalProps[T]) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ActiveModal {
  type: ModalType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveModal | null>(null);

  const openModal = useCallback(<T extends ModalType>(type: T, props?: ModalProps[T]) => {
    setActive({ type, props: props ?? {} });
  }, []);

  const closeModal = useCallback(() => setActive(null), []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      {/* ── Global modal dispatcher ── */}
      {active?.type === "connectWallet" && (
        <CreateWalletModal open onClose={closeModal} />
      )}

      {active?.type === "fundSession" && (
        <FundSessionModal
          isOpen
          onClose={closeModal}
          expertName={active.props.expertName}
          expertHourlyRate={active.props.expertHourlyRate}
          onSuccess={active.props.onSuccess}
        />
      )}

      {/* feedback modal placeholder – wire in a real component when built */}
      {active?.type === "feedback" && null}
    </ModalContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside <ModalProvider>");
  return ctx;
}
