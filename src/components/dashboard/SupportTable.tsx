"use client"

import { StatusBadge } from "@/components/ui/StatusBadge"
import { cn } from "@/components/ui/utils"

export interface SupportTicket {
  sn: number
  dateTime: string
  ticketId: string
  issueCategory: string
  status: "resolved" | "pending" | "completed"
  lastUpdate: string
}

interface SupportTableProps {
  tickets?: SupportTicket[]
  className?: string
}

const mockTickets: SupportTicket[] = [
  {
    sn: 1,
    dateTime: "12th Dec, 2025",
    ticketId: "#12345",
    issueCategory: "Payment Issue",
    status: "resolved",
    lastUpdate: "2025-02-19",
  },
  {
    sn: 2,
    dateTime: "12th Dec, 2025",
    ticketId: "#67890",
    issueCategory: "Course Upload Error",
    status: "pending",
    lastUpdate: "2025-02-17",
  },
  {
    sn: 3,
    dateTime: "12th Dec, 2025",
    ticketId: "#24680",
    issueCategory: "Student Dispute",
    status: "completed",
    lastUpdate: "2025-02-16",
  },
]

export default function SupportTable({ tickets = mockTickets, className }: SupportTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: Card Layout */}
      <div className="block md:hidden space-y-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.ticketId}
            className="bg-[#110719] rounded-lg border border-white/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Ticket ID</span>
              <span className="text-sm text-gray-400 font-mono">{ticket.ticketId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">SN</span>
              <span className="text-sm text-gray-400">{ticket.sn}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Date & Time</span>
              <span className="text-sm text-gray-400">{ticket.dateTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Issue Category</span>
              <span className="text-sm text-gray-400">{ticket.issueCategory}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Status</span>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase">Last Update</span>
              <span className="text-sm text-gray-400">{ticket.lastUpdate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block overflow-x-auto -mx-6 lg:mx-0">
        <div className="inline-block min-w-full align-middle px-6 lg:px-0">
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th
                    scope="col"
                    className="py-3 px-3 lg:px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    SN
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 lg:px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Date & Time
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 lg:px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Ticket ID
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 lg:px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Issue Category
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 lg:px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 lg:px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    Last Update
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#110719] divide-y divide-white/5">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.ticketId}
                    className="transition-colors hover:bg-white/5 cursor-pointer"
                  >
                    <td className="py-4 px-3 lg:px-4 whitespace-nowrap text-sm text-gray-400">
                      {ticket.sn}
                    </td>
                    <td className="py-4 px-3 lg:px-4 whitespace-nowrap text-sm text-gray-400">
                      {ticket.dateTime}
                    </td>
                    <td className="py-4 px-3 lg:px-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                      {ticket.ticketId}
                    </td>
                    <td className="py-4 px-3 lg:px-4 whitespace-nowrap text-sm text-gray-400">
                      {ticket.issueCategory}
                    </td>
                    <td className="py-4 px-3 lg:px-4 whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="py-4 px-3 lg:px-4 whitespace-nowrap text-sm text-gray-400">
                      {ticket.lastUpdate}
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
