import {
  UnifiedCompanySchema,
  UnifiedContactSchema,
  type UnifiedCompany,
  type UnifiedContact,
} from "@highlevel/shared";

export interface StripeCustomer {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  description?: string | null;
  metadata?: Record<string, string>;
  created?: number;
}

export function mapStripeCustomerToContact(
  customer: StripeCustomer,
  source = "mock-stripe"
): UnifiedContact {
  const nameParts = (customer.name ?? "").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || undefined;

  const contact: UnifiedContact = {
    externalId: customer.id,
    source,
    email: customer.email ?? undefined,
    firstName,
    lastName,
    fullName: customer.name ?? undefined,
    phone: customer.phone ?? undefined,
    companyName: customer.description ?? undefined,
    tags: ["stripe-customer"],
    metadata: { stripe: customer.metadata ?? {} },
    createdAt: customer.created
      ? new Date(customer.created * 1000).toISOString()
      : undefined,
  };

  return UnifiedContactSchema.parse(contact);
}

export function mapStripeCustomerToCompany(
  customer: StripeCustomer,
  source = "mock-stripe"
): UnifiedCompany | null {
  const companyName = customer.description ?? customer.metadata?.company;
  if (!companyName) return null;

  const company: UnifiedCompany = {
    externalId: `company-${customer.id}`,
    source,
    name: companyName,
    metadata: { stripeCustomerId: customer.id },
  };

  return UnifiedCompanySchema.parse(company);
}
