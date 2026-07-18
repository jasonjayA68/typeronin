import { describe, expect, it } from "vitest";

import {
  EMPTY_DOCUMENT,
  embeddedMediaIds,
  parsePostDocument,
  toPlainText,
  toReadingMinutes,
  type PostDocument,
} from "@/features/blog/document";

/**
 * The document parser's tests.
 *
 * This module is the boundary between a public HTTP endpoint and every reader's
 * browser: `BlogPost.content` is whatever JSON reached a Server Action, and what
 * survives this parser is what gets stored and later rendered. So these are not
 * tests of a helper — each one names an attack or a failure that reached
 * production elsewhere, and the file is worth more than the sum of its
 * assertions.
 *
 * Read them as the specification. If the allowlist gains a node, it gains a case
 * here first.
 */

/** A doc wrapper, so each case is about the thing it is testing. */
const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (...content: unknown[]) => ({ type: "paragraph", content });
const text = (value: string, marks?: unknown[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

const MEDIA_ID = "3f4c1b2a-1111-4222-8333-444455556666";

function parsed(input: unknown): PostDocument {
  const result = parsePostDocument(input);
  if (!result.ok) throw new Error(`expected a valid document, got: ${result.message}`);
  return result.document;
}

describe("parsePostDocument — refusing script", () => {
  // The oldest trick there is, and the single most important line in document.ts.
  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["uppercased javascript:", "JaVaScRiPt:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["vbscript:", "vbscript:msgbox(1)"],
    ["file:", "file:///etc/passwd"],
  ])("refuses a %s link href", (_label, href) => {
    const result = parsePostDocument(doc(para(text("click", [{ type: "link", attrs: { href } }]))));
    expect(result.ok).toBe(false);
  });

  it.each([
    ["absolute https", "https://example.com/x"],
    ["absolute http", "http://example.com/x"],
    ["mailto", "mailto:someone@example.com"],
    ["a path on this site", "/blog/the-way"],
    ["an anchor", "#ranks"],
  ])("allows a %s link href", (_label, href) => {
    const result = parsePostDocument(doc(para(text("read", [{ type: "link", attrs: { href } }]))));
    expect(result.ok).toBe(true);
  });
});

describe("parsePostDocument — the allowlist", () => {
  it("refuses a node type it was not told about", () => {
    const result = parsePostDocument(doc({ type: "script", content: [text("pwn")] }));
    expect(result.ok).toBe(false);
  });

  it("refuses a mark it was not told about", () => {
    const result = parsePostDocument(doc(para(text("x", [{ type: "highlight" }]))));
    expect(result.ok).toBe(false);
  });

  it("refuses an h1 in the body — the title column owns that", () => {
    const result = parsePostDocument(
      doc({ type: "heading", attrs: { level: 1 }, content: [text("h1")] })
    );
    expect(result.ok).toBe(false);
  });

  it("allows h2 to h4", () => {
    for (const level of [2, 3, 4]) {
      const result = parsePostDocument(
        doc({ type: "heading", attrs: { level }, content: [text(`h${level}`)] })
      );
      expect(result.ok).toBe(true);
    }
  });

  it("refuses an image whose mediaId is not a uuid", () => {
    const result = parsePostDocument(
      doc({ type: "image", attrs: { mediaId: "../../etc/passwd", alt: null, caption: null } })
    );
    expect(result.ok).toBe(false);
  });

  it("refuses a code block language that would not be safe in a class name", () => {
    const result = parsePostDocument(
      doc({ type: "codeBlock", attrs: { language: 'ts" onload="alert(1)' }, content: [text("x")] })
    );
    expect(result.ok).toBe(false);
  });

  it("refuses an empty document — ProseMirror has no such thing", () => {
    expect(parsePostDocument({ type: "doc", content: [] }).ok).toBe(false);
  });

  it("accepts the document a new post starts as", () => {
    expect(parsePostDocument(EMPTY_DOCUMENT).ok).toBe(true);
  });
});

describe("parsePostDocument — stripping is the sanitisation", () => {
  /**
   * The property the whole design leans on: what is stored is the PARSED value,
   * so anything smuggled in beside a known key is gone before it reaches the
   * column. If these fail, "we store a tree, not HTML" stops being worth
   * anything.
   */
  it("strips an unknown key from a node", () => {
    const result = parsed(doc({ ...para(text("hello")), onclick: "alert(1)" }));
    expect(result.content[0]).not.toHaveProperty("onclick");
  });

  it("strips unknown attrs from an image, including a smuggled src", () => {
    const result = parsed(
      doc({
        type: "image",
        attrs: {
          mediaId: MEDIA_ID,
          alt: "a",
          caption: null,
          onerror: "alert(1)",
          src: "http://evil.example/x.png",
        },
      })
    );

    const image = result.content[0] as { attrs: Record<string, unknown> };
    expect(image.attrs).not.toHaveProperty("onerror");
    // `src` specifically: the editor adds it for display and the parser is what
    // guarantees it never reaches the database. See image-node.tsx.
    expect(image.attrs).not.toHaveProperty("src");
    expect(image.attrs.mediaId).toBe(MEDIA_ID);
  });

  it("strips target and rel from a link, keeping only the href", () => {
    const result = parsed(
      doc(
        para(
          text("read", [
            { type: "link", attrs: { href: "https://example.com", target: "_blank", rel: "x" } },
          ])
        )
      )
    );

    const mark = (result.content[0] as { content: { marks: { attrs: unknown }[] }[] }).content[0]
      .marks[0];
    expect(mark.attrs).toEqual({ href: "https://example.com" });
  });
});

describe("parsePostDocument — limits", () => {
  /**
   * A REGRESSION TEST, and the reason this file exists.
   *
   * The first version of the schema used `z.union`, which tries every member —
   * and a `z.object` does not stop when its `type` literal fails, it goes on to
   * check the other keys. So a blockquote was re-walked by the `bulletList` and
   * `orderedList` branches too: three descents per level, 3^depth. Twenty levels
   * of nesting took 7.5 SECONDS of blocked event loop to reject, from a few KB
   * of JSON on a public endpoint.
   *
   * The fix was `z.discriminatedUnion` plus the explicit depth guard. This test
   * is what stops someone reading the union back in as a simplification.
   */
  const nest = (depth: number) => {
    let node: unknown = para(text("x"));
    for (let i = 0; i < depth; i++) node = { type: "blockquote", content: [node] };
    return doc(node);
  };

  it("refuses a document nested past the limit", () => {
    expect(parsePostDocument(nest(400)).ok).toBe(false);
  });

  it("rejects a deeply nested document in microseconds, not seconds", () => {
    const started = performance.now();
    const result = parsePostDocument(nest(5_000));
    const elapsed = performance.now() - started;

    expect(result.ok).toBe(false);
    // Generous by three orders of magnitude against the 7,486ms this took before
    // the fix. It is a test for a complexity class, not a benchmark.
    expect(elapsed).toBeLessThan(250);
  });

  it("allows the nesting prose actually uses", () => {
    // A quote holding a list holding a paragraph: depth four.
    const result = parsePostDocument(
      doc({
        type: "blockquote",
        content: [
          {
            type: "bulletList",
            content: [{ type: "listItem", content: [para(text("nested"))] }],
          },
        ],
      })
    );
    expect(result.ok).toBe(true);
  });

  it("refuses a document with too many nodes", () => {
    const many = Array.from({ length: 60_000 }, () => para(text("x")));
    expect(parsePostDocument(doc(...many)).ok).toBe(false);
  });

  it("accepts a long article", () => {
    const many = Array.from({ length: 500 }, () => para(text("A sentence of reasonable length.")));
    expect(parsePostDocument(doc(...many)).ok).toBe(true);
  });
});

describe("toPlainText", () => {
  it("does not split a sentence where its marks do", () => {
    // Marks cut one sentence into several text nodes. Joining them with spaces
    // would make the search column disagree with the article.
    const result = toPlainText(parsed(doc(para(text("Type "), text("with intent", [{ type: "bold" }]), text(".")))));
    expect(result).toBe("Type with intent.");
  });

  it("does not fuse the two sides of a line break into a word nobody wrote", () => {
    const result = toPlainText(
      parsed(doc(para(text("intent."), { type: "hardBreak" }, text("Then again."))))
    );
    expect(result).toBe("intent. Then again.");
    expect(result).not.toContain("intent.Then");
  });

  it("keeps blocks on their own lines, so two paragraphs cannot make a false match", () => {
    const result = toPlainText(parsed(doc(para(text("alpha")), para(text("beta")))));
    expect(result).toBe("alpha\nbeta");
    expect(result).not.toContain("alphabeta");
  });

  it("includes an image's caption, which was written for this post", () => {
    const result = toPlainText(
      parsed(doc({ type: "image", attrs: { mediaId: MEDIA_ID, alt: "Dojo", caption: "Dawn" } }))
    );
    expect(result).toBe("Dawn");
  });

  it("reaches text inside nested lists", () => {
    const result = toPlainText(
      parsed(
        doc({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                para(text("breath")),
                {
                  type: "bulletList",
                  content: [{ type: "listItem", content: [para(text("nested"))] }],
                },
              ],
            },
          ],
        })
      )
    );
    expect(result.split("\n")).toEqual(["breath", "nested"]);
  });
});

describe("toReadingMinutes", () => {
  it("is never zero — '0 min read' reads like a bug", () => {
    expect(toReadingMinutes("")).toBe(1);
    expect(toReadingMinutes("one")).toBe(1);
  });

  it("counts at roughly 200 words a minute", () => {
    expect(toReadingMinutes("word ".repeat(600))).toBe(3);
  });
});

describe("embeddedMediaIds", () => {
  it("finds images nested inside a quote and de-duplicates them", () => {
    const other = "11112222-3333-4444-8555-666677778888";
    const ids = embeddedMediaIds(
      parsed(
        doc(
          { type: "image", attrs: { mediaId: MEDIA_ID, alt: "a", caption: null } },
          {
            type: "blockquote",
            content: [{ type: "image", attrs: { mediaId: other, alt: "b", caption: null } }],
          },
          { type: "image", attrs: { mediaId: MEDIA_ID, alt: "a again", caption: null } }
        )
      )
    );

    expect(ids).toEqual([MEDIA_ID, other]);
  });

  it("finds nothing in a document with no images", () => {
    expect(embeddedMediaIds(parsed(doc(para(text("x")))))).toEqual([]);
  });
});
