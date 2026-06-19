import { Router } from "express";
import { getConnector, getConnectorMetaList } from "@highlevel/connectors";
import { UnifiedContactSchema } from "@highlevel/shared";
import { db, collections } from "../lib/firestore.js";
import { getTokens, tokenDocId, deleteTokens } from "../lib/tokens.js";
import type { AuthedRequest } from "../lib/auth-middleware.js";
import { requireAuth } from "../lib/auth-middleware.js";
import { runSync } from "../services/sync-engine.js";
import type { ConnectorContext } from "@highlevel/connectors";

export const apiRouter = Router();

apiRouter.use(requireAuth);

/** List connector metadata for UI */
apiRouter.get("/connectors", (_req, res) => {
  res.json({ connectors: getConnectorMetaList() });
});

/** User connections with status */
apiRouter.get("/connections", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const snap = await db
    .collection(collections.connections)
    .where("userId", "==", userId)
    .get();

  res.json({
    connections: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
});

/** Disconnect connector */
apiRouter.delete("/connections/:connectionId", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const connectionId = String(req.params.connectionId);
  const snap = await db.collection(collections.connections).doc(connectionId).get();

  if (!snap.exists || snap.data()?.userId !== userId) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }

  const connectorId = snap.data()?.connectorId as string;
  await snap.ref.delete();
  await deleteTokens(tokenDocId(userId, connectorId));
  res.json({ success: true });
});

/** Unified GET /contacts */
apiRouter.get("/contacts", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const source = req.query.source as string | undefined;

  const connectionsSnap = await db
    .collection(collections.connections)
    .where("userId", "==", userId)
    .get();

  const allContacts: unknown[] = [];

  for (const connDoc of connectionsSnap.docs) {
    const conn = connDoc.data();
    if (source && conn.connectorId !== source) continue;
    if (conn.status !== "connected") continue;

    const connector = getConnector(conn.connectorId as string);
    if (!connector) continue;

    let tokens = await getTokens(tokenDocId(userId, conn.connectorId as string));
    if (!tokens && connector.meta.isMock) {
      tokens = { accessToken: "mock-token" };
    }
    if (!tokens) continue;

    const ctx: ConnectorContext = {
      userId,
      connectionId: connDoc.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    try {
      let pageToken: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const page = await connector.listContacts(ctx, { pageToken, limit: 100 });
        allContacts.push(...page.contacts);
        hasMore = page.hasMore;
        pageToken = page.nextPageToken;
      }
    } catch (err) {
      console.error(`Failed to list contacts for ${conn.connectorId}:`, err);
    }
  }

  res.json({ contacts: allContacts, count: allContacts.length });
});

/** Unified POST /contacts */
apiRouter.post("/contacts", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const source = req.body?.source as string;
  if (!source) {
    res.status(400).json({ error: "source is required" });
    return;
  }

  const parsed = UnifiedContactSchema.safeParse(req.body?.contact);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const connectionsSnap = await db
    .collection(collections.connections)
    .where("userId", "==", userId)
    .where("connectorId", "==", source)
    .limit(1)
    .get();

  if (connectionsSnap.empty) {
    res.status(404).json({ error: "No connection for source" });
    return;
  }

  const conn = connectionsSnap.docs[0];
  const connector = getConnector(source);
  if (!connector) {
    res.status(404).json({ error: "Connector not found" });
    return;
  }

  const tokens = await getTokens(tokenDocId(userId, source));
  if (!tokens) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const result = await connector.pushContact(
    {
      userId,
      connectionId: conn.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
    parsed.data
  );

  res.json(result);
});

/** Trigger manual sync */
apiRouter.post("/sync", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { connectionId, connectorId } = req.body as {
    connectionId: string;
    connectorId: string;
  };

  if (!connectionId || !connectorId) {
    res.status(400).json({ error: "connectionId and connectorId required" });
    return;
  }

  try {
    const syncRunId = await runSync({
      userId,
      connectionId,
      connectorId,
      triggeredBy: "manual",
    });
    res.json({ syncRunId, status: "started" });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Webhook simulation */
apiRouter.post("/webhook/simulate", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { connectionId, connectorId, payload } = req.body as {
    connectionId: string;
    connectorId: string;
    payload?: unknown;
  };

  if (!connectionId || !connectorId) {
    res.status(400).json({ error: "connectionId and connectorId required" });
    return;
  }

  try {
    const syncRunId = await runSync({
      userId,
      connectionId,
      connectorId,
      triggeredBy: "webhook",
      webhookPayload: payload,
    });
    res.json({ syncRunId, status: "webhook_sync_started" });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Sync history */
apiRouter.get("/sync-runs", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const snap = await db
    .collection(collections.syncRuns)
    .where("userId", "==", userId)
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();

  res.json({
    syncRuns: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
});

/** Per-record sync errors */
apiRouter.get("/sync-runs/:syncRunId/errors", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const syncRunId = String(req.params.syncRunId);

  const runSnap = await db.collection(collections.syncRuns).doc(syncRunId).get();
  if (!runSnap.exists || runSnap.data()?.userId !== userId) {
    res.status(404).json({ error: "Sync run not found" });
    return;
  }

  const errorsSnap = await db
    .collection(collections.syncErrors)
    .where("syncRunId", "==", syncRunId)
    .orderBy("createdAt", "asc")
    .get();

  res.json({
    errors: errorsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
});

/** User profile / HL status */
apiRouter.get("/me", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const userSnap = await db.collection(collections.users).doc(userId).get();
  const hlTokens = await getTokens(tokenDocId(userId, "highlevel"));

  res.json({
    userId,
    hlConnected: Boolean(hlTokens),
    profile: userSnap.data() ?? {},
  });
});
