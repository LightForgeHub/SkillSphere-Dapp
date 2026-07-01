"use client";

import React, { useState, useMemo } from "react";
import { Card } from "../ui/Card";

interface RewardCalculation {
  daily: number;
  monthly: number;
  yearly: number;
}

interface StakingCalculatorProps {
  currentApy?: number;
  minStake?: number;
  maxStake?: number;
}

export function StakingCalculator({
  currentApy = 12,
  minStake = 100,
  maxStake = 100000,
}: StakingCalculatorProps) {
  const [stakeAmount, setStakeAmount] = useState(1000);

  const rewards: RewardCalculation = useMemo(() => {
    const dailyReward = (stakeAmount * (currentApy / 100)) / 365;
    const monthlyReward = (stakeAmount * (currentApy / 100)) / 12;
    const yearlyReward = stakeAmount * (currentApy / 100);

    return {
      daily: Math.round(dailyReward * 100) / 100,
      monthly: Math.round(monthlyReward * 100) / 100,
      yearly: Math.round(yearlyReward * 100) / 100,
    };
  }, [stakeAmount, currentApy]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStakeAmount(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value) && value >= minStake && value <= maxStake) {
      setStakeAmount(value);
    }
  };

  const sliderPercentage =
    ((stakeAmount - minStake) / (maxStake - minStake)) * 100;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Staking Rewards Calculator</h2>
        <p className="text-foreground/60">
          Project your potential returns from staking SkillSphere tokens at {currentApy}% APY
        </p>
      </div>

      {/* Stake Amount Input and Slider */}
      <Card className="p-6 space-y-4 bg-card border-border">
        <div className="space-y-2">
          <label htmlFor="stake-amount" className="text-sm font-semibold text-foreground">
            Stake Amount (SKILL)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="stake-amount"
              type="number"
              min={minStake}
              max={maxStake}
              value={stakeAmount}
              onChange={handleInputChange}
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-foreground text-lg font-semibold focus:outline-none focus:border-white/30 transition-colors"
            />
            <span className="text-foreground/60 text-sm">SKILL</span>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min={minStake}
            max={maxStake}
            value={stakeAmount}
            onChange={handleSliderChange}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${sliderPercentage}%, rgba(255,255,255,0.1) ${sliderPercentage}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-foreground/60">
            <span>{minStake.toLocaleString()} SKILL</span>
            <span>{maxStake.toLocaleString()} SKILL</span>
          </div>
        </div>
      </Card>

      {/* Reward Display Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Daily Rewards */}
        <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-500/20">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground/70">Daily Rewards</h3>
            <div className="text-3xl font-bold text-foreground">
              {rewards.daily.toFixed(2)}
            </div>
            <p className="text-xs text-foreground/50">SKILL per day</p>
          </div>
        </Card>

        {/* Monthly Rewards */}
        <Card className="p-6 bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-500/20">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground/70">Monthly Rewards</h3>
            <div className="text-3xl font-bold text-foreground">
              {rewards.monthly.toFixed(2)}
            </div>
            <p className="text-xs text-foreground/50">SKILL per month</p>
          </div>
        </Card>

        {/* Yearly Rewards */}
        <Card className="p-6 bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-500/20">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground/70">Yearly Rewards</h3>
            <div className="text-3xl font-bold text-foreground">
              {rewards.yearly.toFixed(2)}
            </div>
            <p className="text-xs text-foreground/50">SKILL per year</p>
          </div>
        </Card>
      </div>

      {/* APY Info */}
      <Card className="p-4 bg-background border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground/60">Current APY</p>
            <p className="text-lg font-bold text-foreground">{currentApy}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/60">Total Staked Value</p>
            <p className="text-lg font-bold text-foreground">
              {stakeAmount.toLocaleString()} SKILL
            </p>
          </div>
        </div>
      </Card>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
