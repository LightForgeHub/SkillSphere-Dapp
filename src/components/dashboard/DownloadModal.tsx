"use client";

import React, { useEffect, useRef } from "react";
import { X, Download, FileText, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  studentName?: string;
  taskName?: string;
  fileName?: string;
}

export default function DownloadModal({
  open,
  onClose,
  studentName = "Johnny Drill",
  taskName = "Research & Write Task",
  fileName = "submission.pdf",
}: Props) {
  const backdropRef = useRef<HTMLDivElement | null>(null);

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

  function handleDownload() {
    // Simulate download action
    console.log(`Downloading: ${fileName}`);
    onClose();
  }

  return (
    <div
      ref={backdropRef}
      onMouseDown={clickOutside}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="relative w-[min(520px,94%)] bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute right-3 top-3 p-2 rounded-md hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">Download Submission</h3>
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
