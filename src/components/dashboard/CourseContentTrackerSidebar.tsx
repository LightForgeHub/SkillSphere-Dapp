"use client";

import React from "react";
import { Download } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";

interface Lesson {
  id: number;
  title: string;
  duration: string;
}

interface TutorInfo {
  name: string;
  role: string;
  avatar?: string;
}

interface CourseContentTrackerSidebarProps {
  tutorInfo?: TutorInfo;
  lessons?: Lesson[];
}

export default function CourseContentTrackerSidebar({
  tutorInfo = {
    name: "Alex Johnson",
    role: "Senior Developer",
    avatar: "/assets/user-holding-block.svg",
  },
  lessons = [
    { id: 1, title: "Getting Started", duration: "15 min" },
    { id: 2, title: "Core Concepts", duration: "25 min" },
    { id: 3, title: "Practical Examples", duration: "30 min" },
    { id: 4, title: "Advanced Topics", duration: "35 min" },
    { id: 5, title: "Project Building", duration: "45 min" },
    { id: 6, title: "Best Practices", duration: "20 min" },
  ],
}: CourseContentTrackerSidebarProps) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-[12px] p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Instructor</h3>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={tutorInfo.avatar} alt={tutorInfo.name} />
            <AvatarFallback className="bg-purple-600/20 text-purple-400 text-sm font-semibold">
              {tutorInfo.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {tutorInfo.name}
            </span>
            <span className="text-xs text-foreground/60">{tutorInfo.role}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[12px] p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Lessons</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-3 bg-card/40 border border-border rounded-lg hover:bg-card/60 transition-colors group"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {lesson.title}
                </span>
                <span className="text-[10px] text-foreground/40">{lesson.duration}</span>
              </div>
              <button className="ml-2 p-2 rounded-lg bg-card border border-border text-foreground/60 hover:text-foreground hover:bg-card transition-all opacity-0 group-hover:opacity-100">
                <Download size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
