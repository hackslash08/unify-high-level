import { getConnector } from "@highlevel/connectors";
import { UnifiedContactSchema, type UnifiedContact } from "@highlevel/shared";
import { db, collections } from "../lib/firestore.js";
import { getTokens, tokenDocId } from "../lib/tokens.js";
import {
  acquireSyncLock,
  checkRateLimit,
  enforceRecordLimit,
} from "../lib/guardrails.js";
import { pushContactToHighLevel } from "./highlevel.js";
import type { ConnectorContext } from "@highlevel/connectors";

export interface SyncOptions {
  userId: string;
  connectionId: string;
  connectorId: string;
  triggeredBy: "manual" | "webhook" | "scheduled";
  webhookPayload?: unknown;
}

export async function runSync(options: SyncOptions): Promise<string> {
  const { userId, connectionId, connectorId, triggeredBy } = options;
  checkRateLimit(userId);

  const connector = getConnector(connectorId);
  if (!connector) throw new Error(`Unknown connector: ${connectorId}`);

  const connectionSnap = await db
    .collection(collections.connections)
    .doc(connectionId)
    .get();

  if (!connectionSnap.exists) throw new Error("Connection not found");
  const connection = connectionSnap.data()!;
  if (connection.userId !== userId) throw new Error("Unauthorized");

  const lock = await acquireSyncLock(connectionId);
  const syncRunRef = db.collection(collections.syncRuns).doc();
  const startedAt = new Date().toISOString();

  await syncRunRef.set({
    id: syncRunRef.id,
    userId,
    connectionId,
    connectorId,
    direction: "external_to_highlevel",
    status: "running",
    triggeredBy,
    recordsProcessed: 0,
    recordsSucceeded: 0,
    recordsFailed: 0,
    startedAt,
  });

  let recordsProcessed = 0;
  let recordsSucceeded = 0;
  let recordsFailed = 0;

  try {
    const tokenDoc = tokenDocId(userId, connectorId);
    let tokens = await getTokens(tokenDoc);

    if (!tokens && !connector.meta.isMock) {
      throw new Error("Connector not authenticated");
    }

    if (connector.meta.isMock) {
      tokens = { accessToken: "mock-token" };
    }

    const ctx: ConnectorContext = {
      userId,
      connectionId,
      accessToken: tokens!.accessToken,
      refreshToken: tokens?.refreshToken,
    };

    const hlUserSnap = await db.collection(collections.users).doc(userId).get();
    const locationId = hlUserSnap.data()?.hlLocationId as string | undefined;
    if (!locationId) {
      throw new Error("HighLevel location not configured. Connect HighLevel first.");
    }

    const allContacts: UnifiedContact[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const page = await connector.listContacts(ctx, {
        pageToken,
        limit: 100,
      });
      allContacts.push(...page.contacts);
      hasMore = page.hasMore;
      pageToken = page.nextPageToken;
      if (allContacts.length >= 1000) break;
    }

    enforceRecordLimit(allContacts.length);

    for (const raw of allContacts) {
      recordsProcessed += 1;
      try {
        const contact = UnifiedContactSchema.parse(raw);
        await pushContactToHighLevel(userId, locationId, {
          firstName: contact.firstName,
          lastName: contact.lastName,
          name: contact.fullName,
          email: contact.email,
          phone: contact.phone,
          companyName: contact.companyName,
          source: contact.source,
          tags: contact.tags,
        });
        recordsSucceeded += 1;
      } catch (err) {
        recordsFailed += 1;
        await db.collection(collections.syncErrors).add({
          syncRunId: syncRunRef.id,
          userId,
          externalId: raw.externalId,
          recordType: "contact",
          message: err instanceof Error ? err.message : String(err),
          payload: raw,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const status =
      recordsFailed === 0
        ? "completed"
        : recordsSucceeded > 0
          ? "partial"
          : "failed";

    await syncRunRef.update({
      status,
      recordsProcessed,
      recordsSucceeded,
      recordsFailed,
      completedAt: new Date().toISOString(),
    });

    await db.collection(collections.connections).doc(connectionId).update({
      lastSyncAt: new Date().toISOString(),
      lastSyncRecordCount: recordsSucceeded,
      updatedAt: new Date().toISOString(),
    });

    return syncRunRef.id;
  } catch (err) {
    await syncRunRef.update({
      status: "failed",
      recordsProcessed,
      recordsSucceeded,
      recordsFailed,
      completedAt: new Date().toISOString(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    await lock.release();
  }
}
