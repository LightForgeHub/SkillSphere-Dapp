"use client"
import { Percent, Briefcase, MessageSquare } from "lucide-react"
import MetricCard from "@/components/dashboard/MetricCard"
import QuickActions from "@/components/dashboard/QuickActions"

export default function DashboardHome() {
  const metrics = [
    {
      label: "Total Earnings",
      value: "$1,500",
      icon: Percent,
      iconColor: "text-[#22d3ee]",
      iconBgColor: "bg-[#22d3ee]/10",
    },
    {
      label: "Number of Enrolled Students",
      value: "12",
      icon: Briefcase,
      iconColor: "text-[#9d50ff]",
      iconBgColor: "bg-[#9d50ff]/10",
    },
    {
      label: "Total Courses Published",
      value: "12",
      icon: Briefcase,
      iconColor: "text-[#9d50ff]",
      iconBgColor: "bg-[#9d50ff]/10",
    },
    {
      label: "Messages",
      value: "10+",
      icon: MessageSquare,
      iconColor: "text-[#ffa500]",
      iconBgColor: "bg-[#ffa500]/10",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            iconColor={metric.iconColor}
            iconBgColor={metric.iconBgColor}
          />
        ))}
      </div>

      <QuickActions />
    </div>
  )
}
