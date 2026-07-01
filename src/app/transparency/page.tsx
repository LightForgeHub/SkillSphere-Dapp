import React from "react"

const ADMIN_EVENTS = [
  {
    id: "1",
    timestamp: "2024-06-25T14:30:00Z",
    action: "Set Platform Fee",
    details: "Fee updated to 2.5%",
    caller: "GBXYZ...ABCD",
    txHash: "9a8b7c6d5e4f3a2b1c0d...",
  },
  {
    id: "2",
    timestamp: "2024-06-20T09:15:00Z",
    action: "Pause Contract",
    details: "Emergency pause activated",
    caller: "GBXYZ...ABCD",
    txHash: "1a2b3c4d5e6f7a8b9c0d...",
  },
  {
    id: "3",
    timestamp: "2024-06-21T10:00:00Z",
    action: "Unpause Contract",
    details: "Operations resumed",
    caller: "GBXYZ...ABCD",
    txHash: "fedcba0987654321...",
  },
]

export default function TransparencyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Transparency Audit Log</h1>
        <p className="text-slate-400">
          Public record of all admin actions and protocol parameter changes on the SkillSphere smart contracts.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-slate-300 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Caller</th>
                <th className="px-6 py-4 font-semibold">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {ADMIN_EVENTS.map((event) => (
                <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{event.action}</div>
                    <div className="text-xs text-slate-500 mt-1">{event.details}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                      {event.caller}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-slate-300">
                      {event.txHash}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
