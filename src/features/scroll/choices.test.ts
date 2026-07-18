import { describe, expect, it } from "vitest";

import { buildChoices, shuffle } from "@/features/scroll/choices";

/**
 * The choice builder. A quiz is only fair if the answer is always an option, the
 * wrong ones are genuinely distinct, and the answer does not sit in the same seat
 * every time. A seeded rng makes all three exactly checkable.
 */

/** A deterministic rng cycling through fixed values, for exact tests. */
function seeded(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("buildChoices", () => {
  it("always includes the answer", () => {
    const choices = buildChoices("katana", ["tanto", "wakizashi", "naginata", "yari"]);
    expect(choices).toContain("katana");
  });

  it("returns at most `size` choices — the answer plus size-1 distractors", () => {
    const choices = buildChoices("katana", ["a", "b", "c", "d", "e", "f"], 4);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
  });

  it("never repeats the answer as a distractor, case-insensitively", () => {
    const choices = buildChoices("Ken", ["ken", "KEN", "sword"], 4);
    // Only "Ken" and "sword" survive — the case variants are the answer again.
    expect(choices.filter((c) => c.toLowerCase() === "ken")).toHaveLength(1);
    expect(choices).toContain("sword");
  });

  it("drops duplicate distractors", () => {
    const choices = buildChoices("a", ["b", "b", "B", "c"], 4);
    expect(new Set(choices.map((c) => c.toLowerCase())).size).toBe(choices.length);
  });

  it("returns fewer than size when the pool is too small", () => {
    expect(buildChoices("only", [])).toEqual(["only"]);
    expect(buildChoices("a", ["b"], 4).sort()).toEqual(["a", "b"]);
  });

  it("puts the answer in different seats under different shuffles", () => {
    const a = buildChoices("x", ["1", "2", "3"], 4, seeded([0, 0, 0]));
    const b = buildChoices("x", ["1", "2", "3"], 4, seeded([0.99, 0.99, 0.99]));
    // Both are valid full sets; the seat of "x" should differ across the seeds.
    expect(a).toContain("x");
    expect(b).toContain("x");
    expect(a.indexOf("x")).not.toBe(b.indexOf("x"));
  });
});

describe("shuffle", () => {
  it("keeps every element, dropping and inventing none", () => {
    const input = ["a", "b", "c", "d", "e"];
    const out = shuffle(input, seeded([0.1, 0.5, 0.9, 0.3]));
    expect(out.slice().sort()).toEqual(input.slice().sort());
  });

  it("does not mutate its input", () => {
    const input = ["a", "b", "c"];
    shuffle(input);
    expect(input).toEqual(["a", "b", "c"]);
  });
});
