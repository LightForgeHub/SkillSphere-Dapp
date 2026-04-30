"use client";

import React, { useState } from "react";
import { Play, SkipBack, SkipForward } from "lucide-react";

interface CourseVideoPlayerProps {
  thumbnailSrc: string;
  thumbnailAlt?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onPlay?: () => void;
}

export default function CourseVideoPlayer({
  thumbnailSrc,
  thumbnailAlt = "Course video thumbnail",
  onPrevious,
  onNext,
  onPlay,
}: CourseVideoPlayerProps) {
  const [isPlayHovered, setIsPlayHovered] = useState(false);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0B0113]">
      {/* Thumbnail */}
      <img
        src={thumbnailSrc}
        alt={thumbnailAlt}
        className="w-full h-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Side nav: Previous */}
      <button
        onClick={onPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 border border-white/10 text-white hover:bg-black/70 hover:border-white/30 transition-all duration-200 backdrop-blur-sm"
        aria-label="Previous lesson"
      >
        <SkipBack size={18} />
      </button>

      {/* Center play button */}
      <button
        onClick={onPlay}
        onMouseEnter={() => setIsPlayHovered(true)}
        onMouseLeave={() => setIsPlayHovered(false)}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200"
        aria-label="Play video"
      >
        <span
          className={`flex items-center justify-center w-16 h-16 rounded-full border-2 border-white bg-white/10 backdrop-blur-sm transition-all duration-200 ${
            isPlayHovered
              ? "bg-white/25 scale-110 shadow-[0_0_32px_rgba(255,255,255,0.25)]"
              : ""
          }`}
        >
          <Play
            size={28}
            className="text-white fill-white translate-x-0.5"
          />
        </span>
      </button>

      {/* Side nav: Next */}
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 border border-white/10 text-white hover:bg-black/70 hover:border-white/30 transition-all duration-200 backdrop-blur-sm"
        aria-label="Next lesson"
      >
        <SkipForward size={18} />
      </button>
    </div>
  );
}
