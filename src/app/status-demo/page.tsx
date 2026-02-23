import React from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const mockTickets = [
    {
        id: "TICK-001",
        category: "Technical Support",
        status: "resolved",
        updatedAt: "2024-02-23",
    },
    {
        id: "TICK-002",
        category: "Payment Issue",
        status: "pending",
        updatedAt: "2024-02-22",
    },
    {
        id: "TICK-003",
        category: "Course Access",
        status: "completed",
        updatedAt: "2024-02-21",
    },
    {
        id: "TICK-004",
        category: "General Inquiry",
        status: "new", // Test default/fallback
        updatedAt: "2024-02-20",
    },
];

export default function StatusDemoPage() {
    return (
        <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Status Badge Demo</h1>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/10 text-white/70">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Ticket ID</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Last Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {mockTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-medium">{ticket.id}</td>
                                    <td className="px-6 py-4 text-white/70">{ticket.category}</td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge status={ticket.status} />
                                    </td>
                                    <td className="px-6 py-4 text-white/50">{ticket.updatedAt}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 space-y-4">
                    <h2 className="text-xl font-semibold">Standalone Variants</h2>
                    <div className="flex gap-4 items-center">
                        <StatusBadge status="resolved" />
                        <StatusBadge status="pending" />
                        <StatusBadge status="completed" />
                        <StatusBadge status="custom-fallback" />
                    </div>
                </div>
            </div>
        </div>
    );
}
