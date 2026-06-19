import { z } from "zod";

export const SyncRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "partial",
]);

export type SyncRunStatus = z.infer<typeof SyncRunStatusSchema>;

export const SyncRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  connectionId: z.string(),
  connectorId: z.string(),
  direction: z.enum(["external_to_highlevel", "highlevel_to_external", "bidirectional"]),
  status: SyncRunStatusSchema,
  triggeredBy: z.enum(["manual", "webhook", "scheduled"]),
  recordsProcessed: z.number().int().nonnegative().default(0),
  recordsSucceeded: z.number().int().nonnegative().default(0),
  recordsFailed: z.number().int().nonnegative().default(0),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

export type SyncRun = z.infer<typeof SyncRunSchema>;

export const SyncErrorSchema = z.object({
  id: z.string(),
  syncRunId: z.string(),
  userId: z.string(),
  externalId: z.string().optional(),
  recordType: z.enum(["contact", "company", "lead"]),
  message: z.string(),
  payload: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
});

export type SyncError = z.infer<typeof SyncErrorSchema>;
