"use client"

import { useState, useRef, useEffect } from "react"
import ChatHeader from "./ChatHeader"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"

interface Message {
  id: number
  text: string
  time: string
  sender: "user" | "bot"
  isRead?: boolean
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: "Gm Gm, Satoshi. I have been following your teachings and it's been really helpful to me. I do have a thing to suggest regarding one of your programs",
    time: "12:43 AM",
    sender: "user",
    isRead: true,
  },
  {
    id: 2,
    text: "Oh that's awesome. I'm glad my resources have been helpful and I'm open to helpful suggestions.",
    time: "12:45 AM",
    sender: "bot",
    isRead: true,
  },
]

function getTimeString(): string {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

const BOT_REPLIES = [
  "Thanks for reaching out! I'm here to help you with any questions about your courses.",
  "That's a great point. Let me look into that for you.",
  "I appreciate your feedback! We're always working to improve the platform.",
  "Sure thing! Feel free to share more details and I'll do my best to assist.",
  "Got it. I'll make a note of that suggestion for the team.",
]

export default function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(INITIAL_MESSAGES.length + 1)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text: string) => {
    const userMsg: Message = {
      id: nextId.current++,
      text,
      time: getTimeString(),
      sender: "user",
      isRead: true,
    }
    setMessages((prev) => [...prev, userMsg])

    // Simulate a bot reply after a short delay
    setTimeout(() => {
      const reply: Message = {
        id: nextId.current++,
        text: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)],
        time: getTimeString(),
        sender: "bot",
        isRead: true,
      }
      setMessages((prev) => [...prev, reply])
    }, 1200)
  }

  return (
    <div
      className="
        flex flex-col
        w-full max-w-[756px]
        h-[732px]
        mx-auto
        bg-[#101110]
        border border-[#252625]
        rounded-xl
        overflow-hidden
      "
    >
      {/* Header */}
      <ChatHeader />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 flex flex-col justify-end"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            time={msg.time}
            sender={msg.sender}
            isRead={msg.isRead}
          />
        ))}
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
