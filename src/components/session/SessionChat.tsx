"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "expert";
  timestamp: number;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderContent(text: string) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let key = 0;

  let match: RegExpExecArray | null;
  const regex = new RegExp(codeBlockRegex.source, codeBlockRegex.flags);

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      parts.push(
        <span key={key++} className="whitespace-pre-wrap">{before}</span>
      );
    }

    const lang = match[1] || "";
    const code = match[2];

    parts.push(
      <pre
        key={key++}
        className="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono leading-relaxed"
      >
        {lang && (
          <div className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">
            {lang}
          </div>
        )}
        <code>{code}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap">{text.slice(lastIndex)}</span>
    );
  }

  return parts.length > 0 ? parts : text;
}

export function SessionChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: String(nextId.current++),
      text: trimmed,
      sender: "user",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#101110] border border-[#252625] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#252625] bg-[#1A1B1A] shrink-0">
        <h3 className="text-sm font-medium text-white">Session Chat</h3>
        <p className="text-xs text-[#7A7A7A]">Share links, code, and snippets</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <p className="text-xs text-[#5A5A5A] text-center">
              No messages yet. Send a message to start chatting!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.sender === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2",
                msg.sender === "user"
                  ? "bg-[#2D3B2D] rounded-br-sm"
                  : "bg-[#1A1B1A] rounded-bl-sm"
              )}
            >
              <div className="text-sm leading-relaxed text-[#D4D4D4]">
                {renderContent(msg.text)}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1.5 mt-1",
                  msg.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <span className="text-[10px] text-[#7A7A7A]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-[#252625] shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#5A5A5A] outline-none resize-none max-h-32 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[#4ADE80] hover:bg-[#3FCF70] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-[#101110]" />
          </button>
        </div>
      </div>
    </div>
  );
}
