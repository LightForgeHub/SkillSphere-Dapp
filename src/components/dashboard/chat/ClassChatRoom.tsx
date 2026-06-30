"use client"

import { useState, useRef, useEffect } from "react"
import ChatInput from "./ChatInput"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar"

interface Message {
  id: number
  text: string
  time: string
  sender: "user" | "other"
  name: string
  avatar: string
}

function getTimeString(): string {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    text: "Has anyone tried running the latest smart contract locally? I'm getting an error.",
    time: "10:00 AM",
    sender: "other",
    name: "Alice Web3",
    avatar: "https://i.pravatar.cc/150?u=alice",
  },
  {
    id: 2,
    text: "Yes, you need to update to the latest node version. I had the same issue yesterday.",
    time: "10:05 AM",
    sender: "other",
    name: "Bob Builder",
    avatar: "https://i.pravatar.cc/150?u=bob",
  },
]

export default function ClassChatRoom() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(3)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text: string) => {
    const newMsg: Message = {
      id: nextId.current++,
      text,
      time: getTimeString(),
      sender: "user",
      name: "You",
      avatar: "https://i.pravatar.cc/150?u=you", // Mock user avatar
    }
    setMessages((prev) => [...prev, newMsg])
  }

  return (
    <div className="flex flex-col w-full h-[600px] max-h-full bg-background border border-[#252625] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#252625] bg-card">
        <h3 className="text-sm font-medium text-foreground">Class Chat</h3>
        <p className="text-xs text-muted-foreground">Ask questions and discuss with peers</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === "user"
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <Avatar className="w-8 h-8 flex-shrink-0 border border-[#252625]">
                <AvatarImage src={msg.avatar} alt={msg.name} />
                <AvatarFallback>{msg.name.charAt(0)}</AvatarFallback>
              </Avatar>

              {/* Message Content */}
              <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%] md:max-w-[70%]`}>
                {/* Name & Time */}
                <div className={`flex items-center gap-2 mb-1 ${isUser ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs font-medium text-foreground">{msg.name}</span>
                  <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                </div>

                {/* Bubble */}
                <div
                  className={`p-3 rounded-xl text-sm leading-[1.6] text-[#D4D4D4] ${
                    isUser
                      ? "bg-[#2D3B2D] rounded-tr-sm"
                      : "bg-card rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
