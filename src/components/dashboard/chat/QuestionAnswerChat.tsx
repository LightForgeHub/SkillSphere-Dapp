"use client"

import { useState, useRef, useEffect } from "react"
import QuestionAnswerHeader from "./QuestionAnswerHeader"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"

export interface QuestionData {
  id: string
  learnerName: string
  learnerAvatarUrl?: string
  category: string
  question: string
  timestamp: string
}

interface Message {
  id: number
  text: string
  time: string
  sender: "user" | "bot"
  isRead?: boolean
}

function getTimeString(): string {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

interface QuestionAnswerChatProps {
  questionData: QuestionData
}

export default function QuestionAnswerChat({ questionData }: QuestionAnswerChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: questionData.question,
      time: questionData.timestamp,
      sender: "bot",
      isRead: true,
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(2)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text: string) => {
    const msg: Message = {
      id: nextId.current++,
      text,
      time: getTimeString(),
      sender: "user",
      isRead: true,
    }
    setMessages((prev) => [...prev, msg])
  }

  return (
    <div className="flex flex-col w-full max-w-[756px] mx-auto bg-[#101110] border border-[#252625] rounded-xl overflow-hidden h-[calc(100vh-220px)] min-h-[480px]">
      <QuestionAnswerHeader
        learnerName={questionData.learnerName}
        learnerAvatarUrl={questionData.learnerAvatarUrl}
        category={questionData.category}
        question={questionData.question}
        timestamp={questionData.timestamp}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 flex flex-col"
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

      <ChatInput onSend={handleSend} />
    </div>
  )
}
