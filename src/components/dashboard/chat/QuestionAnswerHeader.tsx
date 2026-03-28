"use client"

import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface QuestionAnswerHeaderProps {
  learnerName: string
  learnerAvatarUrl?: string
  category: string
  question: string
  timestamp: string
}

export default function QuestionAnswerHeader({
  learnerName,
  learnerAvatarUrl,
  category,
  question,
  timestamp,
}: QuestionAnswerHeaderProps) {
  const router = useRouter()

  return (
    <div className="border-b border-[#252625]">
      {/* Top bar: back + meta */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[#C1C1C1] hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs text-gray-500">{timestamp}</span>
      </div>

      {/* Question context */}
      <div className="flex items-start gap-3 px-4 sm:px-6 pb-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
          {learnerAvatarUrl ? (
            <Image
              src={learnerAvatarUrl}
              alt={learnerName}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src="/john.svg"
              alt="Learner"
              width={24}
              height={24}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Name + category + question */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{learnerName}</span>
            <span className="w-[1px] h-3 bg-gray-600/50" />
            <span className="text-xs text-[#3F8CFF] font-medium">{category}</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{question}</p>
        </div>
      </div>
    </div>
  )
}
