import type {
  Connector,
  ConnectorContext,
  ListContactsResult,
  PushContactResult,
} from "../types.js";
import {
  mapGoogleContactToUnified,
  mapUnifiedToGoogleContact,
  type GooglePerson,
} from "../mappings/google-contacts.js";
import type { UnifiedContact } from "@highlevel/shared";

const GOOGLE_PEOPLE_API = "https://people.googleapis.com/v1";

export const googleContactsConnector: Connector = {
  meta: {
    id: "google-contacts",
    name: "Google Contacts",
    description: "Sync contacts from Google People API",
    logoUrl: "/connectors/google.svg",
    category: "productivity",
    authType: "oauth2",
    supportsPush: true,
  },

  oauth: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/contacts.readonly"],
    clientIdEnvKey: "GOOGLE_CLIENT_ID",
    clientSecretEnvKey: "GOOGLE_CLIENT_SECRET",
    usePkce: true,
  },

  async authenticate(ctx: ConnectorContext): Promise<boolean> {
    const res = await fetch(`${GOOGLE_PEOPLE_API}/people/me?personFields=names`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    return res.ok;
  },

  async listContacts(
    ctx: ConnectorContext,
    options?: { pageToken?: string; limit?: number }
  ): Promise<ListContactsResult> {
    const pageSize = Math.min(options?.limit ?? 100, 100);
    const params = new URLSearchParams({
      personFields: "names,emailAddresses,phoneNumbers,organizations",
      pageSize: String(pageSize),
    });
    if (options?.pageToken) params.set("pageToken", options.pageToken);

    const res = await fetch(
      `${GOOGLE_PEOPLE_API}/people/me/connections?${params}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Google API error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      connections?: GooglePerson[];
      nextPageToken?: string;
    };

    const contacts = (data.connections ?? []).map((p) => this.mapToUnified(p));

    return {
      contacts,
      hasMore: Boolean(data.nextPageToken),
      nextPageToken: data.nextPageToken,
    };
  },

  async pushContact(
    ctx: ConnectorContext,
    contact: UnifiedContact
  ): Promise<PushContactResult> {
    const body = mapUnifiedToGoogleContact(contact);
    const res = await fetch(`${GOOGLE_PEOPLE_API}/people:createContact`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return {
        externalId: contact.externalId,
        success: false,
        error: await res.text(),
      };
    }

    const created = (await res.json()) as GooglePerson;
    return {
      externalId: created.resourceName ?? contact.externalId,
      success: true,
    };
  },

  mapToUnified(externalRecord: unknown): UnifiedContact {
    return mapGoogleContactToUnified(externalRecord as GooglePerson);
  },
};
