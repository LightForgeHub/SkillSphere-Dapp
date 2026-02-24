"use client";

import React from "react";
import Image, { StaticImageData } from "next/image";
import { Edit2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/components/ui/utils";

interface CourseCardProps {
  title: string;
  thumbnail: string | StaticImageData;
  enrollmentCount: number;
  rating: string | number;
  status: "Published" | "Draft";
  className?: string;
}

export function CourseCard({
  title,
  thumbnail,
  enrollmentCount,
  rating,
  status,
  className,
}: CourseCardProps) {
  return (
    <Card className={cn("bg-[#110C1D] border-white/5 overflow-hidden transition-all hover:border-white/10", className)}>
      <div className="flex flex-col md:flex-row p-5 gap-8">
        {/* Thumbnail Section */}
        <div className="relative w-full md:w-[320px] h-[180px] rounded-xl overflow-hidden flex-shrink-0">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
          />
        </div>

        {/* Content Section */}
        <div className="flex-grow flex flex-col justify-between py-1">
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-2xl font-semibold text-white leading-tight">
                {title}
              </h3>
              <StatusBadge 
                status={status} 
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-full border-none",
                  status === "Published" ? "bg-[#2D2E2D] text-[#90A1B9]" : "bg-[#2D2E2D] text-[#90A1B9]"
                )} 
              />
            </div>
            
            <p className="text-[#45818e] text-base font-normal">
              Video/Note guides available
            </p>

            <div className="flex flex-wrap items-center gap-x-16 gap-y-4 pt-2">
              <div className="flex items-center gap-2 text-base">
                <span className="text-[#52525B]">Enrolment:</span>
                <span className="text-[#E4E4E7] font-medium">{enrollmentCount} Learners</span>
              </div>
              <div className="flex items-center gap-2 text-base ml-auto md:ml-0">
                <span className="text-[#52525B]">Rating:</span>
                <span className="text-[#E4E4E7] font-medium">{rating}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-white/10 hover:bg-white/5 text-[#E4E4E7] gap-3 px-5 h-11 rounded-xl text-sm font-medium"
            >
              <Edit2 className="size-4" />
              Edit Course
            </Button>
          </div>
        </div>
      </div>
    </Card>

  );
}
