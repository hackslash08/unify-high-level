import { config } from "../config.js";
import { getTokens, saveTokens, tokenDocId } from "../lib/tokens.js";

interface HLContactPayload {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  source?: string;
  tags?: string[];
}

export async function refreshHighLevelToken(userId: string): Promise<string> {
  const docId = tokenDocId(userId, "highlevel");
  const tokens = await getTokens(docId);
  if (!tokens?.refreshToken) {
    throw new Error("HighLevel not connected or missing refresh token");
  }

  const body = new URLSearchParams({
    client_id: config.hl.clientId,
    client_secret: config.hl.clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    user_type: config.hl.userType,
    redirect_uri: config.hl.redirectUri,
  });

  const res = await fetch(config.hl.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`HL token refresh failed: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : undefined;

  await saveTokens(docId, {
    userId,
    provider: "highlevel",
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt,
  });

  return data.access_token;
}

export async function getHighLevelAccessToken(userId: string): Promise<string> {
  const docId = tokenDocId(userId, "highlevel");
  const tokens = await getTokens(docId);
  if (!tokens) throw new Error("HighLevel not connected");

  if (tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
    return refreshHighLevelToken(userId);
  }

  return tokens.accessToken;
}

export async function pushContactToHighLevel(
  userId: string,
  locationId: string,
  contact: HLContactPayload
): Promise<{ id: string }> {
  const accessToken = await getHighLevelAccessToken(userId);

  const res = await fetch(`${config.hl.apiBase}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      locationId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.name ?? contact.firstName,
      email: contact.email,
      phone: contact.phone,
      companyName: contact.companyName,
      tags: contact.tags,
      source: contact.source,
    }),
  });

  if (!res.ok) {
    throw new Error(`HL push failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { contact?: { id: string } };
  return { id: data.contact?.id ?? "unknown" };
}
