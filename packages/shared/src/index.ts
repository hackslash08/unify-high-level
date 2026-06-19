export * from "./schemas/contact.js";
export * from "./schemas/company.js";
export * from "./schemas/lead.js";
export * from "./schemas/sync.js";
export * from "./schemas/connection.js";

export const SYNC_LIMITS = {
  MAX_RECORDS_PER_SYNC: 1000,
  DEFAULT_PAGE_SIZE: 100,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
} as const;
