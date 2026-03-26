import React from "react"
import { Wallet } from "lucide-react"
import { cn } from "@/components/ui/utils"

export interface PaymentNotificationItemProps {
  id: string
  amount: string
  source: string
  timestamp: string
  className?: string
}

export default function PaymentNotificationItem({
  amount,
  source,
  timestamp,
  className,
}: PaymentNotificationItemProps) {
  return (
    <div 
      className={cn(
        "flex flex-row items-center justify-between gap-4 py-4 w-full", 
        className
      )}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Wallet Icon Wrapper */}
        <div className="shrink-0 w-12 h-12 rounded-full bg-[#1C1628] md:bg-white/5 flex items-center justify-center border border-white/5">
          <Wallet className="w-5 h-5 text-gray-200" />
        </div>

        {/* Text Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-[15px] font-medium text-gray-200 truncate">
            {amount} was paid to your account by {source}
          </p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="shrink-0 ml-2 sm:ml-4">
        <span className="text-xs md:text-sm text-gray-400 whitespace-nowrap">
          {timestamp}
        </span>
      </div>
    </div>
  )
}
