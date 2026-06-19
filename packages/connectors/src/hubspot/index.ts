import type {
  Connector,
  ConnectorContext,
  ListContactsResult,
  PushContactResult,
} from "../types.js";
import {
  mapHubSpotContactToUnified,
  mapUnifiedToHubSpotContact,
  type HubSpotContact,
} from "../mappings/hubspot.js";
import type { UnifiedContact } from "@highlevel/shared";

const HUBSPOT_API = "https://api.hubapi.com";
const CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "company",
  "jobtitle",
  "hs_lead_status",
  "createdate",
  "lastmodifieddate",
].join(",");

export const hubspotConnector: Connector = {
  meta: {
    id: "hubspot",
    name: "HubSpot",
    description:
      "HubSpot CRM via Private App access token. Create a Private App in HubSpot Settings and set HUBSPOT_PRIVATE_APP_TOKEN in functions/.env.",
    logoUrl: "/connectors/hubspot.svg",
    category: "crm",
    authType: "private_token",
    privateTokenEnvKey: "HUBSPOT_PRIVATE_APP_TOKEN",
    supportsPush: true,
  },

  async authenticate(ctx: ConnectorContext): Promise<boolean> {
    const res = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts?limit=1&properties=firstname`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
    );
    return res.ok;
  },

  async listContacts(
    ctx: ConnectorContext,
    options?: { pageToken?: string; limit?: number }
  ): Promise<ListContactsResult> {
    const limit = Math.min(options?.limit ?? 100, 100);
    const params = new URLSearchParams({
      limit: String(limit),
      properties: CONTACT_PROPERTIES,
    });
    if (options?.pageToken) params.set("after", options.pageToken);

    const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts?${params}`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`HubSpot API error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      results?: HubSpotContact[];
      paging?: { next?: { after?: string } };
    };

    const contacts = (data.results ?? []).map((c) => this.mapToUnified(c));
    const nextPageToken = data.paging?.next?.after;

    return {
      contacts,
      hasMore: Boolean(nextPageToken),
      nextPageToken,
    };
  },

  async pushContact(
    ctx: ConnectorContext,
    contact: UnifiedContact
  ): Promise<PushContactResult> {
    const properties = mapUnifiedToHubSpotContact(contact);
    const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      return {
        externalId: contact.externalId,
        success: false,
        error: await res.text(),
      };
    }

    const created = (await res.json()) as { id: string };
    return { externalId: created.id, success: true };
  },

  mapToUnified(externalRecord: unknown): UnifiedContact {
    return mapHubSpotContactToUnified(externalRecord as HubSpotContact);
  },
};
