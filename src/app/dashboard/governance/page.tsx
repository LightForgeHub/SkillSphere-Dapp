"use client"

import { useState } from "react"
import { Wallet, Trophy, Lock, Zap, Calendar, ArrowRight, Coins } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/Separator"
import { cn } from "@/components/ui/utils"

type LockupPeriod = 30 | 90 | 365

const LOCKUP_OPTIONS: { days: LockupPeriod; label: string; multiplier: number }[] = [
  { days: 30, label: "30 Days", multiplier: 1 },
  { days: 90, label: "90 Days", multiplier: 1.5 },
  { days: 365, label: "365 Days", multiplier: 3 },
]

const MOCK_UNCLAIMED_REWARDS = 2450
const MOCK_STAKED_BALANCE = 8500

function calculateVotingWeight(
  amount: number,
  lockupDays: LockupPeriod
): { raw: number; boosted: number; multiplier: number } {
  const option = LOCKUP_OPTIONS.find((o) => o.days === lockupDays)!
  const raw = amount
  const boosted = raw * option.multiplier
  return { raw, boosted, multiplier: option.multiplier }
}

export default function GovernancePage() {
  const [unclaimedRewards] = useState(MOCK_UNCLAIMED_REWARDS)
  const [stakedBalance] = useState(MOCK_STAKED_BALANCE)
  const [lockupDays, setLockupDays] = useState<LockupPeriod>(30)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [lockAmount, setLockAmount] = useState("")
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)

  const votingWeight = calculateVotingWeight(
    parseFloat(lockAmount) || stakedBalance,
    lockupDays
  )

  const handleClaimAll = async () => {
    if (unclaimedRewards <= 0) return
    setIsClaiming(true)
    await new Promise((r) => setTimeout(r, 2000))
    setClaimTxHash("0x" + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join(""))
    setIsClaiming(false)
  }

  const handleLockTokens = async () => {
    const amount = parseFloat(lockAmount)
    if (isNaN(amount) || amount <= 0 || amount > stakedBalance) return
    setIsLocking(true)
    await new Promise((r) => setTimeout(r, 2000))
    setIsLocking(false)
    setLockAmount("")
  }

  return (
    <div className="p-2 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Governance Token Manager</h1>
        <p className="text-white/60 text-sm">
          Claim and lock your governance tokens to participate in protocol decisions
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unclaimed Rewards */}
        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Unclaimed Rewards Balance</p>
              <h3 className="text-2xl font-bold text-white">
                {unclaimedRewards.toLocaleString()} SKILL
              </h3>
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Ready to claim
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/20">
              <Coins className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </Card>

        {/* Voting Weight */}
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Current Voting Weight</p>
              <h3 className="text-2xl font-bold text-white">
                {votingWeight.boosted.toLocaleString()} vSKILL
              </h3>
              <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {votingWeight.multiplier}x lockup multiplier
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Staked Balance */}
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Staked Balance</p>
              <h3 className="text-2xl font-bold text-white">
                {stakedBalance.toLocaleString()} SKILL
              </h3>
              <p className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked in governance
              </p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/20">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Claim Section */}
      <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Claim Rewards</h3>
            <p className="text-sm text-white/60">
              {unclaimedRewards.toLocaleString()} SKILL available to claim
            </p>
          </div>
          <Button
            onClick={handleClaimAll}
            disabled={isClaiming || unclaimedRewards <= 0}
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            {isClaiming ? "Claiming..." : "Claim All"}
          </Button>
        </div>

        {claimTxHash && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Successfully claimed! TX:{" "}
              <span className="font-mono text-xs">{claimTxHash.slice(0, 18)}...</span>
            </p>
          </div>
        )}
      </Card>

      {/* Lock & Vote Section */}
      <Card className="p-6 bg-[#1A1520] border-white/10">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Lock Tokens for Voting Power</CardTitle>
          <CardDescription>
            Lock your SKILL tokens to receive voting weight (vSKILL) with multiplier bonuses
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 pb-0 space-y-6">
          {/* Lockup Period Select */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Lockup Period
            </label>
            <div className="grid grid-cols-3 gap-3">
              {LOCKUP_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setLockupDays(option.days)}
                  className={cn(
                    "relative py-3 rounded-lg font-medium transition-all text-center",
                    lockupDays === option.days
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      : "bg-purple-600/10 border border-purple-500/30 hover:border-purple-500/60"
                  )}
                >
                  <span className="block">{option.label}</span>
                  <span className="block text-xs mt-1 opacity-80">
                    {option.multiplier}x multiplier
                  </span>
                  {lockupDays === option.days && (
                    <Badge
                      variant="default"
                      className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 bg-white/20"
                    >
                      Active
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Amount to Lock
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Enter SKILL amount"
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                className="flex-1 bg-[#0A050E] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                min="0"
                max={stakedBalance}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLockAmount(stakedBalance.toString())}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                MAX
              </Button>
              <span className="text-white/60 text-sm whitespace-nowrap">SKILL</span>
            </div>
          </div>

          {/* Voting Weight Preview */}
          <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Voting Weight Calculation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Raw Balance</span>
                <span>{votingWeight.raw.toLocaleString()} SKILL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Lockup Multiplier</span>
                <span className="text-purple-400">{votingWeight.multiplier}x</span>
              </div>
              <Separator className="bg-purple-500/20" />
              <div className="flex justify-between font-bold text-white">
                <span>Voting Weight (vSKILL)</span>
                <span className="text-purple-400">
                  {votingWeight.boosted.toLocaleString()} vSKILL
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-white/40 mt-2">
              <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Tokens locked for {lockupDays} days. Early unlock penalties apply.
              </span>
            </div>
          </div>

          <Button
            onClick={handleLockTokens}
            disabled={
              isLocking ||
              !lockAmount ||
              parseFloat(lockAmount) <= 0 ||
              parseFloat(lockAmount) > stakedBalance
            }
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {isLocking ? (
              "Locking..."
            ) : (
              <>
                Lock &amp; Boost Voting Power
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-[#1A1520] border-white/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 shrink-0">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Voting Power</h4>
              <p className="text-xs text-white/60">
                Locked tokens grant you voting rights proportional to your vSKILL balance.
                Longer lockup periods yield higher multipliers.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-[#1A1520] border-white/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 shrink-0">
              <Coins className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Rewards Distribution</h4>
              <p className="text-xs text-white/60">
                Governance rewards are distributed weekly based on platform fees.
                Claim them anytime once unlocked.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
