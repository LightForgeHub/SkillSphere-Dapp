"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/components/ui/utils"
import { QuestionData } from "./QuestionAnswerChat"

interface QuestionsSidebarProps {
  questions: QuestionData[]
  activeId: string
}

type Tab = "New" | "Archive"

export default function QuestionsSidebar({ questions, activeId }: QuestionsSidebarProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("New")

  // For demo: first 3 are "New", rest are "Archive"
  const filtered = questions.filter((_, i) => (activeTab === "New" ? i < 3 : i >= 3))

  return (
    <div className="flex flex-col w-full h-full border-[#252625] border-r  rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 border-b border-[#252625]">
        <h2 className="text-sm font-semibold text-white mb-3">Questions</h2>

        {/* Tabs */}
        <div className="flex gap-1">
          {(["New", "Archive"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-t-md transition-colors",
                activeTab === tab
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-500 text-center">No {activeTab.toLowerCase()} questions.</p>
        ) : (
          filtered.map((q) => {
            const isActive = q.id === activeId
            return (
              <button
                key={q.id}
                onClick={() => router.push(`/dashboard/notifications/questions/${q.id}`)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-4 text-left transition-colors",
                  isActive ? "bg-white/5" : "hover:bg-white/3"
                )}
              >
                {/* Avatar */}
                <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {q.learnerAvatarUrl ? (
                    <Image src={q.learnerAvatarUrl} alt={q.learnerName} width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    <Image src="/john.svg" alt="Learner" width={20} height={20} className="w-full h-full object-contain" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-medium text-white truncate">{q.learnerName}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{q.timestamp}</span>
                  </div>
                  <span className="text-[10px] text-[#3F8CFF] font-medium">{q.category}</span>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{q.question}</p>
                </div>

                {isActive && <div className="shrink-0 w-1 h-1 rounded-full bg-[#4ADE80] mt-1.5" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
