"use client";

import React, { useState } from "react";
import { Plus, ChevronDown, Clock, Search, X } from "lucide-react";
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  FileUpload,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

export default function CreateCoursePage() {
  const [sections, setSections] = useState([{ id: 1 }]);
  const [skills, setSkills] = useState(["Front-End"]);

  const addSection = () => {
    setSections([...sections, { id: sections.length + 1 }]);
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const labelStyle = {
    color: "#FCFCFC",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "24px",
    marginBottom: "8px",
    display: "block",
  };

  const inputClass = "bg-[#1A1520] border-white/5 text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50";

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
              <label style={labelStyle}>Course title*</label>
              <Input placeholder="Design made simple" className={inputClass} />
            </div>

            <div>
              <label style={labelStyle}>Course description</label>
              <textarea 
                placeholder="Write your cover letter"
                className="w-full bg-[#1A1520] border border-white/5 rounded-xl p-4 min-h-[300px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Details and Certification */}
        <div className="space-y-8">
                {/* Top Header Actions */}
      <div className="flex flex-col justify-end gap-4 mb-8">
        <Button variant="glow" className="bg-[#9B59FF] hover:bg-[#8A48EB] text-white border-none h-12 px-8 uppercase font-bold text-xs tracking-wider">
          Publish for $50
        </Button>
        <Button variant="secondary" className="bg-[#110719] border-white/5 hover:bg-white/10 text-white h-12 px-8 uppercase font-bold text-xs tracking-wider">
          Add to Draft
        </Button>
      </div>
          <div className="grid grid-cols-1  gap-6">
            <div>
              <label style={labelStyle}>Course amount*</label>
              <Select defaultValue="24">
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="$24" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">$24</SelectItem>
                  <SelectItem value="49">$49</SelectItem>
                  <SelectItem value="99">$99</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Access*</label>
              <Select defaultValue="paid">
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Paid Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid Course</SelectItem>
                  <SelectItem value="free">Free Access</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Skills you will gain</label>
            <div className="flex flex-wrap gap-2 p-2 bg-[#05010d] border border-white/5 rounded-xl min-h-[48px] items-center">
              {skills.map((skill) => (
                <div key={skill} className="bg-[#1A1520] text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 flex items-center gap-2">
                  {skill}
                  <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => removeSkill(skill)} />
                </div>
              ))}
              <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                Add
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label style={labelStyle}>Certification*</label>
              <Select defaultValue="yes">
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Yes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <FileUpload 
              variant="compact" 
              label="Add file" 
              onFileSelect={(file) => console.log("Cert selected:", file)} 
            />
          </div>
        </div>
      </div>

      {/* Sections Area */}
      <div className="mt-16 space-y-12">
        {sections.map((section, idx) => (
          <div key={section.id} className="bg-[#0D0B14] rounded-2xl p-8 border border-white/5 space-y-8">
            <h4 className="text-white/60 text-sm font-medium">Section {idx + 1}</h4>
            
            <div className="flex flex-col md:flex-row gap-8">
              <FileUpload 
                variant="video" 
                label="Add Video" 
                onFileSelect={(file) => console.log(`Video for section ${section.id}:`, file)} 
                className="shrink-0 aspect-[1.3/1] w-full md:w-[240px] h-[180px]"
              />

              <div className="flex-1 space-y-6">
                <div>
                  <label style={labelStyle}>Lecture title*</label>
                  <Input placeholder="Enter lecture title" className={inputClass.replace('#1A1520', '#0D0B14').replace('border-white/5', 'border-white/[0.03]')} />
                </div>
                <div>
                  <label style={labelStyle}>Duration*</label>
                  <div className="w-full md:w-[200px]">
                    <Input placeholder="1hrs" className={inputClass.replace('#1A1520', '#0D0B14').replace('border-white/5', 'border-white/[0.03]')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label style={labelStyle}>Note*</label>
                <textarea 
                  placeholder="Note description"
                  className="w-full bg-[#0D0B14] border border-white/[0.03] rounded-xl p-4 min-h-[180px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label style={labelStyle}>Quiz</label>
                  <div className="space-y-4">
                    <Input placeholder="Enter title" className={inputClass.replace('#1A1520', '#0D0B14').replace('border-white/5', 'border-white/[0.03]')} />
                    <textarea 
                      placeholder="Quiz description"
                      className="w-full bg-[#0D0B14] border border-white/[0.03] rounded-xl p-4 min-h-[120px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Exercise</label>
                  <Input placeholder="Enter exercise details" className={inputClass.replace('#1A1520', '#0D0B14').replace('border-white/5', 'border-white/[0.03]')} />
                </div>

                <div>
                  <label style={labelStyle}>Assignment</label>
                  <Input placeholder="Enter assignment details" className={inputClass.replace('#1A1520', '#0D0B14').replace('border-white/5', 'border-white/[0.03]')} />
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
