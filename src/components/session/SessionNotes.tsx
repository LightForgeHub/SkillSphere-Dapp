"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/components/ui/utils";

interface SessionNotesProps {
  sessionId: string;
  role: "seeker" | "expert";
  onSaveToServer: (content: string) => Promise<void>;
}

const storageKey = (id: string) => `session-notes-${id}`;
const SYNC_INTERVAL = 2000;
const DEBOUNCE_MS = 800;

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
        const res = await fetch(
          `/api/session/${sessionId}/notes?role=${role}&since=${lastSyncTs.current}`
        );
        const data = await res.json();
        if (data.content !== null && data.timestamp > lastSyncTs.current) {
          lastSyncTs.current = data.timestamp;
          if (data.timestamp > lastSentTs.current) {
            setContent(data.content);
          }
        }
      } catch {
        // silent
      }
    }, SYNC_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, role]);

  async function handleFinalize() {
    setSaveStatus("saving");
    sessionStorage.setItem(storageKey(sessionId), content);
    try {
      await onSaveToServer(content);
      setSaveStatus("saved");
      sessionStorage.removeItem(storageKey(sessionId));
    } catch {
      setSaveStatus("error");
    }
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-notes-${sessionId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
          Session Notes
        </span>
        <div className="flex items-center gap-2">
          {syncStatus === "syncing" && (
            <span className="text-[10px] text-blue-300/50">syncing…</span>
          )}
          <span className="text-[10px] text-white/30">
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "✓ Saved"}
            {saveStatus === "error" && "Save failed"}
            {saveStatus === "idle" && "Auto-saves every 10s"}
          </span>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
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
          placeholder="Take notes in Markdown&#8230;"
          className="flex-1 min-h-[200px] w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-mono"
        />
      )}

      {activeTab === "preview" && (
        <div className="flex-1 min-h-[200px] w-full overflow-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
          {content ? (
            <div className="markdown-body space-y-2">
              <ReactMarkdown
                rehypePlugins={[rehypeSanitize]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-white border-b border-white/10 pb-1">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-white/90 border-b border-white/10 pb-0.5">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-white/85">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-white/80 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-sm text-white/80 space-y-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-sm text-white/80 space-y-0.5">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-white/80">{children}</li>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="rounded bg-white/10 px-1 py-0.5 text-xs font-mono text-violet-300">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="rounded-lg bg-black/40 border border-white/10 p-3 overflow-x-auto">
                        <code className="text-xs font-mono text-green-300">{children}</code>
                      </pre>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-violet-500/50 pl-3 italic text-white/60">
                      {children}
                    </blockquote>
                  ),
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-white/85">{children}</em>
                  ),
                  hr: () => <hr className="border-white/10 my-3" />,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
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
