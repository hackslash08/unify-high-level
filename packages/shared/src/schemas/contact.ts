import { z } from "zod";

export const UnifiedContactSchema = z.object({
  id: z.string().optional(),
  externalId: z.string(),
  source: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type UnifiedContact = z.infer<typeof UnifiedContactSchema>;
