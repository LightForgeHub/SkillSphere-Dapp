"use client"

import { useMemo, useState } from "react"
import { Percent } from "lucide-react"
import EarningsTable, { EarningTransaction } from "@/components/dashboard/EarningsTable"
import FilterTabs, { TimeRange } from "@/components/dashboard/FilterTabs"

const EARNINGS_DATA: Record<TimeRange, string> = {
  "All-Time": "$1,500",
  "Weekly": "$450",
  "Monthly": "$1,200",
}

const TAB_OPTIONS: TimeRange[] = ["All-Time", "Weekly", "Monthly"]

// All transactions with dates
const ALL_TRANSACTIONS: EarningTransaction[] = [
  {
    sn: 1,
    transactionId: "0xe46d0b1039a8f97df2800a4c12b8e3a7f6d9e1b0",
    amount: "$15",
    date: "12th Jan, 2025",
  },
  {
    sn: 2,
    transactionId: "0xe46d0b1039a8f97df2800a4c12b8e3a7f6d9e1b0",
    amount: "$15",
    date: "12th Jan, 2025",
  },
  {
    sn: 3,
    transactionId: "0xe46d0b1039a8f97df2800a4c12b8e3a7f6d9e1b0",
    amount: "$15",
    date: "12th Jan, 2025",
  },
  {
    sn: 4,
    transactionId: "0xa91f3c7e2d4b08165ef3920dc7a8b5e10f6d42c3",
    amount: "$25",
    date: "5th Feb, 2025",
  },
  {
    sn: 5,
    transactionId: "0xb72e8d5f1a3c964027de481bc90a6f7e23d58b14",
    amount: "$40",
    date: "18th Feb, 2025",
  },
]

function getFilteredTransactions(
  transactions: EarningTransaction[],
  timeRange: TimeRange
): EarningTransaction[] {
  if (timeRange === "All-Time") {
    return transactions
  }

  // Parse date string and check if it's within range
  const parseDate = (dateStr: string): Date => {
    // Parse format like "12th Jan, 2025"
    // Remove ordinal suffix (st, nd, rd, th)
    const cleanedDate = dateStr.replace(/(\d+)(st|nd|rd|th)/, "$1")
    const date = new Date(cleanedDate)
    return date
  }

  const now = new Date("2025-02-20") // Reference date for filtering
  const daysToSubtract = timeRange === "Weekly" ? 7 : 30

  return transactions.filter((tx) => {
    const txDate = parseDate(tx.date)
    const daysDiff = Math.floor(
      (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysDiff <= daysToSubtract
  })
}

function calculateTotalEarnings(transactions: EarningTransaction[]): string {
  const total = transactions.reduce((sum, tx) => {
    const amount = parseFloat(tx.amount.replace("$", ""))
    return sum + amount
  }, 0)
  return `$${total}`
}

export default function EarningsPage() {
  const [duration, setDuration] = useState<TimeRange>("All-Time")

  const filteredTransactions = useMemo(
    () => getFilteredTransactions(ALL_TRANSACTIONS, duration),
    [duration]
  )

  const totalEarnings = useMemo(
    () => calculateTotalEarnings(filteredTransactions),
    [filteredTransactions]
  )

  return (
    <div className="p-2">
      {/* Time Duration Filter Tabs */}
      <FilterTabs
        tabs={TAB_OPTIONS}
        activeTab={duration}
        onTabChange={setDuration}
      />

      {/* Earnings Card */}
      <div className="w-full max-w-md bg-[#111113] rounded-2xl p-8 border border-[#1C1C1E] flex items-center gap-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#1E2D3D] flex items-center justify-center">
          <Percent className="w-8 h-8 text-[#3B82F6]" />
        </div>

        <div className="flex flex-col">
          <span className="text-4xl font-bold text-white tracking-tight">
            {totalEarnings}
          </span>
          <span className="text-slate-400 text-sm mt-1">Total Earnings</span>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="mt-12">
        <EarningsTable transactions={filteredTransactions} />
      </div>
    </div>
  )
}
