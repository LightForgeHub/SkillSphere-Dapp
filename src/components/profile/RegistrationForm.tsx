"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  expertRegistrationSchema,
  type ExpertRegistrationData,
} from "@/utils/validation";

interface RegistrationFormProps {
  onSubmit: (data: ExpertRegistrationData) => void;
}

export default function RegistrationForm({ onSubmit }: RegistrationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ExpertRegistrationData>({
    resolver: zodResolver(expertRegistrationSchema),
    mode: "onChange",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full max-w-lg">
      <h2 className="text-xl font-semibold text-white">Expert Registration</h2>

      {/* Display Name */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-white/60">Display Name</label>
        <Input placeholder="e.g. Sarah Chen" {...register("displayName")} />
        {errors.displayName && (
          <p className="text-xs text-red-400">{errors.displayName.message}</p>
        )}
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-white/60">Bio</label>
        <textarea
          placeholder="Tell seekers about your expertise (20–500 chars)"
          rows={4}
          {...register("bio")}
          className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
        />
        {errors.bio && (
          <p className="text-xs text-red-400">{errors.bio.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-white/60">Tags (comma-separated)</label>
        <Input placeholder="e.g. Rust, Solidity, DeFi" {...register("tags")} />
        {errors.tags && (
          <p className="text-xs text-red-400">{errors.tags.message}</p>
        )}
      </div>

      {/* Rate per second */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-white/60">Rate per Second (XLM)</label>
        <Input
          type="number"
          step="0.0001"
          placeholder="e.g. 0.003"
          {...register("ratePerSecond", { valueAsNumber: true })}
        />
        {errors.ratePerSecond && (
          <p className="text-xs text-red-400">{errors.ratePerSecond.message}</p>
        )}
      </div>

      {/* Portfolio URL */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-white/60">Portfolio URL (optional)</label>
        <Input placeholder="https://yourportfolio.com" {...register("portfolioUrl")} />
        {errors.portfolioUrl && (
          <p className="text-xs text-red-400">{errors.portfolioUrl.message}</p>
        )}
      </div>

      <Button type="submit" disabled={!isValid}>
        Register as Expert
      </Button>
    </form>
  );
}
