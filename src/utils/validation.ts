import { z } from "zod";

export const expertRegistrationSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be 60 characters or fewer"),

  bio: z
    .string()
    .min(20, "Bio must be at least 20 characters")
    .max(500, "Bio must be 500 characters or fewer"),

  tags: z
    .string()
    .min(1, "At least one tag is required")
    .max(100, "Tags must be 100 characters or fewer"),

  ratePerSecond: z
    .number({ invalid_type_error: "Rate must be a number" })
    .positive("Rate must be greater than 0")
    .max(1, "Rate must be 1 XLM/s or less"),

  portfolioUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type ExpertRegistrationData = z.infer<typeof expertRegistrationSchema>;
