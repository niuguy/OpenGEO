import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  category: z.string().trim().min(1, "Category is required"),
  location: z.string().trim().min(1, "Location is required"),
  websiteUrl: z.string().trim().url("Website URL must be valid"),
  competitors: z.array(z.string().trim().min(1)).default([]),
  targetAttributes: z.array(z.string().trim().min(1)).default([])
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
