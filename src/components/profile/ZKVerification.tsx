"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Upload, KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/utils";

type VerificationMethod = "upload" | "signature" | null;
type VerificationStatus = "idle" | "pending" | "verified" | "failed";

interface ZKVerificationProps {
  isVerified?: boolean;
  onVerified?: () => void;
  className?: string;
}

export function ZKVerification({
  isVerified: initialVerified = false,
  onVerified,
  className,
}: ZKVerificationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [method, setMethod] = useState<VerificationMethod>(null);
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [signatureInput, setSignatureInput] = useState("");
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [isVerified, setIsVerified] = useState(initialVerified);

  const handleOpen = () => {
    setIsModalOpen(true);
    setMethod(null);
    setCredentialFile(null);
    setSignatureInput("");
    setStatus("idle");
  };

  const handleClose = () => {
    if (status === "pending") return;
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (method === "upload" && !credentialFile) return;
    if (method === "signature" && !signatureInput.trim()) return;

    setStatus("pending");

    // Simulate on-chain ZK proof verification
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Mock: treat any non-empty input as a successful proof
    const success = true;

    if (success) {
      setStatus("verified");
      setIsVerified(true);
      onVerified?.();
      // Auto-close after a short delay so user can see the success state
      setTimeout(() => setIsModalOpen(false), 1800);
    } else {
      setStatus("failed");
    }
  };

  const canSubmit =
    status !== "pending" &&
    ((method === "upload" && !!credentialFile) ||
      (method === "signature" && signatureInput.trim().length > 0));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Verified Partner Badge */}
      {isVerified ? (
        <Badge
          variant="success"
          className="gap-1.5 px-3 py-1 text-xs font-semibold"
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Verified Partner
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="h-9 px-4 rounded-xl border-white/10 hover:bg-white/5 gap-2 text-white/80"
          aria-label="Start identity verification"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" aria-hidden="true" />
          Verify Identity
        </Button>
      )}

      {/* Verification Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="ZK Identity Verification"
        className="max-w-lg"
      >
        <div className="p-6 flex flex-col gap-6">
          {/* Description */}
          <p className="text-sm text-white/60 leading-relaxed">
            Verify your identity using a zero-knowledge proof. Your private
            data is never exposed — only a cryptographic proof is submitted
            on-chain.
          </p>

          {/* Method Selection */}
          {status !== "verified" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                Choose verification method
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Upload Credentials */}
                <button
                  type="button"
                  onClick={() => setMethod("upload")}
                  disabled={status === "pending"}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all focus-visible:ring-2 focus-visible:ring-primary/50 outline-none",
                    method === "upload"
                      ? "border-purple-500/60 bg-purple-500/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06]",
                    status === "pending" && "opacity-50 pointer-events-none"
                  )}
                  aria-pressed={method === "upload"}
                >
                  <Upload className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm font-medium">Upload Credentials</span>
                  <span className="text-xs text-white/40">
                    Upload a ZK credential file
                  </span>
                </button>

                {/* Signature Verification */}
                <button
                  type="button"
                  onClick={() => setMethod("signature")}
                  disabled={status === "pending"}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all focus-visible:ring-2 focus-visible:ring-primary/50 outline-none",
                    method === "signature"
                      ? "border-purple-500/60 bg-purple-500/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06]",
                    status === "pending" && "opacity-50 pointer-events-none"
                  )}
                  aria-pressed={method === "signature"}
                >
                  <KeyRound className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm font-medium">Signature Proof</span>
                  <span className="text-xs text-white/40">
                    Sign with your wallet key
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Upload Input */}
          {method === "upload" && status !== "verified" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/60 pl-1">
                ZK Credential File
              </label>
              <FileUpload
                label="Drop or click to upload credential"
                accept=".json,.zkp,.proof"
                onFileSelect={(file) => setCredentialFile(file)}
                value={credentialFile}
                className="min-h-[100px]"
              />
              <p className="text-xs text-white/30 pl-1">
                Accepted formats: .json, .zkp, .proof
              </p>
            </div>
          )}

          {/* Signature Input */}
          {method === "signature" && status !== "verified" && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="zk-signature"
                className="text-sm font-medium text-white/60 pl-1"
              >
                Zero-Knowledge Proof Signature
              </label>
              <textarea
                id="zk-signature"
                value={signatureInput}
                onChange={(e) => setSignatureInput(e.target.value)}
                disabled={status === "pending"}
                placeholder="Paste your ZK proof signature here…"
                rows={4}
                className="w-full rounded-xl bg-transparent border border-white/10 text-white/90 text-sm p-3 resize-none placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50"
              />
              <p className="text-xs text-white/30 pl-1">
                Obtain this signature from your ZK identity provider.
              </p>
            </div>
          )}

          {/* Failed State */}
          {status === "failed" && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
            >
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-400">
                Verification failed. Please check your proof and try again.
              </p>
            </div>
          )}

          {/* Verified Success State */}
          {status === "verified" && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 py-4 text-center"
            >
              <CheckCircle2
                className="w-12 h-12 text-emerald-400 animate-in zoom-in duration-300"
                aria-hidden="true"
              />
              <p className="text-base font-semibold text-white">
                Identity Verified!
              </p>
              <p className="text-sm text-white/50">
                Your{" "}
                <span className="text-emerald-400 font-medium">
                  Verified Partner
                </span>{" "}
                badge has been applied to your profile.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {status !== "verified" && (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={status === "pending"}
                className="text-white/50 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="min-w-[130px]"
                aria-busy={status === "pending"}
              >
                {status === "pending" ? (
                  <>
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      aria-hidden="true"
                    />
                    Verifying…
                  </>
                ) : (
                  "Submit Proof"
                )}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
