"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/components/ui/utils";

interface SessionNotesProps {
  sessionId: string;
  role: "seeker" | "expert";
  onSaveToServer: (content: string) => Promise<void>;
}

const storageKey = (id: string) => `session-notes-${id}`;
const SYNC_INTERVAL = 2000;
const DEBOUNCE_MS = 800;

function SimpleMarkdownPreview({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-lg font-bold text-white border-b border-white/10 pb-1 mt-2">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-bold text-white/90 border-b border-white/10 pb-0.5 mt-2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-semibold text-white/85 mt-1.5">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={idx} className="ml-4 list-disc text-white/80">
              {line.slice(2)}
            </li>
          );
        }
        if (line.startsWith("> ")) {
          return (
            <blockquote key={idx} className="border-l-2 border-violet-500/50 pl-3 italic text-white/60 my-1">
              {line.slice(2)}
            </blockquote>
          );
        }
        if (line.startsWith("```")) {
          return (
            <div key={idx} className="font-mono text-xs text-muted-foreground">
              {line}
            </div>
          );
        }
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="text-white/80 font-normal">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function SessionNotes({ sessionId, role, onSaveToServer }: SessionNotesProps) {
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing">("idle");

  const contentRef = useRef(content);
  contentRef.current = content;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncTs = useRef(Date.now());
  const lastSentTs = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey(sessionId));
    if (saved) setContent(saved);
  }, [sessionId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      sessionStorage.setItem(storageKey(sessionId), contentRef.current);
    }, 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const syncToServer = useCallback(async (text: string) => {
    try {
      setSyncStatus("syncing");
      await fetch(`/api/session/${sessionId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, role }),
      });
      lastSentTs.current = Date.now();
      setSyncStatus("idle");
    } catch {
      setSyncStatus("idle");
    }
  }, [sessionId, role]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncToServer(contentRef.current);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, syncToServer]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/notes`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.updatedAt && data.updatedAt > lastSyncTs.current) {
          if (Date.now() - lastSentTs.current > DEBOUNCE_MS + 200) {
            setContent(data.content ?? "");
            sessionStorage.setItem(storageKey(sessionId), data.content ?? "");
            lastSyncTs.current = data.updatedAt;
          }
        }
      } catch {
        // polling error ignored
      }
    }, SYNC_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${sessionId}-notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, sessionId]);

  const handleFinalize = useCallback(async () => {
    setSaveStatus("saving");
    try {
      sessionStorage.setItem(storageKey(sessionId), content);
      await onSaveToServer(content);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }, [content, sessionId, onSaveToServer]);

  return (
    <div className="flex flex-col h-full space-y-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Session Notes</h3>
        <div className="flex items-center gap-2">
          {syncStatus === "syncing" && (
            <span className="text-[10px] text-violet-400 animate-pulse">Syncing…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[10px] text-emerald-400">Saved to Cloud</span>
          )}
        </div>
      </div>

      <div className="flex rounded-lg bg-white/5 p-0.5">
        <button
          onClick={() => setActiveTab("write")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            activeTab === "write"
              ? "bg-violet-600/30 text-violet-200 shadow-sm"
              : "text-white/40 hover:text-white/70"
          )}
        >
          Write
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            activeTab === "preview"
              ? "bg-violet-600/30 text-violet-200 shadow-sm"
              : "text-white/40 hover:text-white/70"
          )}
        >
          Preview
        </button>
      </div>

      {activeTab === "write" && (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Take notes in Markdown…"
          className="flex-1 min-h-[200px] w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 font-mono"
        />
      )}

      {activeTab === "preview" && (
        <div className="flex-1 min-h-[200px] w-full overflow-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
          {content ? (
            <SimpleMarkdownPreview text={content} />
          ) : (
            <p className="text-white/30 italic">No content to preview</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleFinalize}
          disabled={saveStatus === "saving" || saveStatus === "saved"}
          className="flex-1 rounded-lg border border-violet-500/30 bg-violet-600/20 px-3 py-2 text-xs font-medium text-violet-300 transition-all hover:bg-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save Notes"}
        </button>
        <button
          onClick={handleDownload}
          disabled={!content.trim()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Download .md
        </button>
      </div>
    </div>
  );
}
