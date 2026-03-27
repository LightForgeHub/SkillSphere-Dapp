"use client"

import { ArrowLeft, Search, MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ChatHeader() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#252625]">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-[#C1C1C1] hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 ml-2">
          <span className="w-3 h-3 rounded-full bg-[#4ADE80] border-2 border-[#1A2E1A] flex-shrink-0" />
          <span className="text-sm font-medium text-white">Skillnet Chatbot</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button
          className="p-1.5 text-[#999999] hover:text-white transition-colors"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
        <button
          className="p-1.5 text-[#999999] hover:text-white transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  )
}
