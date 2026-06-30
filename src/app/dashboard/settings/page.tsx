"use client";

import { useState } from "react";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import type { ProfileFormData } from "@/components/dashboard/ProfileSettings";

export default function SettingsPage() {
  const [initialData] = useState({
    displayName: "Expert Name",
    bio: "Experienced developer and consultant",
    profileImageUrl: "",
    ratePerSecond: "0.001",
    skillTags: ["React", "TypeScript", "Node.js"],
  });

  const handleProfileSubmit = async (data: any) => {
    try {
      const response = await fetch("/api/users/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving profile:", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <ProfileSettings
          initialData={initialData}
          onSubmit={handleProfileSubmit}
        />
      </div>
    </div>
  );
}
