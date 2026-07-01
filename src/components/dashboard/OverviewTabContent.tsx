"use client";

import React from "react";
import { Separator } from "@/components/ui/Separator";

interface OverviewTabContentProps {
  overview?: string;
  learningPoints?: string[];
  targetAudience?: string[];
}

export default function OverviewTabContent({
  overview = "This course provides a comprehensive introduction to modern development concepts and practices.",
  learningPoints = [
    "Understand fundamental concepts and best practices",
    "Build practical projects from scratch",
    "Master advanced techniques and patterns",
    "Implement production-ready solutions",
  ],
  targetAudience = [
    "Beginners looking to start their career in development",
    "Intermediate developers wanting to deepen their skills",
    "Professionals transitioning to new technologies",
  ],
}: OverviewTabContentProps) {
  return (
    <div className="flex flex-col self-stretch w-full bg-card border border-border rounded-[12px] p-6 gap-8 text-foreground">
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Course Overview</h3>
        <p className="text-sm leading-relaxed text-foreground/80">{overview}</p>
      </div>

      <Separator className="bg-card" />

      <div className="space-y-4">
        <h3 className="text-base font-semibold">What You Will Learn</h3>
        <ul className="space-y-3 text-sm">
          {learningPoints.map((point, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-1 size-2 rounded-full bg-white/40 shrink-0" />
              <span className="text-foreground/80">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator className="bg-card" />

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Who This Course Is For</h3>
        <ul className="space-y-3 text-sm">
          {targetAudience.map((audience, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-1 size-2 rounded-full bg-white/40 shrink-0" />
              <span className="text-foreground/80">{audience}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
