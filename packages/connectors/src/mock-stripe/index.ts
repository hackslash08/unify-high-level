import type {
  Connector,
  ConnectorContext,
  ListContactsResult,
  PushContactResult,
} from "../types.js";
import {
  mapStripeCustomerToCompany,
  mapStripeCustomerToContact,
  type StripeCustomer,
} from "../mappings/stripe.js";
import type { UnifiedContact } from "@highlevel/shared";

/** Mock fixture data — replace with real Stripe API when credentials are configured */
const MOCK_CUSTOMERS: StripeCustomer[] = [
  {
    id: "cus_mock_001",
    email: "alice@acme.com",
    name: "Alice Johnson",
    phone: "+15551234001",
    description: "Acme Corp",
    metadata: { plan: "pro" },
    created: 1704067200,
  },
  {
    id: "cus_mock_002",
    email: "bob@startup.io",
    name: "Bob Smith",
    phone: "+15551234002",
    description: "Startup.io",
    metadata: { plan: "starter" },
    created: 1704153600,
  },
  {
    id: "cus_mock_003",
    email: "carol@example.com",
    name: "Carol Williams",
    metadata: { plan: "enterprise" },
    created: 1704240000,
  },
];

export const mockStripeConnector: Connector = {
  meta: {
    id: "mock-stripe",
    name: "Stripe (Mock)",
    description:
      "Mock Stripe connector using OAuth 2.0 authorization code flow (simulated consent) with fixture customer data.",
    logoUrl: "/connectors/stripe.svg",
    category: "payments",
    authType: "oauth2",
    supportsPush: false,
    isMock: true,
  },

  oauth: {
    authorizeUrl: "mock",
    tokenUrl: "mock",
    scopes: ["read:customers", "read:contacts"],
    clientIdEnvKey: "MOCK_STRIPE_CLIENT_ID",
    clientSecretEnvKey: "MOCK_STRIPE_CLIENT_SECRET",
  },

  async authenticate(): Promise<boolean> {
    return true;
  },

  async listContacts(
    _ctx: ConnectorContext,
    options?: { pageToken?: string; limit?: number }
  ): Promise<ListContactsResult> {
    const limit = options?.limit ?? 100;
    const offset = options?.pageToken ? parseInt(options.pageToken, 10) : 0;
    const slice = MOCK_CUSTOMERS.slice(offset, offset + limit);
    const contacts = slice.map((c) => this.mapToUnified(c));
    const companies = slice
      .map((c) => mapStripeCustomerToCompany(c))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const nextOffset = offset + limit;
    const hasMore = nextOffset < MOCK_CUSTOMERS.length;

    return {
      contacts,
      companies,
      hasMore,
      nextPageToken: hasMore ? String(nextOffset) : undefined,
    };
  },

  async pushContact(
    _ctx: ConnectorContext,
    contact: UnifiedContact
  ): Promise<PushContactResult> {
    return {
      externalId: contact.externalId,
      success: false,
      error: "Mock connector does not support push",
    };
  },

  mapToUnified(externalRecord: unknown): UnifiedContact {
    return mapStripeCustomerToContact(externalRecord as StripeCustomer);
  },
};
