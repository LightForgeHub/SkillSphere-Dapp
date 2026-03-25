import React from "react"
import { cn } from "@/components/ui/utils"

export type NotificationTabType = "New Learner" | "Questions" | "Payment" | "Announcements"

interface NotificationTabsProps {
  tabs: NotificationTabType[]
  activeTab: NotificationTabType
  onTabChange: (tab: NotificationTabType) => void
  className?: string
}

export default function NotificationTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: NotificationTabsProps) {
  return (
    <div 
      className={cn(
        "flex flex-row items-center gap-[17px] overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide pb-2 -mb-2", 
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors",
              isActive
                ? "bg-white/10 text-white font-medium"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
            aria-pressed={isActive}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
