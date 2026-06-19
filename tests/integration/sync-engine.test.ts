import { describe, expect, it } from "vitest";
import { getConnector } from "@highlevel/connectors";
import { mapStripeCustomerToContact } from "@highlevel/connectors";

/**
 * Integration-style test (no Firebase) — validates connector → unified → ready for HL push
 */
describe("connector integration flow", () => {
  it("mock-stripe lists and normalizes contacts", async () => {
    const connector = getConnector("mock-stripe");
    expect(connector).toBeDefined();

    const result = await connector!.listContacts(
      {
        userId: "test-user",
        connectionId: "test-conn",
        accessToken: "mock",
      },
      { limit: 10 }
    );

    expect(result.contacts.length).toBeGreaterThan(0);
    expect(result.contacts[0].source).toBe("mock-stripe");
    expect(result.contacts[0].externalId).toBeTruthy();
  });

  it("normalization produces valid unified contact shape", () => {
    const contact = mapStripeCustomerToContact({
      id: "cus_test",
      email: "test@example.com",
      name: "Integration Test",
    });
    expect(contact.email).toBe("test@example.com");
    expect(contact.firstName).toBe("Integration");
  });

  it("registry returns all connectors without platform changes", () => {
    const google = getConnector("google-contacts");
    const stripe = getConnector("mock-stripe");
    expect(google?.meta.authType).toBe("oauth2");
    expect(stripe?.meta.isMock).toBe(true);
  });
});
