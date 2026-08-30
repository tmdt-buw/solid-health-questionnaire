import { describe, expect, it } from "vitest";
import {
  createOnboardingRecord,
  onboardingCompleteFor,
  parseOnboardingRecord,
} from "./onboarding";

const NOW = "2026-08-28T10:00:00.000Z";

describe("app-specific onboarding", () => {
  it("requires a separate standalone acknowledgement", () => {
    const embedded = createOnboardingRecord(null, "embedded", NOW);
    expect(onboardingCompleteFor(embedded, "embedded")).toBe(true);
    expect(onboardingCompleteFor(embedded, "standalone")).toBe(false);

    const standalone = createOnboardingRecord(embedded, "standalone", NOW);
    expect(onboardingCompleteFor(standalone, "standalone")).toBe(true);
  });

  it("fails closed for malformed, extended or future records", () => {
    const valid = createOnboardingRecord(null, "standalone", NOW);
    expect(parseOnboardingRecord(valid)).toEqual(valid);
    expect(parseOnboardingRecord({ ...valid, schemaVersion: 2 })).toBeNull();
    expect(parseOnboardingRecord({ ...valid, unexpected: true })).toBeNull();
    expect(parseOnboardingRecord({ ...valid, appSpecificAcceptedAt: "yesterday" })).toBeNull();
  });
});

