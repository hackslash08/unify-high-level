import { describe, expect, it } from "vitest";
import {
  mapGoogleContactToUnified,
  mapUnifiedToGoogleContact,
} from "./google-contacts.js";

describe("mapGoogleContactToUnified", () => {
  it("maps a full Google person to unified contact", () => {
    const result = mapGoogleContactToUnified({
      resourceName: "people/c123",
      names: [{ givenName: "Jane", familyName: "Doe", displayName: "Jane Doe" }],
      emailAddresses: [{ value: "jane@example.com" }],
      phoneNumbers: [{ value: "+15559876543" }],
      organizations: [{ name: "Example Inc" }],
    });

    expect(result.externalId).toBe("people/c123");
    expect(result.source).toBe("google-contacts");
    expect(result.email).toBe("jane@example.com");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.phone).toBe("+15559876543");
    expect(result.companyName).toBe("Example Inc");
  });

  it("handles minimal person record", () => {
    const result = mapGoogleContactToUnified({
      resourceName: "people/minimal",
    });
    expect(result.externalId).toBe("people/minimal");
    expect(result.email).toBeUndefined();
  });
});

describe("mapUnifiedToGoogleContact", () => {
  it("round-trips core fields", () => {
    const unified = mapGoogleContactToUnified({
      resourceName: "people/rt",
      names: [{ givenName: "Test", familyName: "User" }],
      emailAddresses: [{ value: "test@example.com" }],
    });
    const google = mapUnifiedToGoogleContact(unified);
    expect(google.emailAddresses).toEqual([{ value: "test@example.com" }]);
  });
});
