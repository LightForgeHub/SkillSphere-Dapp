"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/components/ui/utils"
import Toast from "@/components/ui/Toast"

interface CopyButtonProps {
  text: string
  displayText?: string
  className?: string
  tooltipPosition?: "top" | "bottom"
  ariaLabel?: string
}

export default function CopyButton({
  text,
  displayText,
  className,
  tooltipPosition = "top",
  ariaLabel,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setShowToast(true)
      setTimeout(() => setCopied(false), 1500)
      setTimeout(() => setShowToast(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setShowToast(true)
      setTimeout(() => setCopied(false), 1500)
      setTimeout(() => setShowToast(false), 2000)
    }
  }

  return (
    <>
      <div className="relative inline-flex">
        <button
          onClick={handleCopy}
          className={cn(
            "text-gray-400 hover:text-white transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded",
            className
          )}
          aria-label={ariaLabel || `Copy ${displayText || text}`}
          title={copied ? "Copied!" : "Copy."}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        {/* Tooltip */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap transition-opacity duration-200 pointer-events-none",
            "z-50 border border-gray-700",
            copied ? "opacity-100" : "opacity-0",
            tooltipPosition === "top" ? "-top-8" : "top-8"
          )}
          role="tooltip"
        >
          {copied ? "Copied!" : "Copy."}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && <Toast message="Transaction ID copied to clipboard!" duration={2000} />}
    </>
  )
}
