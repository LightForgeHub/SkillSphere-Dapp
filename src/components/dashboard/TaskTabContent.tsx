"use client";

import React, { useState } from "react";
import { Pencil, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Separator } from "@/components/ui/Separator";
import DownloadModal from "./DownloadModal";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col items-center self-stretch grow-0 shrink-0 w-full max-w-[820px] min-h-[895px] bg-[#1A1520] border border-[#1D1D1C] rounded-[12px] p-6 gap-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h2 className="text-xl font-bold">Tasks</h2>
        <Button variant="outline" size="sm" className="gap-2 border-[#1D1D1C] bg-transparent text-white hover:bg-white/5">
          <Pencil size={16} />
          Edit
        </Button>
      </div>

      {/* Task Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-sm leading-relaxed">
        {/* Research & Write */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white/80">Research & Write:</h3>
          <ul className="space-y-4 text-white/60 list-none pl-0">
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
          <h3 className="text-base font-semibold text-white/80">Submission</h3>
          <ul className="space-y-3 text-white/60 list-none pl-0">
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

      <Separator className="bg-[#1D1D1C]" />

      {/* Student Submissions Section */}
      <div className="flex flex-col w-full gap-6">
        <h3 className="text-base font-semibold text-white/60">Student Submissions</h3>
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div 
              key={sub.id} 
              className="flex items-center justify-between p-4 bg-[#110D18]/40 border border-[#1D1D1C] rounded-xl hover:bg-[#110D18]/60 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar className="size-12">
                  <AvatarImage src={sub.avatar} alt={sub.name} />
                  <AvatarFallback className="bg-purple-600/20 text-purple-400">
                    {sub.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs text-white/40">{sub.name}</span>
                  <span className="text-sm font-semibold text-white">{sub.taskName}</span>
                  <span className="text-[10px] text-white/20">{sub.time}</span>
                </div>
              </div>

              <button 
                onClick={() => handleDownloadClick(sub)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#211B27] border border-white/5 text-white/60 hover:text-white hover:bg-[#2A2332] transition-all group shadow-sm"
              >
                <div className="bg-[#2A2332] p-1.5 rounded flex items-center justify-center">
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
