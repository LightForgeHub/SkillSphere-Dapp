"use client";

import { useState } from "react";
import { Plus, X, Loader2, Check, AlertCircle } from "lucide-react";

interface ProfileFormData {
  displayName: string;
  bio: string;
  profileImageUrl: string;
  ratePerSecond: string;
  skillTags: string[];
}

interface ProfileSettingsProps {
  initialData?: Partial<ProfileFormData>;
  onSubmit?: (data: ProfileFormData) => Promise<void>;
}

const SUGGESTED_SKILLS = [
  "Web Development",
  "React",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Python",
  "Blockchain",
  "Solidity",
  "UI/UX Design",
  "Data Science",
  "Machine Learning",
  "DevOps",
  "Cloud Architecture",
  "Database Design",
  "Mobile Development",
];

export default function ProfileSettings({
  initialData = {},
  onSubmit,
}: ProfileSettingsProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: initialData.displayName || "",
    bio: initialData.bio || "",
    profileImageUrl: initialData.profileImageUrl || "",
    ratePerSecond: initialData.ratePerSecond || "",
    skillTags: initialData.skillTags || [],
  });

  const [newSkillTag, setNewSkillTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addSkillTag = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (!trimmedSkill) return;
    if (formData.skillTags.includes(trimmedSkill)) return;
    if (formData.skillTags.length >= 10) {
      setError("Maximum 10 skills allowed");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      skillTags: [...prev.skillTags, trimmedSkill],
    }));
    setNewSkillTag("");
    setError(null);
  };

  const removeSkillTag = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skillTags: prev.skillTags.filter((s) => s !== skill),
    }));
  };

  const handleAddSkillClick = () => {
    addSkillTag(newSkillTag);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkillTag(newSkillTag);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      setError("Display name is required");
      return;
    }

    if (!formData.ratePerSecond || parseFloat(formData.ratePerSecond) <= 0) {
      setError("Rate per second must be greater than 0");
      return;
    }

    if (formData.skillTags.length === 0) {
      setError("Please add at least one skill tag");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    (skill) =>
      !formData.skillTags.includes(skill) &&
      skill.toLowerCase().includes(newSkillTag.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Profile Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Update your profile information and expertise
        </p>
      </div>

      {/* Profile Image URL */}
      <div className="space-y-2">
        <label
          htmlFor="profileImageUrl"
          className="block text-sm font-semibold text-zinc-200"
        >
          Profile Image URL
        </label>
        <input
          id="profileImageUrl"
          type="url"
          name="profileImageUrl"
          value={formData.profileImageUrl}
          onChange={handleInputChange}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        {formData.profileImageUrl && (
          <div className="mt-2 relative inline-block">
            <img
              src={formData.profileImageUrl}
              alt="Profile preview"
              className="h-20 w-20 rounded-lg object-cover border border-zinc-700"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <label
          htmlFor="displayName"
          className="block text-sm font-semibold text-zinc-200"
        >
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          name="displayName"
          value={formData.displayName}
          onChange={handleInputChange}
          placeholder="Your name"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label
          htmlFor="bio"
          className="block text-sm font-semibold text-zinc-200"
        >
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Tell us about your expertise and experience"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
          rows={4}
        />
      </div>

      {/* Rate Per Second */}
      <div className="space-y-2">
        <label
          htmlFor="ratePerSecond"
          className="block text-sm font-semibold text-zinc-200"
        >
          Rate Per Second (XLM)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="ratePerSecond"
            type="number"
            name="ratePerSecond"
            value={formData.ratePerSecond}
            onChange={handleInputChange}
            placeholder="0.001"
            step="0.0001"
            min="0"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <span className="text-sm text-zinc-400">XLM/sec</span>
        </div>
        {formData.ratePerSecond && (
          <p className="text-xs text-zinc-500">
            ≈ {(parseFloat(formData.ratePerSecond) * 3600).toFixed(4)} XLM/hour
          </p>
        )}
      </div>

      {/* Skill Tags */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-zinc-200">
          Skill Tags ({formData.skillTags.length}/10)
        </label>

        {/* Input with suggestions */}
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillTag}
              onChange={(e) => setNewSkillTag(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Add a skill..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleAddSkillClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white font-medium text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {/* Suggestions */}
          {showSuggestions && newSkillTag && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-zinc-700 bg-zinc-800 shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    addSkillTag(skill);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700/40 transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Added tags */}
        <div className="flex flex-wrap gap-2">
          {formData.skillTags.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/50 text-sm text-violet-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeSkillTag(tag)}
                className="rounded p-0.5 hover:bg-violet-500/30 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-start gap-3">
          <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-400">
            Profile updated successfully!
          </p>
        </div>
      )}

      {/* Submit button */}
      <div className="flex gap-3 border-t border-zinc-800 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
}
