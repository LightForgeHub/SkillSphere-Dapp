"use client"

import { Copy, Check } from "lucide-react"
import { cn } from "@/components/ui/utils"
import CopyButton from "@/components/ui/CopyButton"

export interface EarningTransaction {
  sn: number
  transactionId: string
  amount: string
  date: string
}

interface EarningsTableProps {
  transactions?: EarningTransaction[]
  className?: string
}

const mockTransactions: EarningTransaction[] = [
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

function truncateId(id: string): string {
  if (id.length <= 24) return id
  return id.slice(0, 24) + "…"
}

export default function EarningsTable({
  transactions = mockTransactions,
  className,
}: EarningsTableProps) {

  return (
    <div className={cn("flex flex-col items-start gap-3 w-full", className)}>
      {/* Title */}
      <h2 className="text-lg font-semibold text-white">Payment History</h2>

      {/* Mobile: Card Layout */}
      <div className="block md:hidden w-full space-y-4">
        {transactions.map((tx) => (
          <div
            key={`${tx.transactionId}-${tx.sn}`}
            className="bg-[#110719] rounded-lg border border-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">SN</span>
              <span className="text-sm text-gray-400">{tx.sn}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-300 uppercase">Transaction ID</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-400 font-mono truncate">
                  {truncateId(tx.transactionId)}
                </span>
                <CopyButton
                  text={tx.transactionId}
                  displayText={truncateId(tx.transactionId)}
                  ariaLabel={`Copy transaction ID ${tx.transactionId}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Amount</span>
              <span className="text-sm text-gray-400">{tx.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Date</span>
              <span className="text-sm text-gray-400">{tx.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block overflow-x-auto w-full">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    SN
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Transaction ID
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#110719] divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr
                    key={`${tx.transactionId}-${tx.sn}`}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-400">
                      {tx.sn}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{truncateId(tx.transactionId)}</span>
                        <CopyButton
                          text={tx.transactionId}
                          displayText={truncateId(tx.transactionId)}
                          ariaLabel={`Copy transaction ID ${tx.transactionId}`}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-400">
                      {tx.amount}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-400">
                      {tx.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
