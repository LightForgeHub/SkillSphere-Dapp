"use client"

import React, { useState } from "react"
import { TrendingUp, Wallet, Activity, ArrowUpRight } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { cn } from "@/components/ui/utils"

const weeklyVolume = [
  { name: "Mon", volume: 2400 },
  { name: "Tue", volume: 1398 },
  { name: "Wed", volume: 3800 },
  { name: "Thu", volume: 3908 },
  { name: "Fri", volume: 4800 },
  { name: "Sat", volume: 3800 },
  { name: "Sun", volume: 4300 },
]

const monthlyVolume = [
  { name: "Jan", volume: 4000 },
  { name: "Feb", volume: 3000 },
  { name: "Mar", volume: 5000 },
  { name: "Apr", volume: 4500 },
  { name: "May", volume: 6000 },
  { name: "Jun", volume: 5500 },
  { name: "Jul", volume: 7000 },
  { name: "Aug", volume: 6500 },
  { name: "Sep", volume: 8000 },
  { name: "Oct", volume: 7500 },
  { name: "Nov", volume: 9000 },
  { name: "Dec", volume: 8500 },
]

function MetricCard({
  icon: Icon,
  value,
  label,
  iconColor,
  iconBgColor,
}: {
  icon: React.ElementType
  value: string
  label: string
  iconColor?: string
  iconBgColor?: string
}) {
  return (
    <Card className="p-6 flex items-center space-x-4">
      <div className={cn("p-3 rounded-full flex-shrink-0", iconBgColor)}>
        <Icon className={cn("size-6", iconColor)} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
    </Card>
  )
}

export default function PlatformStats() {
  const [view, setView] = useState<"weekly" | "monthly">("monthly")

  const data = view === "weekly" ? weeklyVolume : monthlyVolume

  return (
    <section className="w-full px-4 py-12 md:px-8 lg:px-16 xl:px-24">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#9B59FF1F] rounded-xl flex items-center justify-center">
              <TrendingUp className="text-[#9B59FF] size-5" />
            </div>
            <h1 className="text-3xl font-space-grotesk md:text-4xl font-bold">
              Platform Stats
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setView("weekly")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                view === "weekly"
                  ? "bg-[#9B59FF] text-white shadow-lg shadow-[#9B59FF]/25"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setView("monthly")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                view === "monthly"
                  ? "bg-[#9B59FF] text-white shadow-lg shadow-[#9B59FF]/25"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <MetricCard
            icon={Wallet}
            value="$124,592"
            label="Total Transaction Volume"
            iconColor="text-emerald-400"
            iconBgColor="bg-emerald-400/10"
          />
          <MetricCard
            icon={Activity}
            value="2,847"
            label="Total Transactions"
            iconColor="text-blue-400"
            iconBgColor="bg-blue-400/10"
          />
          <MetricCard
            icon={ArrowUpRight}
            value="+12.5%"
            label="Growth Rate"
            iconColor="text-amber-400"
            iconBgColor="bg-amber-400/10"
          />
        </div>

        <Card variant="glow" className="w-full">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              {view === "weekly" ? "Weekly" : "Monthly"} Transaction Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                {view === "weekly" ? (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 15, 15, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      cursor={{ fill: "rgba(155, 89, 255, 0.1)" }}
                    />
                    <Bar dataKey="volume" fill="#9B59FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9B59FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#9B59FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 15, 15, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#9B59FF"
                      strokeWidth={2}
                      fill="url(#volumeGradient)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
