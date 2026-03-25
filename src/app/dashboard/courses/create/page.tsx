"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, FileUpload } from "@/components/ui";
import CoursePricingPanel from "@/components/dashboard/CoursePricingPanel";
import CourseSection from "@/components/dashboard/CourseSection";

const label = "block text-[#FCFCFC] text-sm font-normal leading-6 mb-2";
const inputClass =
  "bg-[#1A1520] border-white/5 text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50";

let nextId = 2;

export default function CreateCoursePage() {
  const [courseAmount, setCourseAmount] = useState("24");
  const [sections, setSections] = useState([{ id: 1 }]);

  const addSection = () => {
    setSections((prev) => [...prev, { id: nextId++ }]);
  };

  const removeSection = (id: number) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#05010d] text-white/90 p-4 md:p-5 space-y-8 max-w-7xl mx-auto">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Media and Description */}
        <div className="space-y-8">
          <FileUpload
            label="Upload Image"
            onFileSelect={() => {}}
          />
          <div className="space-y-6">
            <div>
              <label className={label}>Course title*</label>
              <Input placeholder="Design made simple" className={inputClass} />
            </div>
            <div>
              <label className={label}>Course description</label>
              <textarea
                placeholder="Write your cover letter"
                className="w-full bg-[#1A1520] border border-white/5 rounded-xl p-4 min-h-[300px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Metadata Panel */}
        <div>
          <CoursePricingPanel
            courseAmount={courseAmount}
            onAmountChange={setCourseAmount}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="mt-16 space-y-6">
        {sections.map((section, idx) => (
          <CourseSection
            key={section.id}
            index={idx}
            onRemove={() => removeSection(section.id)}
            canRemove={sections.length > 1}
          />
        ))}

        <div className="flex justify-center pt-6">
          <Button
            variant="secondary"
            onClick={addSection}
            className="bg-transparent border-white/10 hover:bg-white/5 text-white h-12 px-12 uppercase font-bold text-xs tracking-wider"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Section
          </Button>
        </div>
      </div>
    </div>
  );
}
