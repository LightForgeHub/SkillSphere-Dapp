"use client";

import { useEffect, useRef, useState } from "react";

interface SessionNotesProps {
  sessionId: string;
  /** Call on session completion to persist the finalized notes. */
  onSaveToServer: (content: string) => Promise<void>;
}

const storageKey = (id: string) => `session-notes-${id}`;

export function SessionNotes({ sessionId, onSaveToServer }: SessionNotesProps) {
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Restore from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey(sessionId));
    if (saved) setContent(saved);
  }, [sessionId]);

  // Auto-save to sessionStorage every 10 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      sessionStorage.setItem(storageKey(sessionId), contentRef.current);
    }, 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  async function handleFinalize() {
    setSaveStatus("saving");
    // Final flush to sessionStorage before server save
    sessionStorage.setItem(storageKey(sessionId), content);
    try {
      await onSaveToServer(content);
      setSaveStatus("saved");
      sessionStorage.removeItem(storageKey(sessionId));
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
          Session Notes
        </span>
        <span className="text-[10px] text-white/30">
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "✓ Saved"}
          {saveStatus === "error" && "Save failed"}
          {saveStatus === "idle" && "Auto-saves every 10s"}
        </span>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Take notes in Markdown…"
        className="flex-1 min-h-[200px] w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-mono"
      />

      <button
        onClick={handleFinalize}
        disabled={saveStatus === "saving" || saveStatus === "saved"}
        className="w-full rounded-lg border border-violet-500/30 bg-violet-600/20 px-3 py-2 text-xs font-medium text-violet-300 transition-all hover:bg-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save Notes"}
      </button>
    </div>
  );
}
