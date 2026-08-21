"use client";

import React from "react";
import { Zap, ShieldCheck, Award, Globe } from "lucide-react";

export function ValuePillarsSection() {
  const pillars = [
    {
      icon: Zap,
      title: "Per-Second Payment Streams",
      description:
        "No more paying for full 60-minute blocks when you only need a 10-minute code review or strategy check. Money streams continuously while value flows.",
    },
    {
      icon: ShieldCheck,
      title: "Trustless Soroban Escrow",
      description:
        "Funds are held safely in open-source Smart Contract vaults on Stellar. When the session ends, unspent funds return instantly to your wallet.",
    },
    {
      icon: Award,
      title: "Immutable On-Chain Reputation",
      description:
        "Expert ratings and dispute metrics are calculated programmatically on-chain. Reputation cannot be deleted, bought, or manipulated.",
    },
    {
      icon: Globe,
      title: "Global Micro-Consultations",
      description:
        "Borderlessly connect with verified mentors, software architects, and consultants globally without cross-border banking delays.",
    },
  ];

  return (
    <section className="relative w-full py-20 px-4 sm:px-6 lg:px-12 bg-card/30 border-t border-border/40 overflow-hidden">
      <div className="max-w-[1320px] mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold font-work text-foreground tracking-tight">
            Why Knowledge Seekers & Experts Choose SkillSphere
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Re-architecting human expertise exchange around fairness, speed, and real-time streaming payments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm space-y-4 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-work text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
