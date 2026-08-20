"use client";

import React from "react";
import { Wallet, ShieldCheck, PlayCircle, RefreshCw } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Wallet,
      title: "Connect Stellar Wallet",
      description:
        "Connect your Freighter Wallet on Stellar Testnet. No central account registration required.",
    },
    {
      number: "02",
      icon: ShieldCheck,
      title: "Lock Session Escrow",
      description:
        "Choose your consultation duration. Your budget is securely locked into a Soroban smart contract vault.",
    },
    {
      number: "03",
      icon: PlayCircle,
      title: "Stream & Settle",
      description:
        "Enter the WebRTC video call. Payments stream per second while value is delivered. Unused funds refund instantly.",
    },
  ];

  return (
    <section className="relative w-full py-20 px-4 sm:px-6 lg:px-12 bg-background border-t border-border/40 overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-1/2 right-10 w-[500px] h-[300px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-[1320px] mx-auto relative z-10">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Continuous Value Exchange</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-work text-foreground tracking-tight">
            How SkillSphere Works
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Say goodbye to upfront hourly blocks and 20% platform commissions. Pay strictly per second while consulting with verified specialists.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="relative rounded-2xl bg-card/40 backdrop-blur-md border border-border/50 p-8 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 group"
              >
                {/* Number Badge */}
                <div className="flex items-center justify-between mb-8">
                  <span className="text-4xl font-extrabold font-mono text-purple-500/40 group-hover:text-purple-400 transition-colors">
                    {step.number}
                  </span>
                  <div className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold font-work text-foreground group-hover:text-purple-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
