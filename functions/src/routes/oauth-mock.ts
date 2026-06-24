import { Router } from "express";
import * as crypto from "node:crypto";
import { getConnector } from "@highlevel/connectors";
import { db, collections } from "../lib/firestore.js";
import { connectorRedirectUri, mockApproveUrl } from "../lib/oauth-utils.js";

export const oauthMockRouter = Router();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function consentHtml(connectorName: string, approveUrl: string, state: string): string {
  const safeState = escapeHtml(state);
  const safeApproveUrl = escapeHtml(approveUrl);
  const safeName = escapeHtml(connectorName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize ${safeName}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 4rem auto; padding: 0 1rem; }
    h1 { font-size: 1.25rem; }
    p { color: #444; line-height: 1.5; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; }
    button { background: #635bff; color: #fff; border: none; padding: 0.75rem 1.25rem;
      border-radius: 6px; font-size: 1rem; cursor: pointer; width: 100%; margin-top: 1rem; }
    button:hover { background: #4f46e5; }
    .scopes { font-size: 0.875rem; background: #f5f5f5; padding: 0.75rem; border-radius: 4px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 0.75rem;
      padding: 0.15rem 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">OAuth 2.0 (simulated)</span>
    <h1>Authorize ${safeName}</h1>
    <p>Unify is requesting access to your account via OAuth 2.0 authorization code flow.</p>
    <div class="scopes">
      <strong>Requested scopes:</strong>
      <ul><li>read:customers</li><li>read:contacts</li></ul>
    </div>
    <form method="get" action="${safeApproveUrl}">
      <input type="hidden" name="state" value="${safeState}" />
      <button type="submit">Approve &amp; connect</button>
    </form>
  </div>
</body>
</html>`;
}

function queryParam(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/** Simulated OAuth provider consent screen */
oauthMockRouter.get("/consent", async (req, res) => {
  const state = queryParam(req.query.state);
  const connectorId = queryParam(req.query.connector);

  if (!state || !connectorId) {
    res.status(400).send("Missing state or connector");
    return;
  }

  const stateSnap = await db.collection(collections.oauthStates).doc(state).get();
  if (!stateSnap.exists) {
    res.status(400).send("Invalid or expired OAuth state");
    return;
  }

  const connector = getConnector(connectorId);
  if (!connector?.meta.isMock) {
    res.status(400).send("Not a mock OAuth connector");
    return;
  }

  res.type("html").send(consentHtml(connector.meta.name, mockApproveUrl(), state));
});

/** User approved — issue auth code and redirect to connector callback */
oauthMockRouter.get("/approve", async (req, res) => {
  const state = queryParam(req.query.state);
  if (!state) {
    res.status(400).send("Missing state");
    return;
  }

  const stateRef = db.collection(collections.oauthStates).doc(state);
  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) {
    res.status(400).send("Invalid or expired OAuth state");
    return;
  }

  const { provider: connectorId } = stateSnap.data() as { provider: string };
  const authCode = `mock_code_${crypto.randomBytes(12).toString("hex")}`;

  await stateRef.update({ mockAuthCode: authCode, approvedAt: Date.now() });

  const redirectUri = connectorRedirectUri(connectorId);
  const callback = new URL(redirectUri);
  callback.searchParams.set("code", authCode);
  callback.searchParams.set("state", state);

  res.redirect(callback.toString());
});
