import { describe, expect, it } from "vitest";

import { computeFingerprint } from "@/features/security/fingerprint";

/**
 * The fingerprint is a hint, and a hint has to be at least stable and sensitive:
 * the same device produces the same hash, a different one produces a different
 * hash. Anything more precise than that would be a surveillance tool, which is
 * the opposite of the point.
 */

const UA = "Mozilla/5.0 (Macintosh) Chrome/120";

describe("computeFingerprint", () => {
  it("is deterministic — the same signals give the same hash", () => {
    expect(computeFingerprint(UA, "en-US", "America/New_York")).toBe(
      computeFingerprint(UA, "en-US", "America/New_York")
    );
  });

  it("changes when any signal changes", () => {
    const base = computeFingerprint(UA, "en-US", "America/New_York");
    expect(computeFingerprint(UA + "1", "en-US", "America/New_York")).not.toBe(base);
    expect(computeFingerprint(UA, "fr-FR", "America/New_York")).not.toBe(base);
    expect(computeFingerprint(UA, "en-US", "Europe/Paris")).not.toBe(base);
  });

  it("is case- and whitespace-insensitive, so trivial noise does not fork it", () => {
    expect(computeFingerprint("  " + UA.toUpperCase() + "  ", "EN-us", "America/New_York")).toBe(
      computeFingerprint(UA, "en-us", "America/New_York")
    );
  });

  it("handles missing signals without throwing", () => {
    expect(computeFingerprint(null, null, null)).toMatch(/^[0-9a-f]{32}$/);
    expect(computeFingerprint(UA, undefined, "America/New_York")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is a fixed-width hex string", () => {
    expect(computeFingerprint(UA, "en-US", "America/New_York")).toMatch(/^[0-9a-f]{32}$/);
  });
});
