"use client";

import React from "react";

interface ResourcesTabContentProps {
  resources?: Array<{
    title: string;
    type: string;
    url?: string;
  }>;
}

export default function ResourcesTabContent({
  resources = [
    { title: "Official Documentation", type: "Link" },
    { title: "Course Materials PDF", type: "Document" },
    { title: "Code Examples Repository", type: "GitHub" },
    { title: "Community Forum", type: "Link" },
  ],
}: ResourcesTabContentProps) {
  return (
    <div className="flex flex-col self-stretch w-full bg-card border border-border rounded-[12px] p-6 gap-6 text-foreground">
      <h3 className="text-base font-semibold">Course Resources</h3>
      <div className="space-y-3">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-card/40 border border-border rounded-lg hover:bg-card/60 transition-colors"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                {resource.title}
              </span>
              <span className="text-xs text-foreground/60">{resource.type}</span>
            </div>
            <button className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-4 py-2 rounded-lg border border-border hover:border-white/20">
              Access
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
