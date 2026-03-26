"use client"

import { cn } from "@/lib/utils"

export type TimeRange = "All-Time" | "Weekly" | "Monthly"

interface FilterTabsProps {
  tabs: TimeRange[]
  activeTab: TimeRange
  onTabChange: (tab: TimeRange) => void
  className?: string
}

export default function FilterTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: FilterTabsProps) {
  return (
    <div className={cn("flex gap-3 mb-8 flex-wrap sm:flex-nowrap", className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900",
            activeTab === tab
              ? "bg-[#1C1C1E] text-white ring-1 ring-[#2C2C2E]"
              : "text-slate-400 hover:text-white hover:bg-[#1C1C1E]/50"
          )}
          aria-pressed={activeTab === tab}
          role="tab"
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
