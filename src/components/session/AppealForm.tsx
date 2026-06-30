"use client";

import React, { useId, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Gavel,
  Info,
  Paperclip,
  SendHorizonal,
  UploadCloud,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/utils";
import type { Dispute, DisputeVerdict } from "../../../utils/types/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppealFormProps {
  /** The settled dispute whose verdict is being contested. */
  dispute: Dispute;
  /** Session title shown for context. */
  sessionTitle: string;
  /** Called when the user successfully submits an appeal. */
  onAppealSubmitted?: (appealId: string) => void;
}

type Step = "form" | "confirm" | "success";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp,.txt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const verdictLabel: Record<DisputeVerdict, string> = {
  favour_expert: "Decided in favour of expert",
  favour_seeker: "Decided in favour of seeker",
  split: "Split decision",
};

const verdictColor: Record<DisputeVerdict, string> = {
  favour_expert: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  favour_seeker: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  split: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FileChipProps {
  file: File;
  onRemove: () => void;
}

function FileChip({ file, onRemove }: FileChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
      <FileText className="size-4 shrink-0 text-violet-400" aria-hidden="true" />
      <span className="truncate max-w-[160px] text-foreground/80">{file.name}</span>
      <span className="shrink-0 text-foreground/40">{formatBytes(file.size)}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 shrink-0 rounded p-0.5 text-foreground/40 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
        aria-label={`Remove ${file.name}`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppealForm (inline card variant)
// ---------------------------------------------------------------------------

/**
 * Renders an appeal form card. Visibility is controlled by the parent — only
 * mount this component when the dispute status is `resolved` and the current
 * user is one of the parties (expert or seeker).
 */
export function AppealForm({ dispute, sessionTitle, onAppealSubmitted }: AppealFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [grounds, setGrounds] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appealId, setAppealId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const groundsId = useId();
  const evidenceId = useId();

  const groundsMinLength = 30;
  const isFormValid =
    grounds.trim().length >= groundsMinLength &&
    (evidenceDescription.trim().length > 0 || files.length > 0);

  // ── File handling ─────────────────────────────────────────────────────────

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFileError(null);

    const candidates = Array.from(incoming);
    const errors: string[] = [];
    const valid: File[] = [];

    for (const f of candidates) {
      if (!ACCEPTED_MIME_TYPES.includes(f.type)) {
        errors.push(`"${f.name}" is not a supported file type.`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`"${f.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
        continue;
      }
      valid.push(f);
    }

    setFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > MAX_FILES) {
        errors.push(`You can attach at most ${MAX_FILES} files.`);
        return prev;
      }
      return merged;
    });

    if (errors.length) setFileError(errors.join(" "));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  // ── Submission ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!isFormValid) return;
    setIsSubmitting(true);

    // Simulate async submission (replace with real Soroban / API call)
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const id = `APPEAL_${Date.now()}`;
    setAppealId(id);
    setIsSubmitting(false);
    setStep("success");
    onAppealSubmitted?.(id);
  }

  function handleReset() {
    setStep("form");
    setGrounds("");
    setEvidenceDescription("");
    setFiles([]);
    setFileError(null);
    setAppealId(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="appeal-form-heading"
      className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6 space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
          <Gavel className="size-5 text-amber-400" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="appeal-form-heading"
            className="text-base font-semibold text-foreground"
          >
            Submit an Appeal
          </h2>
          <p className="text-xs text-foreground/50 mt-0.5">
            Contest the dispute verdict for &ldquo;{sessionTitle}&rdquo;
          </p>
        </div>
      </div>

      {/* ── Verdict Summary ── */}
      {dispute.verdict && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3",
            verdictColor[dispute.verdict]
          )}
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">Dispute verdict</p>
            <p className="text-xs opacity-80 mt-0.5 truncate">
              {verdictLabel[dispute.verdict]}
              {dispute.verdictNote && ` — ${dispute.verdictNote}`}
            </p>
          </div>
          <Badge variant="warning" className="shrink-0 text-[10px]">
            Resolved
          </Badge>
        </div>
      )}

      {/* ── Info Banner ── */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3">
        <Info className="size-4 shrink-0 text-blue-400 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-foreground/60 leading-relaxed">
          Appeals are reviewed by a community jury. Providing clear grounds and
          supporting evidence improves the chance of a fair reassessment.
        </p>
      </div>

      {/* ── Step: Form ── */}
      {step === "form" && (
        <div className="space-y-5">
          {/* Grounds for appeal */}
          <div className="space-y-1.5">
            <label
              htmlFor={groundsId}
              className="block text-xs font-medium text-foreground/70"
            >
              Grounds for appeal{" "}
              <span className="text-red-400" aria-hidden="true">*</span>
            </label>
            <textarea
              id={groundsId}
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
              rows={4}
              placeholder="Explain why you believe the verdict was incorrect. Be specific about what was misrepresented or overlooked during the original dispute review."
              className={cn(
                "w-full resize-none rounded-xl border bg-white/5 px-4 py-3 text-sm text-foreground/90 placeholder:text-foreground/30",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                grounds.trim().length > 0 && grounds.trim().length < groundsMinLength
                  ? "border-amber-500/50"
                  : "border-white/10 focus:border-primary/50"
              )}
              aria-required="true"
              aria-describedby={`${groundsId}-hint`}
            />
            <p
              id={`${groundsId}-hint`}
              className={cn(
                "text-[11px]",
                grounds.trim().length < groundsMinLength && grounds.trim().length > 0
                  ? "text-amber-400"
                  : "text-foreground/30"
              )}
            >
              {grounds.trim().length}/{groundsMinLength} characters minimum
            </p>
          </div>

          {/* New evidence description */}
          <div className="space-y-1.5">
            <label
              htmlFor={evidenceId}
              className="block text-xs font-medium text-foreground/70"
            >
              New evidence description
              <span className="ml-1 text-foreground/30 font-normal">(optional if attaching files)</span>
            </label>
            <textarea
              id={evidenceId}
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              rows={3}
              placeholder="Describe any new evidence that was not presented during the initial dispute — links, timestamps, screenshots, chat logs, etc."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground/90 placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
              aria-describedby={`${evidenceId}-hint`}
            />
            <p id={`${evidenceId}-hint`} className="text-[11px] text-foreground/30">
              At least one of: evidence description or file attachment is required.
            </p>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">
              Supporting documents
              <span className="ml-1 text-foreground/30 font-normal">
                (PDF, PNG, JPG, WEBP, TXT · max {MAX_FILE_SIZE_MB} MB each · up to {MAX_FILES} files)
              </span>
            </p>

            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload supporting documents"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-all",
                isDragging
                  ? "border-primary/60 bg-primary/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              <UploadCloud
                className={cn(
                  "size-7 transition-colors",
                  isDragging ? "text-primary" : "text-foreground/30"
                )}
                aria-hidden="true"
              />
              <p className="text-xs text-foreground/50 text-center">
                <span className="text-foreground/70 font-medium">Click to browse</span>{" "}
                or drag & drop files here
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              className="sr-only"
              aria-label="File input for supporting documents"
              onChange={(e) => addFiles(e.target.files)}
              // Reset value so the same file can be re-added after removal
              onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
            />

            {/* File error */}
            {fileError && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                {fileError}
              </p>
            )}

            {/* Attached files list */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {files.map((file, i) => (
                  <FileChip
                    key={`${file.name}-${i}`}
                    file={file}
                    onRemove={() => removeFile(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleReset}
              type="button"
            >
              Clear Form
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2"
              disabled={!isFormValid}
              onClick={() => setStep("confirm")}
              type="button"
              aria-disabled={!isFormValid}
            >
              <Paperclip className="size-4" aria-hidden="true" />
              Review & Submit
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === "confirm" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 overflow-hidden">
            <div className="px-4 py-3 flex justify-between items-start gap-3">
              <span className="text-xs text-foreground/50 shrink-0">Session</span>
              <span className="text-xs font-medium text-foreground/90 text-right">{sessionTitle}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-start gap-3">
              <span className="text-xs text-foreground/50 shrink-0 mt-0.5">Appeal grounds</span>
              <span className="text-xs text-foreground/80 text-right max-w-xs leading-relaxed">{grounds}</span>
            </div>
            {evidenceDescription && (
              <div className="px-4 py-3 flex justify-between items-start gap-3">
                <span className="text-xs text-foreground/50 shrink-0 mt-0.5">New evidence</span>
                <span className="text-xs text-foreground/80 text-right max-w-xs leading-relaxed">{evidenceDescription}</span>
              </div>
            )}
            {files.length > 0 && (
              <div className="px-4 py-3 flex justify-between items-start gap-3">
                <span className="text-xs text-foreground/50 shrink-0">Attachments</span>
                <span className="text-xs text-foreground/80">{files.length} file{files.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-foreground/60 leading-relaxed">
              Once submitted, appeals cannot be withdrawn. The community jury will
              review your submission and issue a final binding decision.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setStep("form")}
              disabled={isSubmitting}
              type="button"
            >
              Go Back
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                    aria-hidden="true"
                  />
                  Submitting…
                </>
              ) : (
                <>
                  <SendHorizonal className="size-4" aria-hidden="true" />
                  Confirm Appeal
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Success ── */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="relative">
            <div
              className="absolute inset-0 bg-emerald-500/30 rounded-full blur-lg animate-pulse"
              aria-hidden="true"
            />
            <div className="relative rounded-full border border-emerald-500/50 bg-emerald-500/15 p-4">
              <CheckCircle2 className="size-8 text-emerald-400" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">Appeal Submitted</h3>
            <p className="text-xs text-foreground/55 max-w-xs leading-relaxed">
              Your appeal has been sent to the community jury for review. You will
              be notified once a decision is reached.
            </p>
          </div>

          {appealId && (
            <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between text-xs">
              <span className="text-foreground/50">Appeal ID</span>
              <span className="font-mono font-semibold text-foreground/80">{appealId}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// AppealFormModal (modal wrapper — convenient for triggering from a button)
// ---------------------------------------------------------------------------

interface AppealFormModalProps extends AppealFormProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Wraps AppealForm inside the shared Modal component for contexts where
 * you want to open the appeal form as an overlay rather than an inline card.
 */
export function AppealFormModal({
  isOpen,
  onClose,
  dispute,
  sessionTitle,
  onAppealSubmitted,
}: AppealFormModalProps) {
  function handleSubmitted(id: string) {
    onAppealSubmitted?.(id);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Community Dispute Appeal"
      className="max-w-2xl"
    >
      <div className="p-6">
        <AppealForm
          dispute={dispute}
          sessionTitle={sessionTitle}
          onAppealSubmitted={handleSubmitted}
        />
      </div>
    </Modal>
  );
}
