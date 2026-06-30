"use client"
import { useState } from "react"

export default function ExpertStats() {
  const [isAvailable, setIsAvailable] = useState(false)

  const handleToggle = () => {
    // Simulated on-chain heartbeat update
    setIsAvailable(!isAvailable)
  }

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isAvailable ? "bg-green-500" : "bg-gray-500"
          }`}
        />
        <span className="text-sm font-medium text-slate-200">
          {isAvailable ? "Available Now" : "Offline"}
        </span>
      </div>
      <button
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isAvailable ? "bg-green-500/30" : "bg-slate-700"
        }`}
        aria-label="Toggle availability"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isAvailable ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}
