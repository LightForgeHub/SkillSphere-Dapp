"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Briefcase,
  DollarSign,
  Globe,
  Github,
  Twitter,
  Tag,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import {
  expertRegistrationSchema,
  type ExpertRegistrationData,
  calculateHourlyRate,
  calculateMinuteRate,
  parseTags,
} from "@/utils/validation";
import { useWallet } from "@/providers/WalletProvider";

interface RegistrationFormProps {
  onSubmit?: (data: ExpertRegistrationData) => void | Promise<void>;
  defaultValues?: Partial<ExpertRegistrationData>;
}

const SUGGESTED_SKILLS = [
  "Soroban",
  "Rust",
  "Smart Contracts",
  "Stellar",
  "TypeScript",
  "WebRTC",
  "DeFi",
  "Zero-Knowledge",
  "Security Audits",
  "Next.js",
];

export default function RegistrationForm({
  onSubmit,
  defaultValues,
}: RegistrationFormProps) {
  const { address } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<ExpertRegistrationData>({
    resolver: zodResolver(expertRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      displayName: defaultValues?.displayName || "",
      title: defaultValues?.title || "",
      bio: defaultValues?.bio || "",
      tags: defaultValues?.tags || "",
      ratePerSecond: defaultValues?.ratePerSecond ?? 0.003,
      yearsOfExperience: defaultValues?.yearsOfExperience ?? 3,
      portfolioUrl: defaultValues?.portfolioUrl || "",
      githubUrl: defaultValues?.githubUrl || "",
      twitterUrl: defaultValues?.twitterUrl || "",
      languages: defaultValues?.languages || "English",
    },
  });

  const watchedRate = watch("ratePerSecond");
  const watchedBio = watch("bio") || "";
  const watchedTags = watch("tags") || "";
  const activeTags = parseTags(watchedTags);

  const hourlyRate = calculateHourlyRate(watchedRate);
  const minuteRate = calculateMinuteRate(watchedRate);

  function handleAddTag(tag: string) {
    if (activeTags.includes(tag)) return;
    if (activeTags.length >= 10) return;
    const newTags = [...activeTags, tag].join(", ");
    setValue("tags", newTags, { shouldValidate: true, shouldDirty: true });
  }

  function handleRemoveTag(tagToRemove: string) {
    const newTags = activeTags.filter((t) => t !== tagToRemove).join(", ");
    setValue("tags", newTags, { shouldValidate: true, shouldDirty: true });
  }

  async function handleFormSubmit(data: ExpertRegistrationData) {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setIsSuccess(true);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-card border border-border/80 rounded-2xl shadow-xl space-y-6">
      {/* Form Header */}
      <div className="border-b border-border/60 pb-5 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Expert Profile Registration
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Set up your verified expert profile to offer 1-on-1 consultations with real-time per-second streaming payments on Stellar.
            </p>
          </div>
        </div>

        {/* Connected Wallet Notice */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-purple-400" />
            <span className="text-muted-foreground">Payout Wallet:</span>
          </div>
          {address ? (
            <span className="font-mono text-purple-300 font-medium">
              {address.slice(0, 6)}…{address.slice(-6)}
            </span>
          ) : (
            <span className="text-amber-400">Connect wallet in navbar to receive streaming escrow</span>
          )}
        </div>
      </div>

      {isSuccess ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-emerald-300">
            Expert Profile Registered!
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Your profile and rate settings have been registered. Seekers can now discover and book per-second live sessions with you.
          </p>
          <button
            onClick={() => setIsSuccess(false)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs hover:bg-emerald-500 transition-colors"
          >
            Edit Profile Again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground/80">
              Basic Information
            </h3>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label htmlFor="displayName" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <User className="w-3.5 h-3.5 text-purple-400" />
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="e.g. Sarah Chen"
                {...register("displayName")}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
                  errors.displayName
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-border hover:border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              {errors.displayName && (
                <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.displayName.message}</span>
                </div>
              )}
            </div>

            {/* Professional Headline / Title */}
            <div className="space-y-1.5">
              <label htmlFor="title" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                Professional Headline
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g. Senior Soroban & Rust Smart Contract Architect"
                {...register("title")}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
                  errors.title
                    ? "border-red-500 focus:border-red-500"
                    : "border-border hover:border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              {errors.title && (
                <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.title.message}</span>
                </div>
              )}
            </div>

            {/* Bio with Character Counter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="bio" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  About / Bio <span className="text-red-400">*</span>
                </label>
                <span className={`text-[11px] font-mono ${watchedBio.length < 20 ? "text-amber-400" : "text-muted-foreground"}`}>
                  {watchedBio.length}/1000 chars (min 20)
                </span>
              </div>
              <textarea
                id="bio"
                rows={4}
                placeholder="Introduce yourself, your background, and the specific topics or challenges you help seekers solve during streaming consultations…"
                {...register("bio")}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none transition-colors ${
                  errors.bio
                    ? "border-red-500 focus:border-red-500"
                    : "border-border hover:border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              {errors.bio && (
                <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.bio.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Skills & Tags */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <label htmlFor="tags" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                Skills & Topics <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {activeTags.length}/10 tags
              </span>
            </div>

            <input
              id="tags"
              type="text"
              placeholder="e.g. Soroban, Rust, Smart Contracts, DeFi, TypeScript"
              {...register("tags")}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors ${
                errors.tags
                  ? "border-red-500 focus:border-red-500"
                  : "border-border hover:border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              }`}
            />
            {errors.tags && (
              <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.tags.message}</span>
              </div>
            )}

            {/* Active Tag Pills */}
            {activeTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/15 border border-purple-500/30 text-purple-300 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-white transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggested Tags */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground">Quick add suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleAddTag(skill)}
                    disabled={activeTags.includes(skill) || activeTags.length >= 10}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                      activeTags.includes(skill)
                        ? "bg-muted text-muted-foreground/50 border-transparent cursor-not-allowed"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border-border/60"
                    }`}
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Streaming Rate & Pricing Calculator */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <label htmlFor="ratePerSecond" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <DollarSign className="w-3.5 h-3.5 text-purple-400" />
              Per-Second Streaming Rate (XLM/s) <span className="text-red-400">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Rate per Second Input */}
              <div className="sm:col-span-1">
                <div className="relative">
                  <input
                    id="ratePerSecond"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="10"
                    placeholder="0.003"
                    {...register("ratePerSecond", { valueAsNumber: true })}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground font-mono outline-none transition-colors ${
                      errors.ratePerSecond
                        ? "border-red-500 focus:border-red-500"
                        : "border-border hover:border-purple-500/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    XLM/s
                  </span>
                </div>
              </div>

              {/* Calculated Rate Displays */}
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-center">
                <span className="text-[10px] text-muted-foreground">Per Minute</span>
                <span className="text-sm font-bold font-mono text-purple-300">
                  {minuteRate.toFixed(3)} XLM/min
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-600/10 border border-purple-500/30 flex flex-col justify-center">
                <span className="text-[10px] text-purple-300/80">Per Hour (~60 min)</span>
                <span className="text-sm font-bold font-mono text-purple-200">
                  {hourlyRate.toFixed(2)} XLM/hr
                </span>
              </div>
            </div>

            {errors.ratePerSecond && (
              <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.ratePerSecond.message}</span>
              </div>
            )}
          </div>

          {/* Section 4: Experience & Social Links */}
          <div className="space-y-4 pt-2 border-t border-border/40">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground/80">
              Credentials & Portfolio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Years of Experience */}
              <div className="space-y-1.5">
                <label htmlFor="yearsOfExperience" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Years of Experience
                </label>
                <input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="3"
                  {...register("yearsOfExperience", { valueAsNumber: true })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:border-purple-500"
                />
                {errors.yearsOfExperience && (
                  <p className="text-xs text-red-400">{errors.yearsOfExperience.message}</p>
                )}
              </div>

              {/* Languages */}
              <div className="space-y-1.5">
                <label htmlFor="languages" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  Languages Spoken
                </label>
                <input
                  id="languages"
                  type="text"
                  placeholder="e.g. English, Spanish"
                  {...register("languages")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground outline-none focus:border-purple-500"
                />
                {errors.languages && (
                  <p className="text-xs text-red-400">{errors.languages.message}</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              {/* Portfolio URL */}
              <div className="space-y-1.5">
                <label htmlFor="portfolioUrl" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  Portfolio / Website URL
                </label>
                <input
                  id="portfolioUrl"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  {...register("portfolioUrl")}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none ${
                    errors.portfolioUrl ? "border-red-500" : "border-border focus:border-purple-500"
                  }`}
                />
                {errors.portfolioUrl && (
                  <p className="text-xs text-red-400">{errors.portfolioUrl.message}</p>
                )}
              </div>

              {/* GitHub URL */}
              <div className="space-y-1.5">
                <label htmlFor="githubUrl" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Github className="w-3.5 h-3.5 text-purple-400" />
                  GitHub Profile
                </label>
                <input
                  id="githubUrl"
                  type="url"
                  placeholder="https://github.com/username"
                  {...register("githubUrl")}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none ${
                    errors.githubUrl ? "border-red-500" : "border-border focus:border-purple-500"
                  }`}
                />
                {errors.githubUrl && (
                  <p className="text-xs text-red-400">{errors.githubUrl.message}</p>
                )}
              </div>

              {/* Twitter URL */}
              <div className="space-y-1.5">
                <label htmlFor="twitterUrl" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Twitter className="w-3.5 h-3.5 text-purple-400" />
                  Twitter / X Profile
                </label>
                <input
                  id="twitterUrl"
                  type="url"
                  placeholder="https://x.com/username"
                  {...register("twitterUrl")}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-background border text-sm text-foreground placeholder:text-muted-foreground outline-none ${
                    errors.twitterUrl ? "border-red-500" : "border-border focus:border-purple-500"
                  }`}
                />
                {errors.twitterUrl && (
                  <p className="text-xs text-red-400">{errors.twitterUrl.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || (!isValid && isDirty)}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registering Profile…</span>
                </>
              ) : (
                <span>Complete Expert Registration</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
