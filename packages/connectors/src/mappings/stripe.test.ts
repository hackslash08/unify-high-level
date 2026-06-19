import { describe, expect, it } from "vitest";
import {
  mapStripeCustomerToCompany,
  mapStripeCustomerToContact,
} from "./stripe.js";

describe("mapStripeCustomerToContact", () => {
  it("maps Stripe customer to unified contact", () => {
    const result = mapStripeCustomerToContact({
      id: "cus_abc",
      email: "pay@corp.com",
      name: "John Payment",
      phone: "+15551112222",
      description: "Corp LLC",
      created: 1704067200,
    });

    expect(result.externalId).toBe("cus_abc");
    expect(result.source).toBe("mock-stripe");
    expect(result.email).toBe("pay@corp.com");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Payment");
    expect(result.companyName).toBe("Corp LLC");
    expect(result.tags).toContain("stripe-customer");
  });
});

describe("mapStripeCustomerToCompany", () => {
  it("creates company when description present", () => {
    const company = mapStripeCustomerToCompany({
      id: "cus_x",
      description: "Big Co",
    });
    expect(company?.name).toBe("Big Co");
    expect(company?.externalId).toBe("company-cus_x");
  });

  it("returns null without company name", () => {
    const company = mapStripeCustomerToCompany({ id: "cus_y" });
    expect(company).toBeNull();
  });
});
