"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProfileImageUploader } from "./ProfileImageUploader";
import { AboutSection } from "./AboutSection";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileData) => void;
  initialData: ProfileData;
}

export interface ProfileData {
  name: string;
  title: string;
  about: string;
  avatarUrl?: string;
}

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileData>(initialData);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleChange = (field: keyof ProfileData, value: string | File) => {
    if (field === "avatarUrl" && typeof value !== "string") {
      // Handle file upload separately or just use the preview URL for mock state
      const previewUrl = URL.createObjectURL(value as File);
      setFormData((prev) => ({ ...prev, avatarUrl: previewUrl }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-[900px] md:h-[580px] flex flex-col !rounded-[8px]"
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-[16px] pt-[17px] md:pt-[17px] pl-[24px] md:pl-[24px] custom-scrollbar text-xs focus:outline-none focus:ring-0">
        <div className="flex flex-col gap-[16px] pb-4">
        {/* Profile Image Uploader */}
        <ProfileImageUploader
          currentImage={formData.avatarUrl}
          onImageChange={(file) => handleChange("avatarUrl", file)}
        />

        {/* Input Fields */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/60 pl-1">Enter name</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Your full name"
              className="bg-transparent border-white/10 rounded-xl h-10 text-white/90 text-sm focus:border-purple-500/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/60 pl-1">Enter title</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Your professional title"
              className="bg-transparent border-white/10 rounded-xl h-10 text-white/90 text-sm focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* About Section */}
        <AboutSection
          value={formData.about}
          onChange={(value) => handleChange("about", value)}
        />

        {/* Save Button */}
        <div className="flex justify-center md:justify-start pt-4">
          <Button
            onClick={handleSave}
            className="w-full md:w-28 h-11 rounded-xl bg-[#1F1F1F] hover:bg-[#2F2F2F] text-white border-none shadow-lg text-sm font-bold tracking-wide"
          >
            SAVE
          </Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}
