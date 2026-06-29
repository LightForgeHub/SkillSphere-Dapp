"use client";

import React, { useState } from "react";
import { ChevronRight, CheckCircle, CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface BookSessionModalProps {
  expertName: string;
  slotFee: string;
  isOpen: boolean;
  onClose: () => void;
  onReserved?: (reservationId: string) => void;
}

type Step = "deposit" | "confirmation";

export default function BookSessionModal({
  expertName,
  slotFee,
  isOpen,
  onClose,
  onReserved,
}: BookSessionModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("deposit");
  const [isProcessing, setIsProcessing] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);

  const handleDeposit = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsProcessing(false);

    const id = `RES_${Date.now()}`;
    setReservationId(id);
    setCurrentStep("confirmation");
    onReserved?.(id);
  };

  const handleClose = () => {
    setCurrentStep("deposit");
    setReservationId(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reserve Session Slot">
      <div className="p-6">
        {currentStep === "deposit" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/60">Expert</span>
                <span className="font-semibold">{expertName}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/60">Service</span>
                <span className="font-semibold">1:1 Consultation</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="text-sm text-white/60">Slot Reservation Fee</span>
                <span className="text-lg font-bold text-purple-400">{slotFee} XLM</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <CalendarClock className="size-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-300">
                  What is a reservation fee?
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  Depositing the slot fee locks your appointment with {expertName}.
                  The fee is applied toward your session total once the consultation begins.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDeposit}
                disabled={isProcessing}
                className="w-full gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Deposit {slotFee} XLM to Reserve
                    <ChevronRight size={18} />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {currentStep === "confirmation" && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-lg animate-pulse" />
                <div className="relative bg-emerald-500/20 border border-emerald-500/50 rounded-full p-4">
                  <CheckCircle size={40} className="text-emerald-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold">Session Reserved!</h3>
                <p className="text-sm text-white/60 max-w-sm">
                  Your appointment with <span className="text-white font-semibold">{expertName}</span> has been secured.
                  The slot fee of <span className="text-purple-400 font-semibold">{slotFee} XLM</span> will be applied to your final session invoice.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Reservation ID</span>
                <span className="font-mono font-semibold">{reservationId}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-3">
                <span className="text-white/50">Status</span>
                <Badge variant="success" className="text-[10px]">Confirmed</Badge>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
