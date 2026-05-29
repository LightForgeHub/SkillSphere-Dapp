"use client"
import { useState } from "react"
import { Card } from "@/components/ui/Card"

interface AvailabilityToggleProps {
  initialAvailable?: boolean
  onChange?: (available: boolean) => void
}

export default function AvailabilityToggle({
  initialAvailable = false,
  onChange,
}: AvailabilityToggleProps) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable)

  const handleToggle = () => {
    const newState = !isAvailable
    setIsAvailable(newState)
    onChange?.(newState)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Availability Status</h3>
          <p className="text-sm text-slate-400">
            {isAvailable
              ? "You are currently available for sessions"
              : "You are currently unavailable"}
          </p>
        </div>

        <button
          onClick={handleToggle}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            isAvailable ? "bg-green-500/30" : "bg-slate-700/30"
          }`}
          aria-label="Toggle availability"
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              isAvailable ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isAvailable && (
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-400">
            ✓ Experts can see your profile and book sessions with you
          </p>
        </div>
      )}

      {!isAvailable && (
        <div className="mt-4 p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
          <p className="text-sm text-slate-400">
            No new session requests will be sent to you
          </p>
        </div>
      )}
    </Card>
  )
}
