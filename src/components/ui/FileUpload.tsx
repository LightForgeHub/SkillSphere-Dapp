"use client";

import React, { useRef, useState } from "react";
import { Plus, X, Upload, File, Video, Image as ImageIcon } from "lucide-react";
import { cn } from "./utils";
import { Button } from "./Button";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  label?: string;
  accept?: string;
  variant?: "default" | "video" | "compact";
  className?: string;
  value?: File | string | null;
}

export function FileUpload({
  onFileSelect,
  label = "Upload File",
  accept = "image/*",
  variant = "default",
  className,
  value,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(
    typeof value === "string" ? value : value?.name || null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onButtonClick}
          className="bg-[#2D2D2D] border-none hover:bg-[#3D3D3D] text-white/70 h-10 px-6 rounded-full w-fit flex items-center gap-2"
        >
          {fileName ? (
            <span className="max-w-[150px] truncate">{fileName}</span>
          ) : (
            label
          )}
          {fileName && (
            <X className="w-4 h-4 hover:text-white" onClick={handleRemove} />
          )}
        </Button>
      </div>
    );
  }

  const isVideo = variant === "video";

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden group",
        dragActive ? "border-purple-500 bg-purple-500/5" : "border-white/10 bg-[#1A1520] hover:border-white/20",
        isVideo ? "aspect-square w-48" : "w-full aspect-[2/1] md:aspect-[3/1]",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />

      {fileName ? (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          {isVideo ? <Video className="w-8 h-8 text-white/40" /> : <ImageIcon className="w-8 h-8 text-white/40" />}
          <span className="text-sm text-white/60 truncate max-w-full px-4">{fileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8"
          >
            Remove file
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#2D2D2D] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-white/70" />
          </div>
          <span className="text-sm font-medium text-white/60">{label}</span>
        </div>
      )}

      {/* Simplified checkerboard mimic for thumbnail area as seen in design */}
      {!fileName && !isVideo && (
         <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
         />
      )}
    </div>
  );
}
