import { describe, expect, it } from "vitest";
import {
  mapHubSpotContactToUnified,
  mapUnifiedToHubSpotContact,
} from "./hubspot.js";

describe("mapHubSpotContactToUnified", () => {
  it("maps HubSpot contact to unified contact", () => {
    const result = mapHubSpotContactToUnified({
      id: "101",
      properties: {
        firstname: "Jane",
        lastname: "Doe",
        email: "jane@hubspot.com",
        phone: "+15559876543",
        company: "HubSpot Inc",
        hs_lead_status: "NEW",
      },
    });

    expect(result.externalId).toBe("101");
    expect(result.source).toBe("hubspot");
    expect(result.email).toBe("jane@hubspot.com");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.fullName).toBe("Jane Doe");
    expect(result.companyName).toBe("HubSpot Inc");
    expect(result.tags).toContain("NEW");
  });

  it("handles minimal contact", () => {
    const result = mapHubSpotContactToUnified({
      id: "102",
      properties: { email: "minimal@test.com" },
    });

    expect(result.externalId).toBe("102");
    expect(result.email).toBe("minimal@test.com");
  });
});

describe("mapUnifiedToHubSpotContact", () => {
  it("maps unified contact to HubSpot properties", () => {
    const props = mapUnifiedToHubSpotContact({
      externalId: "x",
      source: "hubspot",
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      phone: "123",
      companyName: "Co",
      tags: [],
      metadata: {},
    });

    expect(props.firstname).toBe("A");
    expect(props.lastname).toBe("B");
    expect(props.email).toBe("a@b.com");
    expect(props.company).toBe("Co");
  });
});
