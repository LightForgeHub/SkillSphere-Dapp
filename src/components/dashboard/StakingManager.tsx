"use client";

import React, { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { TrendingUp, Zap, Wallet } from "lucide-react";

interface StakingManagerProps {
  stakedBalance?: number;
  currentAPY?: number;
  claimableEarnings?: number;
  walletBalance?: number;
  onStake?: (amount: number) => void;
  onUnstake?: (amount: number) => void;
  onClaimRewards?: () => void;
}

export function StakingManager({
  stakedBalance = 5000,
  currentAPY = 12,
  claimableEarnings = 125.50,
  walletBalance = 10000,
  onStake,
  onUnstake,
  onClaimRewards,
}: StakingManagerProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > walletBalance) {
      alert("Insufficient wallet balance");
      return;
    }

    setIsStaking(true);
    try {
      await onStake?.(amount);
      setStakeAmount("");
    } catch (error) {
      console.error("Staking failed:", error);
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > stakedBalance) {
      alert("Insufficient staked balance");
      return;
    }

    setIsUnstaking(true);
    try {
      await onUnstake?.(amount);
      setUnstakeAmount("");
    } catch (error) {
      console.error("Unstaking failed:", error);
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaimRewards = async () => {
    if (claimableEarnings <= 0) return;

    setIsClaiming(true);
    try {
      await onClaimRewards?.();
    } catch (error) {
      console.error("Claiming rewards failed:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const setMaxStake = () => {
    setStakeAmount(walletBalance.toString());
  };

  const setMaxUnstake = () => {
    setUnstakeAmount(stakedBalance.toString());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Staking Dashboard</h2>
        <p className="text-white/60">
          Stake your SKILL tokens to earn rewards and gain reputational benefits
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Staked Balance */}
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Staked Balance</p>
              <h3 className="text-2xl font-bold text-white">
                {stakedBalance.toLocaleString()} SKILL
              </h3>
              <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Earning rewards
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Current APY */}
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Current APY</p>
              <h3 className="text-2xl font-bold text-white">{currentAPY}%</h3>
              <p className="text-xs text-cyan-400 mt-2">Annual Percentage Yield</p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/20">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </Card>

        {/* Claimable Earnings */}
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Claimable Earnings</p>
              <h3 className="text-2xl font-bold text-white">
                {claimableEarnings.toFixed(2)} SKILL
              </h3>
              <p className="text-xs text-green-400 mt-2">Ready to claim</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/20">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Stake Section */}
      <Card className="p-6 bg-[#1A1520] border-white/10">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Stake Tokens</h3>
            <p className="text-sm text-white/60">
              Available: {walletBalance.toLocaleString()} SKILL
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Enter amount to stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="flex-1 bg-[#0A050E] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                min="0"
                max={walletBalance}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={setMaxStake}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                MAX
              </Button>
              <span className="text-white/60 text-sm whitespace-nowrap">SKILL</span>
            </div>

            <Button
              onClick={handleStake}
              disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              size="lg"
            >
              {isStaking ? "Staking..." : "Stake Tokens"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Unstake Section */}
      <Card className="p-6 bg-[#1A1520] border-white/10">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Unstake Tokens</h3>
            <p className="text-sm text-white/60">
              Staked: {stakedBalance.toLocaleString()} SKILL
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Enter amount to unstake"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                className="flex-1 bg-[#0A050E] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                min="0"
                max={stakedBalance}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={setMaxUnstake}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                MAX
              </Button>
              <span className="text-white/60 text-sm whitespace-nowrap">SKILL</span>
            </div>

            <Button
              onClick={handleUnstake}
              disabled={isUnstaking || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              size="lg"
            >
              {isUnstaking ? "Unstaking..." : "Unstake Tokens"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Claim Rewards Section */}
      <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Claim Rewards</h3>
            <p className="text-sm text-white/60">
              {claimableEarnings.toFixed(2)} SKILL available to claim
            </p>
          </div>
          <Button
            onClick={handleClaimRewards}
            disabled={isClaiming || claimableEarnings <= 0}
            className="bg-green-500 hover:bg-green-600 text-white"
            size="lg"
          >
            {isClaiming ? "Claiming..." : "Claim Rewards"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
