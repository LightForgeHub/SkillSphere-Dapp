"use client"
import React from "react"
import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { cn } from "@/components/ui/utils"

interface MetricCardProps {
  icon: LucideIcon
  value: string
  label: string
  iconColor?: string
  iconBgColor?: string
  className?: string
}

export default function MetricCard({
  icon: Icon,
  value,
  label,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("p-6 flex items-center space-x-4", className)}>
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
