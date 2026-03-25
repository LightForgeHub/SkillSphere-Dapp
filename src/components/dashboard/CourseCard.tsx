import React from "react"
import { cn } from "@/lib/utils"

interface CourseCardProps {
  thumbnail: string
  title: string
  description: string
  enrollment: string
  rating: string
  status: "Published" | "Draft"
}

export default function CourseCard({
  thumbnail,
  title,
  description,
  enrollment,
  rating,
  status,
}: CourseCardProps) {
  return (
    <div className="bg-[#110719] border border-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row p-4 gap-6 group hover:bg-white/[0.02] transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 rounded-xl overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              status === "Published" ? "bg-white/10 text-white/60" : "bg-yellow-500/10 text-yellow-500/80"
            )}>
              {status}
            </span>
          </div>
          <p className="text-[#4CC9F0] text-sm mb-6">{description}</p>
          
          <div className="flex items-center gap-12">
            <div className="flex flex-col">
              <span className="text-xs text-white/40 mb-0.5 font-medium">Enrollment</span>
              <span className="text-sm text-white font-semibold">{enrollment}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end mt-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-white/40 mb-0.5 font-medium">Rating</span>
              <span className="text-sm text-white font-bold">{rating}/5</span>
            </div>
        </div>
      </div>
    </div>
  )
}
