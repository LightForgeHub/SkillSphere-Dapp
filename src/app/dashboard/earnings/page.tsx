"use client"

import { useState } from "react"
import { Percent } from "lucide-react"
import { cn } from "@/lib/utils"
import EarningsTable from "@/components/dashboard/EarningsTable"

const EARNINGS_DATA = {
  "All-Time": "$1,500",
  "Weekly": "$450",
  "Monthly": "$1,200"
}

export default function EarningsPage() {
  const [duration, setDuration] = useState<keyof typeof EARNINGS_DATA>("All-Time")

  return (
    <div className="p-2">


      {/* Time Duration Tabs */}
      <div className="flex gap-4 mb-8">
        {(Object.keys(EARNINGS_DATA) as (keyof typeof EARNINGS_DATA)[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setDuration(tab)}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
              duration === tab
                ? "bg-[#1C1C1E] text-white ring-1 ring-[#2C2C2E]"
                : "text-slate-400 hover:text-white hover:bg-[#1C1C1E]/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Earnings Card */}
      <div className="w-full max-w-md bg-[#111113] rounded-2xl p-8 border border-[#1C1C1E] flex items-center gap-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#1E2D3D] flex items-center justify-center">
          <Percent className="w-8 h-8 text-[#3B82F6]" />
        </div>

        <div className="flex flex-col">
          <span className="text-4xl font-bold text-white tracking-tight">
            {EARNINGS_DATA[duration]}
          </span>
          <span className="text-slate-400 text-sm mt-1">Total Earnings</span>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="mt-12">
        <EarningsTable />
      </div>
    </div>
  )
}
