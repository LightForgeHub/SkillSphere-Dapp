"use client";

import React, { useState, useRef, useEffect } from "react";
import { Edit2, Plus } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface AboutSectionProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function AboutSection({ value, onChange, className }: AboutSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className={className}>
      <div className="bg-[#161716] border-none rounded-2xl p-3 md:p-4 min-h-[100px] transition-colors group">
        <div className="flex items-center justify-between mb-3 text-sm">
          <label className="text-base font-medium text-white tracking-tight font-sans">About</label>
          <div className="flex items-center gap-3 text-white/40">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-bold hover:text-white transition-colors tracking-widest outline-none",
                isEditing && "text-purple-400"
              )}
            >
              <Edit2 className="w-3.5 h-3.5" />
              {isEditing ? "DONE" : "EDIT"}
            </button>
            <button type="button" className="hover:text-white transition-colors outline-none">
              <Plus className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="h-px bg-white/5 w-full mb-3" />
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!isEditing}
          className={cn(
            "w-full bg-transparent border-none outline-none text-white/70 text-xs md:text-sm leading-relaxed resize-none h-full placeholder:text-white/20 font-sans",
            !isEditing && "cursor-default pointer-events-none"
          )}
          placeholder="Tell us about yourself..."
          rows={3}
        />
      </div>
    </div>
  );
}
