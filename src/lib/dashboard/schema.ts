import { z } from "zod";

export const milestoneTypes = ["relationship", "birthday", "anniversary", "travel", "achievement", "custom"] as const;

export const milestoneSchema = z.object({
  returnCreated: z.enum(["true","false"]).default("false"),
  location: z.string().trim().max(240).optional().transform(v=>v||null),
  title: z.string().trim().min(1, "Name the milestone.").max(120),
  description: z.string().trim().max(2000).optional().transform((value) => value || null),
  type: z.enum(milestoneTypes),
  milestoneDate: z.iso.date("Choose a valid date."),
  featured: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});
