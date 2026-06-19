import { UnifiedContactSchema, type UnifiedContact } from "@highlevel/shared";

export interface GooglePerson {
  resourceName?: string;
  names?: Array<{ givenName?: string; familyName?: string; displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  organizations?: Array<{ name?: string }>;
}

export function mapGoogleContactToUnified(
  person: GooglePerson,
  source = "google-contacts"
): UnifiedContact {
  const name = person.names?.[0];
  const email = person.emailAddresses?.[0]?.value ?? "";
  const phone = person.phoneNumbers?.[0]?.value;
  const company = person.organizations?.[0]?.name;
  const externalId = person.resourceName ?? `google-${Date.now()}`;

  const contact: UnifiedContact = {
    externalId,
    source,
    email: email || undefined,
    firstName: name?.givenName,
    lastName: name?.familyName,
    fullName: name?.displayName,
    phone,
    companyName: company,
    tags: [],
    metadata: { provider: "google-people-api" },
  };

  return UnifiedContactSchema.parse(contact);
}

export function mapUnifiedToGoogleContact(contact: UnifiedContact): Record<string, unknown> {
  return {
    names: [
      {
        givenName: contact.firstName,
        familyName: contact.lastName,
        displayName: contact.fullName ?? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim(),
      },
    ],
    emailAddresses: contact.email ? [{ value: contact.email }] : [],
    phoneNumbers: contact.phone ? [{ value: contact.phone }] : [],
    organizations: contact.companyName ? [{ name: contact.companyName }] : [],
  };
}
