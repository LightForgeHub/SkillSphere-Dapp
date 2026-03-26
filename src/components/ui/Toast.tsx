"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/components/ui/utils"

interface ToastProps {
  message: string
  duration?: number
  className?: string
}

export default function Toast({
  message,
  duration = 2000,
  className,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "animate-in slide-in-from-bottom-4 duration-300",
        "animate-out slide-out-to-bottom-4 duration-300"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg",
          "bg-gradient-to-r from-green-500/90 to-emerald-500/90",
          "text-white text-sm font-medium",
          "shadow-lg backdrop-blur-sm",
          "border border-green-400/20",
          className
        )}
      >
        <Check className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  )
}
