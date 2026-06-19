import { z } from "zod";

export const UnifiedCompanySchema = z.object({
  id: z.string().optional(),
  externalId: z.string(),
  source: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  industry: z.string().optional(),
  phone: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type UnifiedCompany = z.infer<typeof UnifiedCompanySchema>;
