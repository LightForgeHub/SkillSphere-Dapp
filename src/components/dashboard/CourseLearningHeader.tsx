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
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 px-4 py-2.5 bg-[#1A1520] border border-[#1D1D1C] rounded-xl overflow-hidden">
      <span className="text-sm text-white/50 truncate min-w-0">
        {courseTitle}
      </span>
      <span className="hidden sm:block mx-2.5 text-white/30 flex-shrink-0 select-none">
        |
      </span>
      <span className="text-sm font-semibold text-white truncate min-w-0">
        {currentLesson}
      </span>
    </div>
  );
}
