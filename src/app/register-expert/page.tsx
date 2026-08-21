"use client";

import React from "react";
import RegistrationForm from "@/components/profile/RegistrationForm";
import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function RegisterExpertPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            href="/explore-experts"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Experts</span>
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-600/10 border border-purple-500/30 text-purple-300 font-medium">
            Issue #437
          </span>
        </div>

        {/* Hero Banner */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/10 border border-purple-500/30 text-purple-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Join SkillSphere as a Verified Expert</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-purple-200 to-muted-foreground bg-clip-text text-transparent">
            Monetize Your Knowledge in Real-Time
          </h1>
          <p className="text-sm text-muted-foreground">
            Set your per-second streaming rate and connect your Stellar wallet to get paid directly via trustless escrow contracts during 1-on-1 consultations.
          </p>
        </div>

        {/* Registration Form with Zod Validation */}
        <RegistrationForm
          onSubmit={async (data) => {
            console.log("Expert registration submitted:", data);
          }}
        />

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-center">
          <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1.5">
            <Zap className="w-5 h-5 text-purple-400 mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Per-Second Payouts</h4>
            <p className="text-[11px] text-muted-foreground">
              Funds stream directly to your Stellar account every second during active WebRTC calls.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400 mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Zero Custody Risk</h4>
            <p className="text-[11px] text-muted-foreground">
              Non-custodial Soroban escrow ensures both seeker and expert are protected at all times.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1.5">
            <Sparkles className="w-5 h-5 text-cyan-400 mx-auto" />
            <h4 className="text-xs font-bold text-foreground">Reputation Badges</h4>
            <p className="text-[11px] text-muted-foreground">
              Earn on-chain Soulbound reputation tokens for high-rated consultations and milestones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
