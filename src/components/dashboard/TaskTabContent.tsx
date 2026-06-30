"use client";

import React, { useState } from "react";
import { Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Separator } from "@/components/ui/Separator";
import DownloadModal from "./DownloadModal";

const submissions = [
  {
    id: 1,
    name: "Johnny Drill",
    taskName: "Research & Write Task",
    time: "5 min",
    avatar: "/assets/user-holding-block.svg",
  },
  {
    id: 2,
    name: "Johnny Drill",
    taskName: "Research & Write Task",
    time: "5 min",
    avatar: "/assets/user-holding-block.svg",
  },
  {
    id: 3,
    name: "Johnny Drill",
    taskName: "Research & Write Task",
    time: "5 min",
    avatar: "/assets/user-holding-block.svg",
  },
  {
    id: 4,
    name: "Johnny Drill",
    taskName: "Research & Write Task",
    time: "5 min",
    avatar: "/assets/user-holding-block.svg",
  },
];

export default function TaskTabContent() {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<typeof submissions[0] | null>(null);

  const handleDownloadClick = (submission: typeof submissions[0]) => {
    setSelectedSubmission(submission);
    setIsDownloadModalOpen(true);
  };

  return (
    <div className="flex flex-col items-center self-stretch grow-0 shrink-0 w-full max-w-[820px] min-h-[895px] bg-card border border-border rounded-[12px] p-6 gap-8 text-foreground">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h2 className="text-xl font-bold">Tasks</h2>
        <Button variant="outline" size="sm" className="gap-2 border-border bg-transparent text-foreground hover:bg-accent">
          <Pencil size={16} />
          Edit
        </Button>
      </div>

      {/* Task Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-sm leading-relaxed">
        {/* Research & Write */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-foreground/80">Research & Write:</h3>
          <ul className="space-y-4 text-foreground/60 list-none pl-0">
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 rounded-full bg-white/40 shrink-0" />
              Provide a brief history of digital technology, starting from early computing devices to modern-day innovations (e.g., AI, blockchain, IoT).
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 rounded-full bg-white/40 shrink-0" />
              Identify and discuss three major technological breakthroughs that have significantly impacted businesses, education, and daily life.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 rounded-full bg-white/40 shrink-0" />
              Explain how digital technology has transformed communication, entertainment, and the workplace.
            </li>
          </ul>
        </div>

        {/* Submission */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-foreground/80">Submission</h3>
          <ul className="space-y-3 text-foreground/60 list-none pl-0">
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 rounded-full bg-white/40 shrink-0" />
              Format: PDF or DOCX
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 rounded-full bg-white/40 shrink-0" />
              Submission Method: Upload via the course portal
            </li>
          </ul>
        </div>
      </div>

      <Separator className="bg-card" />

      {/* Student Submissions Section */}
      <div className="flex flex-col w-full gap-6">
        <h3 className="text-base font-semibold text-foreground/60">Student Submissions</h3>
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div 
              key={sub.id} 
              className="flex items-center justify-between p-4 bg-card/40 border border-border rounded-xl hover:bg-card/60 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarImage src={sub.avatar} alt={sub.name} />
                  <AvatarFallback className="bg-purple-600/20 text-purple-400">
                    {sub.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs text-foreground/40">{sub.name}</span>
                  <span className="text-sm font-semibold text-foreground">{sub.taskName}</span>
                  <span className="text-[10px] text-foreground/20">{sub.time}</span>
                </div>
              </div>

              <button 
                onClick={() => handleDownloadClick(sub)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground/60 hover:text-foreground hover:bg-card transition-all group shadow-sm"
              >
                <div className="bg-card p-1.5 rounded flex items-center justify-center">
                    <FileText size={14} className="text-[#FF4D4D]" />
                </div>
                <span className="text-xs font-semibold">Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <DownloadModal
        open={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        studentName={selectedSubmission?.name}
        taskName={selectedSubmission?.taskName}
        fileName="submission.pdf"
      />
    </div>
  );
}
