"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";

interface ProfileImageUploaderProps {
  currentImage?: string;
  onImageChange: (image: File | string) => void;
  className?: string;
}

export function ProfileImageUploader({
  currentImage,
  onImageChange,
  className,
}: ProfileImageUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onImageChange(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      <div 
        className="relative group cursor-pointer"
        onClick={handleClick}
      >
        <Avatar className="w-[100px] h-[100px] border-2 border-white/10 group-hover:border-purple-500 transition-colors overflow-hidden">
          <AvatarImage 
            src={preview} 
            className="object-cover"
          />
          <AvatarFallback className="bg-[#2D2D2D] text-white/40">
            {preview ? "..." : <Camera className="w-6 h-6" />}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
    </div>
  );
}
