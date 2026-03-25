import React from "react"
import { Users, GraduationCap } from "lucide-react"
import { cn } from "@/components/ui/utils"
import Image from "next/image"

export interface NotificationItemProps {
  id: string
  title: string
  subtitle: string
  timestamp: string
  icon?: React.ReactNode
  className?: string
}

export default function NotificationItem({
  title,
  subtitle,
  timestamp,
  icon,
  className,
}: NotificationItemProps) {
  return (
    <div className={cn("flex flex-wrap sm:flex-nowrap items-start gap-3 md:gap-4 py-4", className)}>
      {/* Icon/Avatar Container */}
      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
        {icon || <Image src={"/icons/learner.svg"} alt="Learner" width={20} height={20} className="md:w-6 md:h-6" />}
      </div>

      {/* Text Container */}
      <div className="flex-1 min-w-0 pt-0.5 md:pt-1">
        <h3 className="text-sm md:text-[15px] font-medium text-white truncate">{title}</h3>
        <p className="text-xs md:text-sm text-gray-400 truncate mt-0.5 md:mt-1">{subtitle}</p>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 pt-0.5 md:pt-1 hidden sm:block">
        <span className="text-xs md:text-sm text-gray-500">{timestamp}</span>
      </div>
      
      {/* Mobile-only inline timestamp if narrow */}
      <div className="sm:hidden w-full mt-1 pl-13 flex justify-end">
        <span className="text-xs text-gray-500">{timestamp}</span>
      </div>
    </div>
  )
}
