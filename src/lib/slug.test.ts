import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

/**
 * Slugs decide URLs, and a URL that changes is a link that breaks. The cases
 * below are the ones the function's own comment makes promises about.
 */
describe("slugify", () => {
  it("strips accents rather than the letters under them", () => {
    // The NFKD pass exists for exactly this: "Grundlagen" must survive.
    expect(slugify("Kanji Grundlagen")).toBe("kanji-grundlagen");
    expect(slugify("Café Sōsaku")).toBe("cafe-sosaku");
  });

  it("collapses punctuation and whitespace to single hyphens", () => {
    expect(slugify("The Way — of Typing!")).toBe("the-way-of-typing");
    expect(slugify("  spaced  out  ")).toBe("spaced-out");
  });

  it("returns empty for scripts with no ASCII fallback", () => {
    // Documented behaviour, and load-bearing: every caller checks for this and
    // asks for a slug by hand rather than writing a row with an empty one.
    expect(slugify("日本語")).toBe("");
    expect(slugify("---")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("caps length without leaving a trailing hyphen", () => {
    const long = slugify(`${"a".repeat(70)} tail`);
    expect(long.length).toBeLessThanOrEqual(64);
    expect(long.endsWith("-")).toBe(false);
  });
});
