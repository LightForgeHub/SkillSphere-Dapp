import { z } from "zod";

/**
 * URL validation regex helper supporting http://, https:// or empty
 */
const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid URL starting with http:// or https://" }
  );

/**
 * GitHub Profile URL validator
 */
const optionalGithubUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => {
      if (!val || val === "") return true;
      try {
        const parsed = new URL(val);
        return (
          (parsed.protocol === "http:" || parsed.protocol === "https:") &&
          parsed.hostname.toLowerCase().includes("github.com")
        );
      } catch {
        return false;
      }
    },
    { message: "Must be a valid GitHub URL (e.g. https://github.com/username)" }
  );

/**
 * Zod Schema for Expert Registration
 */
export const expertRegistrationSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(60, "Display name must be 60 characters or fewer")
    .regex(/^[a-zA-Z0-9\s._'-]+$/, {
      message: "Display name contains invalid characters",
    }),

  title: z
    .string()
    .trim()
    .min(3, "Professional title must be at least 3 characters")
    .max(80, "Professional title must be 80 characters or fewer")
    .optional()
    .or(z.literal("")),

  bio: z
    .string()
    .trim()
    .min(20, "Bio must be at least 20 characters to explain your expertise")
    .max(1000, "Bio must be 1000 characters or fewer"),

  tags: z
    .string()
    .trim()
    .min(1, "At least one skill tag is required")
    .max(200, "Tags string must be 200 characters or fewer")
    .refine(
      (val) => {
        const parsed = val
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        return parsed.length >= 1 && parsed.length <= 10;
      },
      { message: "Please provide between 1 and 10 comma-separated skill tags" }
    ),

  ratePerSecond: z
    .number({ invalid_type_error: "Rate per second must be a valid number" })
    .positive("Rate must be greater than 0")
    .min(0.0001, "Minimum rate is 0.0001 XLM/s")
    .max(10, "Maximum rate is 10 XLM/s"),

  yearsOfExperience: z
    .number({ invalid_type_error: "Years of experience must be a number" })
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience must be 50 or fewer")
    .optional()
    .nullable(),

  portfolioUrl: optionalUrlSchema,

  githubUrl: optionalGithubUrlSchema,

  twitterUrl: optionalUrlSchema,

  languages: z
    .string()
    .trim()
    .max(100, "Languages must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type ExpertRegistrationData = z.infer<typeof expertRegistrationSchema>;

/**
 * Utility functions for rate calculations
 */
export function calculateMinuteRate(ratePerSecond: number): number {
  if (!ratePerSecond || isNaN(ratePerSecond)) return 0;
  return Number((ratePerSecond * 60).toFixed(4));
}

export function calculateHourlyRate(ratePerSecond: number): number {
  if (!ratePerSecond || isNaN(ratePerSecond)) return 0;
  return Number((ratePerSecond * 3600).toFixed(2));
}

export function parseTags(tagsInput: string): string[] {
  if (!tagsInput) return [];
  return tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
