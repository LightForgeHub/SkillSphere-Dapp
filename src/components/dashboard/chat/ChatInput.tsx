"use client"

import { useState, type KeyboardEvent } from "react"
import { Mic, Smile, Send } from "lucide-react"

interface ChatInputProps {
  onSend: (text: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("")

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-[#252625]">
      {/* Left icons */}
      <div className="flex items-center gap-2">
        <button
          className="p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          aria-label="Voice input"
        >
          <Mic className="w-5 h-5" />
        </button>
        <button
          className="p-1.5 text-[#7A7A7A] hover:text-white transition-colors"
          aria-label="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>
      </div>

      {/* Input */}
      <input
        id="chat-message-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message"
        className="flex-1 bg-transparent text-sm text-white placeholder:text-[#5A5A5A] outline-none"
      />

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!value.trim()}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#4ADE80] hover:bg-[#3FCF70] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        <Send className="w-4 h-4 text-[#101110]" />
      </button>
    </div>
  )
}
