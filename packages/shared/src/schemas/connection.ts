import { z } from "zod";

export const ConnectionStatusSchema = z.enum([
  "disconnected",
  "connecting",
  "connected",
  "error",
  "expired",
]);

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ConnectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  connectorId: z.string(),
  status: ConnectionStatusSchema,
  externalAccountId: z.string().optional(),
  externalAccountName: z.string().optional(),
  lastSyncAt: z.string().datetime().optional(),
  lastSyncRecordCount: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Connection = z.infer<typeof ConnectionSchema>;
