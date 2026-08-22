"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { X, Download, FileText, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  studentName?: string;
  taskName?: string;
  fileName?: string;
}

const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function DownloadModal({
  open,
  onClose,
  studentName = "Johnny Drill",
  taskName = "Research & Write Task",
  fileName = "submission.pdf",
}: Props) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

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

  function handleDownload() {
    // Simulate download action
    console.log(`Downloading: ${fileName}`);
    onClose();
  }

  const modalTitleId = "download-modal-title";

  return (
    <div
      ref={backdropRef}
      onMouseDown={clickOutside}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="relative w-[min(520px,94%)] bg-card border border-border rounded-xl p-6 space-y-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-3 top-3 p-2 rounded-md hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Header */}
        <div>
          <h3 id={modalTitleId} className="text-lg font-semibold text-foreground">Download Submission</h3>
          <p className="text-sm text-foreground/60 mt-1">
            Review and download the student submission
          </p>
        </div>

        {/* Student Info Section */}
        <div className="space-y-4 bg-card/40 border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-purple-400">
                {studentName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{studentName}</p>
              <p className="text-xs text-foreground/50">{taskName}</p>
            </div>
          </div>
        </div>

        {/* File Details Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/80">File Details</h4>
          <div className="space-y-2">
            {/* File Name */}
            <div className="flex items-center gap-3 text-sm">
              <FileText size={16} className="text-foreground/40" />
              <div>
                <p className="text-xs text-foreground/50">File Name</p>
                <p className="text-foreground text-sm font-medium">{fileName}</p>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-center gap-3 text-sm">
              <HardDrive size={16} className="text-foreground/40" />
              <div>
                <p className="text-xs text-foreground/50">File Size</p>
                <p className="text-foreground text-sm font-medium">2.4 MB</p>
              </div>
            </div>

            {/* Submitted Time */}
            <div className="flex items-center gap-3 text-sm">
              <Clock size={16} className="text-foreground/40" />
              <div>
                <p className="text-xs text-foreground/50">Submitted</p>
                <p className="text-foreground text-sm font-medium">
                  May 15, 2024 at 3:45 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Preview Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground/80">Content Preview</h4>
          <div className="bg-card/40 border border-border rounded-lg p-4 text-sm text-foreground/60 max-h-40 overflow-y-auto">
            <p className="leading-relaxed">
              This document contains the student&apos;s response to the Research &amp; Write
              task. The submission includes a comprehensive analysis covering:
            </p>
            <ul className="mt-3 space-y-2 list-disc pl-4 text-foreground/50">
              <li>History of digital technology</li>
              <li>Major technological breakthroughs</li>
              <li>Impact on business and education</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="flex-1 border-border bg-transparent text-foreground hover:bg-accent"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
            onClick={handleDownload}
          >
            <Download size={16} />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
