import { z } from "zod";

export const UnifiedLeadSchema = z.object({
  id: z.string().optional(),
  externalId: z.string(),
  source: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).default("new"),
  companyName: z.string().optional(),
  campaignId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type UnifiedLead = z.infer<typeof UnifiedLeadSchema>;
