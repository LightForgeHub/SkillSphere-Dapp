"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";

const lbl = "block text-[#FCFCFC] text-sm font-normal leading-6 mb-2";
const inputCls =
  "bg-[#110D18] border border-white/[0.06] text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50";
const textareaCls =
  "w-full bg-[#110D18] border border-white/[0.06] rounded-xl p-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all resize-none";

interface CourseSectionProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

export default function CourseSection({ index, onRemove, canRemove }: CourseSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [exercise, setExercise] = useState("");
  const [assignment, setAssignment] = useState("");

  return (
    <div className="bg-[#0C0A12] rounded-2xl border border-white/[0.04] overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-white/[0.04]">
        <span className="text-white/40 text-xs font-semibold tracking-widest uppercase">
          Section {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Remove section"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors"
            title={collapsed ? "Expand section" : "Collapse section"}
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Section Body */}
      {!collapsed && (
        <div className="p-6 md:p-8 space-y-8">
          {/* Video + Lecture + Duration */}
          <div className="flex flex-col md:flex-row gap-8">
            <FileUpload
              variant="video"
              label="Add Video"
              onFileSelect={() => {}}
              className="shrink-0 w-full md:w-[200px] h-[150px] !bg-[#0F1A15] !border-[#1a3a28]/60"
            />
            <div className="flex-1 space-y-6">
              <div>
                <label className={lbl}>Lecture title*</label>
                <Input
                  placeholder="Enter lecture title"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={lbl}>Duration*</label>
                <div className="w-full md:w-[200px]">
                  <Input
                    placeholder="1hrs"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={lbl}>Note*</label>
            <textarea
              placeholder="Note description"
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={textareaCls}
            />
          </div>

          {/* Quiz */}
          <div>
            <label className={lbl}>Quiz</label>
            <div className="space-y-4">
              <Input
                placeholder="Enter title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className={inputCls}
              />
              <textarea
                placeholder="Quiz description"
                rows={3}
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                className={textareaCls}
              />
            </div>
          </div>

          {/* Exercise */}
          <div>
            <label className={lbl}>Exercise</label>
            <Input
              placeholder="Enter exercise details"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Assignment */}
          <div>
            <label className={lbl}>Assignment</label>
            <Input
              placeholder="Enter assignment details"
              value={assignment}
              onChange={(e) => setAssignment(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      )}
    </div>
  );
}
