import type { Connector } from "./types.js";
import { googleContactsConnector } from "./google-contacts/index.js";
import { mockStripeConnector } from "./mock-stripe/index.js";
import { hubspotConnector } from "./hubspot/index.js";

const connectors: Map<string, Connector> = new Map([
  [googleContactsConnector.meta.id, googleContactsConnector],
  [mockStripeConnector.meta.id, mockStripeConnector],
  [hubspotConnector.meta.id, hubspotConnector],
]);

export function getConnector(id: string): Connector | undefined {
  return connectors.get(id);
}

export function getAllConnectors(): Connector[] {
  return Array.from(connectors.values());
}

export function getConnectorMetaList() {
  return getAllConnectors().map((c) => c.meta);
}

export function registerConnector(connector: Connector): void {
  connectors.set(connector.meta.id, connector);
}
