"use client"

interface MessageBubbleProps {
  text: string
  time: string
  sender: "user" | "bot"
  isRead?: boolean
}

export default function MessageBubble({ text, time, sender, isRead = false }: MessageBubbleProps) {
  const isUser = sender === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[420px] rounded-xl px-4 py-3
          ${isUser
            ? "bg-[#2D3B2D] rounded-br-sm"
            : "bg-[#1A1B1A] rounded-bl-sm"
          }
        `}
      >
        <p className="text-sm leading-[1.6] text-[#D4D4D4]">{text}</p>

        <div className={`flex items-center gap-1.5 mt-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] text-[#7A7A7A]">{time}</span>

          {isRead && (
            <svg
              width="16"
              height="10"
              viewBox="0 0 16 10"
              fill="none"
              className="text-[#4ADE80] flex-shrink-0"
            >
              <path
                d="M1 5.5L4 8.5L10 1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 5.5L9 8.5L15 1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
