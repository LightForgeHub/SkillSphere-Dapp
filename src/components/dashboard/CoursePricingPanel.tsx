"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { FileUpload } from "@/components/ui/FileUpload";

// ─── Shared label style ───────────────────────────────────────────────────────
const label = "block text-[#FCFCFC] text-sm font-normal leading-6 mb-2";

// ─── TagInput ─────────────────────────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      className="flex flex-wrap gap-2 p-3 bg-[#1A1520] border border-white/5 rounded-xl min-h-[48px] items-center cursor-text focus-within:border-[#9B59FF]/50 focus-within:ring-2 focus-within:ring-[#9B59FF]/20 transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 bg-[#9B59FF]/15 border border-[#9B59FF]/25 text-[#C49DFF] text-xs px-3 py-1.5 rounded-lg"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(tags.filter((t) => t !== tag));
            }}
            className="hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Type a skill and press Enter" : ""}
        className="flex-1 min-w-30 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
      />
    </div>
  );
}

interface CoursePricingPanelProps {
  courseAmount: string;
  onAmountChange: (value: string) => void;
  access: string;
  onAccessChange: (value: string) => void;
  isPublishDisabled: boolean;
}

export default function CoursePricingPanel({
  courseAmount,
  onAmountChange,
  access,
  onAccessChange,
  isPublishDisabled,
}: CoursePricingPanelProps) {
  const [skills, setSkills] = useState(["Front-End", "UI Design"]);
  const [accessTouched, setAccessTouched] = useState(false);

  const publishLabel =
    courseAmount === "free" ? "Publish for Free" : `Publish for $${courseAmount}`;

  const accessError = accessTouched && !access ? "Access type is required." : "";

  return (
    <div className="flex flex-col gap-6 bg-[#0C0A12] border border-white/[0.06] rounded-2xl p-6">

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button
          variant="glow"
          disabled={isPublishDisabled}
          className="w-full bg-[#9B59FF] hover:bg-[#8A48EB] text-white border-none h-12 uppercase font-bold text-xs tracking-wider disabled:opacity-40 disabled:cursor-not-allowed disabled:brightness-75"
        >
          {publishLabel}
        </Button>
        <Button
          variant="secondary"
          className="w-full bg-[#110719] border border-white/5 hover:bg-white/10 text-white h-12 uppercase font-bold text-xs tracking-wider"
        >
          Add to Draft
        </Button>
      </div>

      <div className="h-px bg-white/6" />

      {/* Course Amount */}
      <div>
        <label className={label}>Course amount*</label>
        <Select value={courseAmount} onValueChange={onAmountChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="24">$24</SelectItem>
            <SelectItem value="49">$49</SelectItem>
            <SelectItem value="99">$99</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Access */}
      <div>
        <label className={label}>Access*</label>
        <Select
          value={access}
          onValueChange={(v) => { onAccessChange(v); setAccessTouched(true); }}
        >
          <SelectTrigger
            onBlur={() => setAccessTouched(true)}
            className={accessError ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20" : ""}
          >
            <SelectValue placeholder="Select access type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid Course</SelectItem>
            <SelectItem value="free">Free Access</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
          </SelectContent>
        </Select>
        <p className={cn("mt-1.5 text-xs min-h-[18px]", accessError ? "text-red-400" : "text-transparent")}>
          {accessError || ""}
        </p>
      </div>

      {/* Skills Tag Input */}
      <div>
        <label className={label}>Skills you will gain</label>
        <TagInput tags={skills} onChange={setSkills} />
        <p className="mt-1.5 text-xs text-white/30">
          Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Enter</kbd> or{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">,</kbd> to add a skill
        </p>
      </div>

      {/* Certification */}
      <div>
        <label className={label}>Certification*</label>
        <Select defaultValue="yes">
          <SelectTrigger>
            <SelectValue placeholder="Yes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certificate File Upload */}
      <div>
        <label className={label}>Add file</label>
        <FileUpload
          variant="compact"
          label="Upload certificate"
          accept=".pdf,.png,.jpg,.jpeg"
          onFileSelect={(file) => console.log("Certificate:", file)}
        />
      </div>
    </div>
  );
}
