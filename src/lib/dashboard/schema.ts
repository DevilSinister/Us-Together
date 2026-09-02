import { z } from "zod";

export const milestoneTypes = ["relationship", "birthday", "anniversary", "travel", "achievement", "custom"] as const;

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Name the milestone.").max(120),
  description: z.string().trim().max(2000).optional().transform((value) => value || null),
  type: z.enum(milestoneTypes),
  milestoneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  featured: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});
