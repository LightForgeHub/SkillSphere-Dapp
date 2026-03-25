import React from "react"
import Image from "next/image"
import { cn } from "@/components/ui/utils"
import { Button } from "@/components/ui/Button"

export interface QuestionNotificationItemProps {
  id: string
  timestamp: string
  category: string
  question: string
  avatarUrl?: string
  className?: string
  onAnswer?: (id: string) => void
}

export default function QuestionNotificationItem({
  id,
  timestamp,
  category,
  question,
  avatarUrl,
  className,
  onAnswer,
}: QuestionNotificationItemProps) {
  return (
    <div 
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 w-full", 
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt="User Avatar" 
              width={48} 
              height={48} 
              className="w-full h-full object-cover"
            />
          ) : (
            <Image 
              src={"/john.svg"} 
              alt="Learner Default Avatar" 
              width={24} 
              height={24} 
              className="w-full h-full object-contain" 
            />
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
            <span>Asked {timestamp}</span>
            <span className="w-[1px] h-3 md:h-3.5 bg-gray-600/50"></span>
            <span className="text-[#3F8CFF] font-medium">{category}</span>
          </div>
          <p className="text-sm md:text-[15px] font-medium text-white line-clamp-2 md:line-clamp-1">
            {question}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0 sm:ml-4 align-self-end sm:align-self-center mt-2 sm:mt-0">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onAnswer?.(id)}
          className="border-white/10 hover:bg-white/5 hover:border-white/20 transition-colors hidden sm:inline-flex"
        >
          Answer Question
        </Button>
        <Button 
          variant="outline" 
          size="default" 
          onClick={() => onAnswer?.(id)}
          className="w-full border-white/10 hover:bg-white/5 hover:border-white/20 transition-colors sm:hidden"
        >
          Answer Question
        </Button>
      </div>
    </div>
  )
}
