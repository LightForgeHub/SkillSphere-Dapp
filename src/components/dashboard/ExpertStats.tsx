"use client";

import React from "react";
import { Award, TrendingUp, Zap } from "lucide-react";

// ── Tier definitions ──────────────────────────────────────────────────────────
export interface Tier {
  name: "Bronze" | "Silver" | "Gold";
  minHours: number;
  maxHours: number | null; // null = no upper cap (Gold)
  color: string;
  borderColor: string;
  bgColor: string;
  barColor: string;
  icon: React.ReactNode;
}

const TIERS: Tier[] = [
  {
    name: "Bronze",
    minHours: 0,
    maxHours: 50,
    color: "text-amber-600",
    borderColor: "border-amber-600/40",
    bgColor: "bg-amber-600/10",
    barColor: "from-amber-700 to-amber-500",
    icon: <Award className="w-5 h-5 text-amber-600" />,
  },
  {
    name: "Silver",
    minHours: 50,
    maxHours: 200,
    color: "text-slate-300",
    borderColor: "border-slate-400/40",
    bgColor: "bg-slate-400/10",
    barColor: "from-slate-500 to-slate-300",
    icon: <Award className="w-5 h-5 text-slate-300" />,
  },
  {
    name: "Gold",
    minHours: 200,
    maxHours: null,
    color: "text-yellow-400",
    borderColor: "border-yellow-400/40",
    bgColor: "bg-yellow-400/10",
    barColor: "from-yellow-600 to-yellow-400",
    icon: <Award className="w-5 h-5 text-yellow-400" />,
  },
];

function getTierForHours(hours: number): Tier {
  return (
    [...TIERS].reverse().find((t) => hours >= t.minHours) ?? TIERS[0]
  );
}

function getNextTier(current: Tier): Tier | null {
  const idx = TIERS.findIndex((t) => t.name === current.name);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface ExpertStatsProps {
  hoursCompleted?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExpertStats({ hoursCompleted = 87 }: ExpertStatsProps) {
  const currentTier = getTierForHours(hoursCompleted);
  const nextTier = getNextTier(currentTier);

  // Progress within the current tier band
  const bandStart = currentTier.minHours;
  const bandEnd = nextTier ? nextTier.minHours : currentTier.minHours + 100;
  const bandSize = bandEnd - bandStart;
  const progressInBand = Math.min(hoursCompleted - bandStart, bandSize);
  const progressPct = bandSize > 0 ? (progressInBand / bandSize) * 100 : 100;
  const hoursToNext = nextTier ? nextTier.minHours - hoursCompleted : 0;

  return (
    <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Expert Tier Progress</h3>
        </div>
        {/* Current tier badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${currentTier.color} ${currentTier.borderColor} ${currentTier.bgColor}`}
        >
          {currentTier.icon}
          {currentTier.name}
        </span>
      </div>

      {/* Hours summary */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">Hours Completed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{hoursCompleted}</span>
            <span className="text-slate-400 text-sm">hrs</span>
          </div>
        </div>
        {nextTier ? (
          <div className="text-right">
            <p className="text-sm text-slate-400 mb-1">Next Tier</p>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${nextTier.color} ${nextTier.borderColor} ${nextTier.bgColor}`}
            >
              {nextTier.icon}
              {nextTier.name}
            </span>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-sm text-slate-400 mb-1">Status</p>
            <span className="text-yellow-400 font-semibold text-sm flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Max Tier Reached
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>{bandStart} hrs ({currentTier.name})</span>
          {nextTier && <span>{bandEnd} hrs ({nextTier.name})</span>}
        </div>
        <div
          className="h-3 w-full bg-white/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Tier progress: ${Math.round(progressPct)}% toward ${nextTier?.name ?? currentTier.name}`}
        >
          <div
            className={`h-full bg-gradient-to-r ${currentTier.barColor} rounded-full transition-all duration-700 ease-out relative`}
            style={{ width: `${progressPct}%` }}
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 opacity-40 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse rounded-full" />
          </div>
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-slate-400">
            {progressInBand} / {bandSize} hrs in current band
          </span>
          {nextTier && hoursToNext > 0 && (
            <span className="text-purple-400 font-medium">
              {hoursToNext} hrs to {nextTier.name}
            </span>
          )}
        </div>
      </div>

      {/* Tier milestone row */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">All Tiers</p>
        <div className="flex gap-3">
          {TIERS.map((tier, idx) => {
            const isActive = tier.name === currentTier.name;
            const isUnlocked = hoursCompleted >= tier.minHours;
            return (
              <div
                key={tier.name}
                className={`flex-1 rounded-xl p-3 border text-center transition-all ${
                  isActive
                    ? `${tier.bgColor} ${tier.borderColor}`
                    : isUnlocked
                    ? "bg-white/5 border-white/10"
                    : "bg-white/[0.02] border-white/5 opacity-50"
                }`}
              >
                <div className="flex justify-center mb-1.5">{tier.icon}</div>
                <p
                  className={`text-xs font-semibold ${
                    isActive ? tier.color : isUnlocked ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {tier.name}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {tier.maxHours !== null
                    ? `${tier.minHours}–${tier.maxHours} hrs`
                    : `${tier.minHours}+ hrs`}
                </p>
                {isActive && (
                  <span className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full bg-purple-600/40 text-purple-300 font-medium">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}