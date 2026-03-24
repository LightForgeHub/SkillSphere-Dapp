"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, FileUpload } from "@/components/ui";
import CoursePricingPanel from "@/components/dashboard/CoursePricingPanel";

export default function CreateCoursePage() {
  const [sections, setSections] = useState([{ id: 1 }]);

  const addSection = () => setSections([...sections, { id: sections.length + 1 }]);

  const label = "block text-[#FCFCFC] text-sm font-normal leading-6 mb-2";
  const inputClass = "bg-[#1A1520] border-white/5 text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50";
  const sectionInputClass = "bg-[#110D18] border border-white/[0.06] text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50";

  return (
    <div className="min-h-screen bg-[#05010d] text-white/90 p-4 md:p-5 space-y-8 max-w-7xl mx-auto">


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Media and Description */}
        <div className="space-y-8">
          <FileUpload 
            label="Upload Image" 
            onFileSelect={(file) => console.log("Thumbnail selected:", file)} 
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
                className="w-full bg-[#1A1520] border border-white/5 rounded-xl p-4 min-h-75 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Metadata Panel */}
        <div>
          <CoursePricingPanel />
        </div>
      </div>

      {/* Sections Area */}
      <div className="mt-16 space-y-12">
        {sections.map((section, idx) => (
          <div key={section.id} className="bg-[#0C0A12] rounded-2xl p-6 md:p-8 border border-white/[0.04] space-y-8">
            <h4 className="text-white/40 text-xs font-semibold tracking-widest uppercase">Section {idx + 1}</h4>
            
            <div className="flex flex-col md:flex-row gap-8">
              <FileUpload 
                variant="video" 
                label="Add Video" 
                onFileSelect={(file) => console.log(`Video for section ${section.id}:`, file)} 
                className="shrink-0 w-full md:w-[200px] h-[150px] !bg-[#0F1A15] !border-[#1a3a28]/60"
              />

              <div className="flex-1 space-y-6">
                <div>
                  <label className={label}>Lecture title*</label>
                  <Input placeholder="Enter lecture title" className={sectionInputClass} />
                </div>
                <div>
                  <label className={label}>Duration*</label>
                  <div className="w-full md:w-[200px]">
                    <Input placeholder="1hrs" className={sectionInputClass} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className={label}>Note*</label>
                <textarea 
                  placeholder="Note description"
                  className="w-full bg-[#110D18] border border-white/[0.06] rounded-xl p-4 min-h-[150px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className={label}>Quiz</label>
                  <div className="space-y-4">
                    <Input placeholder="Enter title" className={sectionInputClass} />
                    <textarea 
                      placeholder="Quiz description"
                      className="w-full bg-[#110D18] border border-white/[0.06] rounded-xl p-4 min-h-[100px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className={label}>Exercise</label>
                  <Input placeholder="Enter exercise details" className={sectionInputClass} />
                </div>

                <div>
                  <label className={label}>Assignment</label>
                  <Input placeholder="Enter assignment details" className={sectionInputClass} />
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-center mt-12">
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
