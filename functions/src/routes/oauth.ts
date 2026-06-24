import { Router } from "express";
import * as crypto from "node:crypto";
import { getConnector } from "@highlevel/connectors";
import { config } from "../config.js";
import { db, collections } from "../lib/firestore.js";
import { saveTokens, tokenDocId } from "../lib/tokens.js";
import type { AuthedRequest } from "../lib/auth-middleware.js";
import { requireAuth } from "../lib/auth-middleware.js";
import {
  connectorRedirectUri,
  mockConsentUrl,
} from "../lib/oauth-utils.js";

export const oauthRouter = Router();

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

function hubspotOAuthConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
}

/** HighLevel OAuth — start */
oauthRouter.get("/hl/authorize", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const state = crypto.randomBytes(16).toString("hex");

  await db.collection(collections.oauthStates).doc(state).set({
    userId,
    provider: "highlevel",
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.hl.clientId,
    redirect_uri: config.hl.redirectUri,
    scope: config.hl.scopes,
    state,
    version_id: config.hl.appId,
  });

  const authorizeBase = config.hl.installUrl || config.hl.authorizeUrl;
  const url = new URL(authorizeBase);
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }

  res.json({ url: url.toString(), flow: "oauth2_authorization_code" });
});

/** HighLevel OAuth — callback */
oauthRouter.get("/hl/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) {
    res.status(400).send("Missing code or state");
    return;
  }

  const stateSnap = await db.collection(collections.oauthStates).doc(state).get();
  if (!stateSnap.exists) {
    res.status(400).send("Invalid state");
    return;
  }

  const { userId } = stateSnap.data() as { userId: string };
  await db.collection(collections.oauthStates).doc(state).delete();

  const body = new URLSearchParams({
    client_id: config.hl.clientId,
    client_secret: config.hl.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.hl.redirectUri,
    user_type: config.hl.userType,
  });

  const tokenRes = await fetch(config.hl.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!tokenRes.ok) {
    res.status(500).send(`Token exchange failed: ${await tokenRes.text()}`);
    return;
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    locationId?: string;
    companyId?: string;
  };

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : undefined;

  await saveTokens(tokenDocId(userId, "highlevel"), {
    userId,
    provider: "highlevel",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  });

  await db.collection(collections.users).doc(userId).set(
    {
      hlConnected: true,
      hlLocationId: tokens.locationId,
      hlCompanyId: tokens.companyId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  res.redirect(`${config.appUrl}/settings?hl=connected`);
});

/** Connector OAuth — start */
oauthRouter.get(
  "/connector/:connectorId/authorize",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const connectorId = String(req.params.connectorId);
    const connector = getConnector(connectorId);

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    /** HubSpot: prefer OAuth 2.0; fall back to private app token only if OAuth not configured */
    if (connectorId === "hubspot" && !hubspotOAuthConfigured()) {
      const envKey = connector.meta.privateTokenEnvKey ?? "HUBSPOT_PRIVATE_APP_TOKEN";
      const accessToken = process.env[envKey];
      if (!accessToken) {
        res.status(500).json({
          error:
            "HubSpot OAuth not configured. Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET (or HUBSPOT_PRIVATE_APP_TOKEN for dev).",
        });
        return;
      }

      const connectionRef = db.collection(collections.connections).doc();
      const ctx = {
        userId,
        connectionId: connectionRef.id,
        accessToken,
      };

      const valid = await connector.authenticate(ctx);
      if (!valid) {
        res.status(401).json({ error: "Invalid private app token" });
        return;
      }

      await connectionRef.set({
        id: connectionRef.id,
        userId,
        connectorId,
        status: "connected",
        externalAccountName: "HubSpot Private App",
        authMethod: "private_token",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await saveTokens(tokenDocId(userId, connectorId), {
        userId,
        provider: connectorId,
        accessToken,
      });
      res.json({
        url: `${config.appUrl}/connectors/${connectorId}?connected=true`,
        flow: "private_token",
      });
      return;
    }

    if (!connector.oauth) {
      res.status(400).json({ error: "Connector does not support OAuth" });
      return;
    }

    const state = crypto.randomBytes(16).toString("hex");
    const pkce = connector.oauth.usePkce ? generatePkce() : undefined;

    const oauthState: Record<string, unknown> = {
      userId,
      provider: connectorId,
      createdAt: Date.now(),
    };
    if (pkce?.verifier) {
      oauthState.codeVerifier = pkce.verifier;
    }

    await db.collection(collections.oauthStates).doc(state).set(oauthState);

    /** Mock connectors: simulated OAuth consent screen (authorization code flow) */
    if (connector.meta.isMock) {
      res.json({
        url: mockConsentUrl(state, connectorId),
        flow: "oauth2_authorization_code_mock",
      });
      return;
    }

    const clientId = process.env[connector.oauth.clientIdEnvKey] ?? "";
    if (!clientId) {
      res.status(500).json({
        error: `${connector.oauth.clientIdEnvKey} is not configured on the server`,
      });
      return;
    }

    const redirectUri = connectorRedirectUri(connectorId);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: connector.oauth.scopes.join(" "),
      state,
    });

    if (connectorId === "google-contacts") {
      params.set("access_type", "offline");
      params.set("prompt", "consent");
    }

    if (pkce) {
      params.set("code_challenge", pkce.challenge);
      params.set("code_challenge_method", "S256");
    }

    res.json({
      url: `${connector.oauth.authorizeUrl}?${params.toString()}`,
      flow: "oauth2_authorization_code",
    });
  }
);

/** Connector OAuth — callback */
oauthRouter.get("/connector/:connectorId/callback", async (req, res) => {
  const connectorId = String(req.params.connectorId);
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    res.status(400).send("Missing code or state");
    return;
  }

  const connector = getConnector(connectorId);
  if (!connector) {
    res.status(404).send("Connector not found");
    return;
  }

  const stateSnap = await db.collection(collections.oauthStates).doc(state).get();
  if (!stateSnap.exists) {
    res.status(400).send("Invalid state");
    return;
  }

  const stateData = stateSnap.data() as {
    userId: string;
    codeVerifier?: string;
    mockAuthCode?: string;
  };

  const { userId, codeVerifier, mockAuthCode } = stateData;
  await db.collection(collections.oauthStates).doc(state).delete();

  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresAt: string | undefined;

  /** Mock OAuth: validate authorization code issued by our mock provider */
  if (connector.meta.isMock) {
    if (!mockAuthCode || mockAuthCode !== code) {
      res.status(400).send("Invalid authorization code");
      return;
    }
    accessToken = `mock_access_${crypto.randomBytes(8).toString("hex")}`;
    refreshToken = `mock_refresh_${crypto.randomBytes(8).toString("hex")}`;
    expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  } else {
    if (!connector.oauth) {
      res.status(400).send("Connector does not support OAuth");
      return;
    }

    const clientId = process.env[connector.oauth.clientIdEnvKey] ?? "";
    const clientSecret = process.env[connector.oauth.clientSecretEnvKey] ?? "";
    const redirectUri = connectorRedirectUri(connectorId);

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    if (codeVerifier) body.set("code_verifier", codeVerifier);

    const tokenRes = await fetch(connector.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!tokenRes.ok) {
      res.status(500).send(`Token exchange failed: ${await tokenRes.text()}`);
      return;
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined;
  }

  await saveTokens(tokenDocId(userId, connectorId), {
    userId,
    provider: connectorId,
    accessToken,
    refreshToken,
    expiresAt,
  });

  const connectionRef = db.collection(collections.connections).doc();
  await connectionRef.set({
    id: connectionRef.id,
    userId,
    connectorId,
    status: "connected",
    authMethod: connector.meta.isMock ? "oauth2_mock" : "oauth2",
    externalAccountName: connector.meta.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  res.redirect(`${config.appUrl}/connectors/${connectorId}?connected=true`);
});
