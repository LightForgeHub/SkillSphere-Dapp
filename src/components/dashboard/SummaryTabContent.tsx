"use client";

import React from "react";
import { Separator } from "@/components/ui/Separator";

interface SummaryTabContentProps {
  courseSummary?: string;
  keyTakeaways?: string[];
  courseOutcomes?: string[];
}

export default function SummaryTabContent({
  courseSummary = "This course is designed to provide you with a complete understanding of essential concepts and equip you with practical skills for real-world application.",
  keyTakeaways = [
    "Master core concepts and theoretical foundations",
    "Develop hands-on practical experience",
    "Learn industry best practices and standards",
    "Build a portfolio-ready project",
  ],
  courseOutcomes = [
    "Successfully complete projects with confidence",
    "Apply knowledge to professional environments",
    "Understand advanced topics and techniques",
    "Continue learning independently",
  ],
}: SummaryTabContentProps) {
  return (
    <div className="flex flex-col self-stretch w-full bg-card border border-border rounded-[12px] p-6 gap-8 text-foreground">
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Summary</h3>
        <p className="text-sm leading-relaxed text-foreground/80">{courseSummary}</p>
      </div>

      <Separator className="bg-card" />

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Key Takeaways</h3>
        <ul className="space-y-3 text-sm">
          {keyTakeaways.map((takeaway, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-1 size-2 rounded-full bg-white/40 shrink-0" />
              <span className="text-foreground/80">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator className="bg-card" />

      <div className="space-y-4">
        <h3 className="text-base font-semibold">Learning Outcomes</h3>
        <ul className="space-y-3 text-sm">
          {courseOutcomes.map((outcome, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-1 size-2 rounded-full bg-white/40 shrink-0" />
              <span className="text-foreground/80">{outcome}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
