"use client"

import React, { memo } from "react"
import { Edit2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar"
import CopyButton from "@/components/ui/CopyButton"
import { cn } from "@/components/ui/utils"

interface ProfileHeaderProps {
  name?: string
  role?: string
  avatarUrl?: string
  walletAddress?: string
  onEdit?: () => void
  className?: string
}

function ProfileHeader({
  name,
  role,
  avatarUrl,
  walletAddress,
  onEdit,
  className,
}: ProfileHeaderProps) {
  // Generate initials from name for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Format wallet address for display
  const formatWalletAddress = (address?: string): string => {
    if (!address) return ""
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const initials = getInitials(name)
  const formattedWallet = formatWalletAddress(walletAddress)

  return (
    <div className={cn("flex flex-col gap-8 mb-12", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-2 border-white/10">
              <AvatarImage
                src={avatarUrl}
                alt={name || "Profile"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-blue-400 text-white text-2xl md:text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name, Role, and Actions */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {name || "Unknown User"}
              </h1>
              {role && (
                <>
                  <span className="text-white/20 hidden md:block">|</span>
                  <span className="text-sm md:text-base text-white/60 font-medium">
                    {role}
                  </span>
                </>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-xl border-white/10 hover:bg-white/5 gap-2 text-white/80"
                  onClick={onEdit}
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              )}
              
              {walletAddress && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
                  <span className="text-xs text-white/40 font-mono">
                    {formattedWallet}
                  </span>
                  <CopyButton
                    text={walletAddress}
                    displayText={formattedWallet}
                    className="text-white/40 hover:text-white"
                    ariaLabel="Copy wallet address"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(ProfileHeader)
