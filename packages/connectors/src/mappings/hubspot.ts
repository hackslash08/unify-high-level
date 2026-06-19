import { UnifiedContactSchema, type UnifiedContact } from "@highlevel/shared";

export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    jobtitle?: string | null;
    hs_lead_status?: string | null;
    createdate?: string | null;
    lastmodifieddate?: string | null;
  };
}

export function mapHubSpotContactToUnified(
  contact: HubSpotContact,
  source = "hubspot"
): UnifiedContact {
  const props = contact.properties ?? {};
  const firstName = props.firstname ?? undefined;
  const lastName = props.lastname ?? undefined;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined;

  const unified: UnifiedContact = {
    externalId: contact.id,
    source,
    email: props.email ?? undefined,
    firstName,
    lastName,
    fullName,
    phone: props.phone ?? undefined,
    companyName: props.company ?? undefined,
    tags: props.hs_lead_status ? [props.hs_lead_status] : [],
    metadata: {
      provider: "hubspot-crm",
      jobtitle: props.jobtitle ?? undefined,
    },
    createdAt: props.createdate ?? undefined,
    updatedAt: props.lastmodifieddate ?? undefined,
  };

  return UnifiedContactSchema.parse(unified);
}

export function mapUnifiedToHubSpotContact(
  contact: UnifiedContact
): Record<string, string> {
  const properties: Record<string, string> = {};

  if (contact.firstName) properties.firstname = contact.firstName;
  if (contact.lastName) properties.lastname = contact.lastName;
  if (contact.email) properties.email = contact.email;
  if (contact.phone) properties.phone = contact.phone;
  if (contact.companyName) properties.company = contact.companyName;

  if (!properties.firstname && !properties.lastname && contact.fullName) {
    const parts = contact.fullName.split(" ");
    properties.firstname = parts[0];
    if (parts.length > 1) properties.lastname = parts.slice(1).join(" ");
  }

  return properties;
}
