import type {
  UnifiedCompany,
  UnifiedContact,
  UnifiedLead,
} from "@highlevel/shared";

export interface ConnectorMeta {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  category: "crm" | "ads" | "payments" | "productivity";
  authType: "oauth2" | "mock" | "private_token";
  supportsPush: boolean;
  isMock?: boolean;
  /** Env var holding a Private App token (authType private_token) */
  privateTokenEnvKey?: string;
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnvKey: string;
  clientSecretEnvKey: string;
  usePkce?: boolean;
}

export interface ConnectorContext {
  userId: string;
  connectionId: string;
  accessToken: string;
  refreshToken?: string;
}

export interface ListContactsResult {
  contacts: UnifiedContact[];
  companies?: UnifiedCompany[];
  leads?: UnifiedLead[];
  hasMore: boolean;
  nextPageToken?: string;
}

export interface PushContactResult {
  externalId: string;
  success: boolean;
  error?: string;
}

export interface Connector {
  meta: ConnectorMeta;
  oauth?: OAuthConfig;

  authenticate(ctx: ConnectorContext): Promise<boolean>;

  listContacts(
    ctx: ConnectorContext,
    options?: { pageToken?: string; limit?: number }
  ): Promise<ListContactsResult>;

  pushContact(
    ctx: ConnectorContext,
    contact: UnifiedContact
  ): Promise<PushContactResult>;

  mapToUnified(externalRecord: unknown): UnifiedContact;
}
