import React from "react"
import { Megaphone } from "lucide-react"
import { cn } from "@/components/ui/utils"

export interface AnnouncementNotificationItemProps {
  id: string
  title: string
  description: string
  className?: string
}

export default function AnnouncementNotificationItem({
  title,
  description,
  className,
}: AnnouncementNotificationItemProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-4 md:p-6 rounded-xl bg-white/5 border border-white/10 w-full hover:bg-white/[0.07] transition-colors", 
        className
      )}
    >
      {/* Icon Wrapper */}
      <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
        <Megaphone className="w-5 h-5 md:w-6 md:h-6 text-gray-200" />
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="text-sm md:text-lg font-semibold text-white truncate">
          {title}
        </h3>
        <p className="text-xs md:text-base text-gray-400">
          {description}
        </p>
      </div>
    </div>
  )
}
