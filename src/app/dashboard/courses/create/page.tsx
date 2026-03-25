"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, FileUpload } from "@/components/ui";
import CoursePricingPanel from "@/components/dashboard/CoursePricingPanel";
import CourseSection from "@/components/dashboard/CourseSection";
import { cn } from "@/components/ui/utils";

const lbl = "block text-[#FCFCFC] text-sm font-normal leading-6 mb-2";
const baseInput =
  "bg-[#1A1520] border-white/5 text-white placeholder:text-white/20 h-12 rounded-xl focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50";
const errorInput =
  "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20";
const baseTextarea =
  "w-full bg-[#1A1520] border border-white/5 rounded-xl p-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-[#9B59FF]/20 focus:border-[#9B59FF]/50 transition-all resize-none";
const errorTextarea = "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20";

let nextId = 2;

interface FormFields {
  title: string;
  description: string;
}

interface TouchedFields {
  title: boolean;
  description: boolean;
}

function getErrors(fields: FormFields) {
  return {
    title: fields.title.trim() === "" ? "Course title is required." : "",
    description: fields.description.trim() === "" ? "Course description is required." : "",
  };
}

export default function CreateCoursePage() {
  const [courseAmount, setCourseAmount] = useState("24");
  const [access, setAccess] = useState("paid");
  const [sections, setSections] = useState([{ id: 1 }]);

  const [fields, setFields] = useState<FormFields>({ title: "", description: "" });
  const [touched, setTouched] = useState<TouchedFields>({ title: false, description: false });

  const errors = getErrors(fields);
  const isFormValid =
    !errors.title && !errors.description && !!courseAmount && !!access;

  const touch = (field: keyof TouchedFields) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const addSection = () => setSections((prev) => [...prev, { id: nextId++ }]);
  const removeSection = (id: number) =>
    setSections((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="min-h-screen bg-[#05010d] text-white/90 p-4 md:p-5 space-y-8 max-w-7xl mx-auto">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column */}
        <div className="space-y-8">
          <FileUpload label="Upload Image" onFileSelect={() => {}} />

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className={lbl}>Course title*</label>
              <Input
                placeholder="Design made simple"
                value={fields.title}
                onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
                onBlur={() => touch("title")}
                className={cn(baseInput, touched.title && errors.title && errorInput)}
              />
              <p className={cn("mt-1.5 text-xs min-h-[18px]", touched.title && errors.title ? "text-red-400" : "text-transparent")}>
                {errors.title || "‎"}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className={lbl}>Course description*</label>
              <textarea
                placeholder="Write your course description"
                rows={10}
                value={fields.description}
                onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
                onBlur={() => touch("description")}
                className={cn(baseTextarea, touched.description && errors.description && errorTextarea)}
              />
              <p className={cn("mt-1.5 text-xs min-h-[18px]", touched.description && errors.description ? "text-red-400" : "text-transparent")}>
                {errors.description || "‎"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <CoursePricingPanel
            courseAmount={courseAmount}
            onAmountChange={setCourseAmount}
            access={access}
            onAccessChange={setAccess}
            isPublishDisabled={!isFormValid}
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
