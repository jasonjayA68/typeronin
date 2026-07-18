import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOCIAL,
  SOCIAL_PLATFORMS,
  activeSocials,
  parseSocialLinks,
  type SocialLinks,
} from "@/features/social/config";

/**
 * The footer renders exactly what this validates and no more. The two things
 * that matter: a half-formed address never becomes a live link, and an unset
 * network simply does not appear.
 */

const filled: SocialLinks = {
  ...DEFAULT_SOCIAL,
  facebook: "https://facebook.com/dojo",
  x: "https://x.com/dojo",
};

describe("parseSocialLinks", () => {
  it("accepts blanks and full https addresses together", () => {
    expect(parseSocialLinks(filled)).toEqual(filled);
  });

  it("accepts the all-empty default", () => {
    expect(parseSocialLinks(DEFAULT_SOCIAL)).toEqual(DEFAULT_SOCIAL);
  });

  it("refuses a half-typed address", () => {
    expect(parseSocialLinks({ ...DEFAULT_SOCIAL, instagram: "instagram.com/dojo" })).toBeNull();
    expect(parseSocialLinks({ ...DEFAULT_SOCIAL, youtube: "not a url" })).toBeNull();
  });

  it("refuses a non-http scheme — no javascript: in a footer link", () => {
    expect(parseSocialLinks({ ...DEFAULT_SOCIAL, x: "javascript:alert(1)" })).toBeNull();
  });

  it("strips unknown networks it was not told about", () => {
    const parsed = parseSocialLinks({ ...DEFAULT_SOCIAL, myspace: "https://myspace.com/x" });
    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty("myspace");
  });

  it("trims surrounding whitespace", () => {
    const parsed = parseSocialLinks({ ...DEFAULT_SOCIAL, discord: "  https://discord.gg/x  " });
    expect(parsed?.discord).toBe("https://discord.gg/x");
  });
});

describe("activeSocials", () => {
  it("returns only the linked networks, in platform order", () => {
    const active = activeSocials(filled);
    expect(active.map((a) => a.platform)).toEqual(["facebook", "x"]);
    expect(active[0].url).toBe("https://facebook.com/dojo");
  });

  it("returns nothing when nothing is linked", () => {
    expect(activeSocials(DEFAULT_SOCIAL)).toEqual([]);
  });

  it("covers every declared platform", () => {
    // Every platform is representable, so a fully-filled config lights them all.
    const all = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, `https://example.com/${p}`]));
    expect(activeSocials(all as SocialLinks)).toHaveLength(SOCIAL_PLATFORMS.length);
  });
});
