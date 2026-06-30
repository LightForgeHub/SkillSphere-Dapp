"use client";

import React from "react";

interface CourseLearningHeaderProps {
  courseTitle: string;
  currentLesson: string;
}

export default function CourseLearningHeader({
  courseTitle,
  currentLesson,
}: CourseLearningHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 px-4 py-2.5 bg-card border border-border rounded-xl overflow-hidden">
      <span className="text-sm text-foreground/50 truncate min-w-0">
        {courseTitle}
      </span>
      <span className="hidden sm:block mx-2.5 text-foreground/30 flex-shrink-0 select-none">
        |
      </span>
      <span className="text-sm font-semibold text-foreground truncate min-w-0">
        {currentLesson}
      </span>
    </div>
  );
}
