import { z } from "zod";

/**
 * The post document: what an editor may write, said once, for both sides.
 *
 * `BlogPost.content` is a JSON column and the schema comment explains the choice
 * — a tree can be re-rendered, migrated and searched, where stored HTML is a
 * permanent decision and an injection surface. But a tree is only safer than a
 * string if something checks its shape. Nothing does by default: `content` is
 * whatever JSON reached the Server Action, and a Server Action is a public HTTP
 * endpoint. Without this file, "we store a tree, not HTML" buys nothing at all —
 * an attacker posts `{"type":"image","attrs":{"onerror":"…"}}` and the renderer
 * spreads it onto an element.
 *
 * So the parse here is the gate, and two properties do the work:
 *
 *  - It is an ALLOWLIST. A node type not named below does not survive. A mark not
 *    named below does not survive. Adding an editor feature means adding it here,
 *    on purpose, which is the point.
 *  - The PARSED VALUE is what gets stored — never the input. Zod strips keys it
 *    was not told about, so an unknown attr smuggled beside a known one is gone
 *    by the time the row is written. `parsePostDocument` returns the clean tree;
 *    callers must persist that and not the thing they were handed.
 *
 * The node names match Tiptap's, because the editor's `getJSON()` has to satisfy
 * this without a translation step in between — a mapping layer would be a third
 * place for the two to disagree.
 */

/* ------------------------------------------------------------------ types */

export type DocMark =
  | { type: "bold" | "italic" | "strike" | "underline" | "code" }
  | { type: "link"; attrs: { href: string } };

export type DocText = { type: "text"; text: string; marks?: DocMark[] };
export type DocHardBreak = { type: "hardBreak" };
export type DocInline = DocText | DocHardBreak;

export type DocParagraph = { type: "paragraph"; content?: DocInline[] };
export type DocHeading = { type: "heading"; attrs: { level: 2 | 3 | 4 }; content?: DocInline[] };
export type DocCodeBlock = { type: "codeBlock"; attrs: { language: string | null }; content?: DocText[] };
export type DocHorizontalRule = { type: "horizontalRule" };

/**
 * An image is a reference, never a URL.
 *
 * `mediaId` points at a Media row; the URL is derived from its path at render.
 * Writing the URL into the body instead would bake today's project host into
 * every article ever published, and would leave the alt text in two places to
 * disagree about.
 */
export type DocImage = {
  type: "image";
  attrs: { mediaId: string; alt: string | null; caption: string | null };
};

export type DocListItem = { type: "listItem"; content: DocBlock[] };
export type DocBulletList = { type: "bulletList"; content: DocListItem[] };
export type DocOrderedList = { type: "orderedList"; attrs: { start: number }; content: DocListItem[] };
export type DocBlockquote = { type: "blockquote"; content: DocBlock[] };

export type DocBlock =
  | DocParagraph
  | DocHeading
  | DocCodeBlock
  | DocHorizontalRule
  | DocImage
  | DocBulletList
  | DocOrderedList
  | DocBlockquote;

export type PostDocument = { type: "doc"; content: DocBlock[] };

/** What a new post starts as. A doc with no content at all is invalid in ProseMirror. */
export const EMPTY_DOCUMENT: PostDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/* ----------------------------------------------------------------- marks */

/**
 * Schemes a link may use.
 *
 * This is the single most important line in the file. `javascript:` in an href is
 * script execution in every reader's browser, and it is the oldest trick there
 * is. Tiptap's Link extension sanitises too, but that runs in the browser of the
 * person writing — which is to say, it protects nobody from the person who would
 * abuse it, and does not run at all for a request that never went near the editor.
 */
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

function isSafeHref(value: string): boolean {
  try {
    // A base, so relative hrefs ("/blog/the-way") resolve and are allowed. The
    // base is a throwaway — only the scheme of the result is read.
    const url = new URL(value, "https://samurai.local");
    return SAFE_SCHEMES.has(url.protocol);
  } catch {
    return false;
  }
}

const markSchema: z.ZodType<DocMark> = z.union([
  z.object({ type: z.enum(["bold", "italic", "strike", "underline", "code"]) }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({
      href: z
        .string()
        .max(2000)
        .refine(isSafeHref, "A link must be http, https or mailto."),
    }),
  }),
]);

/* ---------------------------------------------------------------- inline */

/** A single node's text. Long enough for any paragraph, short of a denial of service. */
const TEXT_MAX = 20_000;

const textSchema = z.object({
  type: z.literal("text"),
  // ProseMirror has no empty text node; an empty string here means a malformed
  // tree, not an empty paragraph (that is a paragraph with no content at all).
  text: z.string().min(1).max(TEXT_MAX),
  marks: z.array(markSchema).max(10).optional(),
});

const inlineSchema = z.discriminatedUnion("type", [
  textSchema,
  z.object({ type: z.literal("hardBreak") }),
]);

/* ----------------------------------------------------------------- block */

/** How many children one node may have. */
const MAX_BLOCKS = 2_000;
const MAX_LIST_ITEMS = 500;

/**
 * How deep a document may nest, and how many nodes it may hold in total.
 *
 * These are checked before the schema runs, by `withinLimits` below, and they are
 * the real guarantee — the `.max()` counts above bound each array on its own, and
 * a document of 2,000 blocks each holding 2,000 inline nodes satisfies every one
 * of them while being four million nodes.
 *
 * Depth needs its own answer for the same reason. Even parsing linearly, a tree
 * nested ten thousand deep is free to send and overflows the stack of whatever
 * walks it — this parser, the plain-text pass, and the renderer in turn. Recursion
 * with an attacker choosing the depth is not something a schema can bound from the
 * inside.
 *
 * Twelve is well past anything prose does: a quote holding a list holding a list
 * is depth five. It is a limit on nesting, not on writing.
 */
const MAX_DEPTH = 12;
const MAX_NODES = 50_000;

/**
 * Depth and size, checked with an explicit stack rather than recursion — a guard
 * that could itself overflow on the input it exists to reject would be a joke.
 * Only `content` is followed, because it is the only key a node recurses through.
 */
function withinLimits(input: unknown): { ok: true } | { ok: false; message: string } {
  const stack: { node: unknown; depth: number }[] = [{ node: input, depth: 0 }];
  let nodes = 0;

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;

    nodes++;
    if (nodes > MAX_NODES) {
      return { ok: false, message: "That document is too large to store." };
    }
    if (depth > MAX_DEPTH) {
      return { ok: false, message: `That document nests deeper than ${MAX_DEPTH} levels.` };
    }

    const content = (node as { content?: unknown }).content;
    if (Array.isArray(content)) {
      for (const child of content) stack.push({ node: child, depth: depth + 1 });
    }
  }

  return { ok: true };
}

const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineSchema).max(MAX_BLOCKS).optional(),
});

/**
 * H2 to H4 only.
 *
 * H1 is the post's title, rendered by the page from the `title` column. A second
 * H1 inside the body would give the article two top-level headings, which is a
 * real problem for anyone navigating by them rather than a style quibble.
 */
const headingSchema = z.object({
  type: z.literal("heading"),
  attrs: z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }),
  content: z.array(inlineSchema).max(MAX_BLOCKS).optional(),
});

const imageSchema = z.object({
  type: z.literal("image"),
  attrs: z.object({
    mediaId: z.uuid(),
    alt: z.string().max(300).nullable(),
    caption: z.string().max(500).nullable(),
  }),
});

const codeBlockSchema = z.object({
  type: z.literal("codeBlock"),
  attrs: z.object({
    // A label the renderer may hand to a highlighter. Constrained because it
    // will end up in a class name.
    language: z
      .string()
      .max(30)
      .regex(/^[a-zA-Z0-9+#-]*$/, "That is not a language name.")
      .nullable(),
  }),
  content: z.array(textSchema).max(50).optional(),
});

const horizontalRuleSchema = z.object({
  type: z.literal("horizontalRule"),
});

/**
 * The recursion, and the one place in this file where a wrong choice is
 * measurable rather than theoretical.
 *
 * `z.discriminatedUnion`, NOT `z.union`. It is not a style preference and it is
 * not about error messages — a plain union here is quadratic-and-worse on nested
 * input, and it was: 20 levels of blockquote took 7.5 SECONDS to reject, with
 * every level multiplying the cost by about four.
 *
 * The reason is that a union tries each member in turn, and a `z.object` does not
 * abandon a node when its `type` literal fails — it goes on to check the other
 * keys and collect their errors too. So matching a `blockquote` against the
 * `bulletList` member still walked `content` through `listItem` and back into
 * this union, as did `orderedList`. Three full descents of the same subtree per
 * level, hence 3^depth. A discriminated union reads `type` and parses the one
 * member that claims it — one descent, linear.
 *
 * Both schemas are `z.lazy` so the identifiers below resolve at parse time rather
 * than module-evaluation time, which is what lets a list item contain a list. The
 * members must stay un-annotated `z.object`s: a `z.ZodType<DocBlock>` annotation
 * would hide the discriminator and this would silently fall back to being a
 * problem again.
 */
const listItemSchema: z.ZodType<DocListItem> = z.lazy(() =>
  z.object({
    type: z.literal("listItem"),
    content: z.array(blockSchema).max(MAX_BLOCKS),
  })
);

const blockSchema: z.ZodType<DocBlock> = z.lazy(() =>
  z.discriminatedUnion("type", [
    paragraphSchema,
    headingSchema,
    imageSchema,
    codeBlockSchema,
    horizontalRuleSchema,
    z.object({
      type: z.literal("bulletList"),
      content: z.array(listItemSchema).max(MAX_LIST_ITEMS),
    }),
    z.object({
      type: z.literal("orderedList"),
      attrs: z.object({ start: z.number().int().min(1).max(10_000) }),
      content: z.array(listItemSchema).max(MAX_LIST_ITEMS),
    }),
    z.object({
      type: z.literal("blockquote"),
      content: z.array(blockSchema).max(MAX_BLOCKS),
    }),
  ])
);

export const documentSchema: z.ZodType<PostDocument> = z.object({
  type: z.literal("doc"),
  content: z.array(blockSchema).min(1, "A post needs a body.").max(MAX_BLOCKS),
});

/**
 * Validate and clean a document.
 *
 * Returns the parsed tree — the caller stores THIS, not what it was given. See
 * the note at the top of the file: stripping is the sanitisation.
 */
export function parsePostDocument(
  input: unknown
): { ok: true; document: PostDocument } | { ok: false; message: string } {
  // Size and depth first, cheaply, before anything recursive touches it.
  const limits = withinLimits(input);
  if (!limits.ok) return limits;

  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` (at ${issue.path.join(".")})` : "";
    return { ok: false, message: `${issue?.message ?? "That document is malformed."}${where}` };
  }
  return { ok: true, document: parsed.data };
}

/* ------------------------------------------------------------ derivations */

/**
 * The document as plain text.
 *
 * Kept in its own column on save so that searching does not have to walk the
 * tree, per the schema comment. Blocks are joined with newlines rather than
 * spaces so that two paragraphs do not run together into a word that was never
 * written — which would then be findable, and wrong.
 */
export function toPlainText(document: PostDocument): string {
  const lines: string[] = [];

  const walk = (nodes: readonly unknown[]) => {
    for (const node of nodes) {
      const value = node as { type: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> };

      if (value.type === "text" && value.text) {
        // Append to the block being built rather than starting a line: marks
        // split one sentence into several text nodes, and "**bold** text" is one
        // sentence however many nodes ProseMirror needed to say it.
        if (lines.length === 0) lines.push("");
        lines[lines.length - 1] += value.text;
        continue;
      }

      // A line break inside a paragraph is a space here. Without this the two
      // sides of the break fuse into a word nobody wrote — and it would be
      // findable by search, which is the one thing this text exists for.
      if (value.type === "hardBreak") {
        if (lines.length === 0) lines.push("");
        lines[lines.length - 1] += " ";
        continue;
      }

      // An image contributes its caption. The alt text belongs to the file and
      // is searchable in the library; the caption was written for this post.
      if (value.type === "image") {
        const caption = value.attrs?.caption;
        if (typeof caption === "string" && caption) lines.push(caption);
        continue;
      }

      if (value.content) {
        lines.push("");
        walk(value.content);
      }
    }
  };

  walk(document.content);

  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** Words per minute for prose. Nothing here is measured; it is the usual figure. */
const READING_SPEED = 200;

/**
 * Minutes, from the flattened text.
 *
 * Never zero: a one-line post takes a moment, and "0 min read" reads like a bug.
 */
export function toReadingMinutes(plainText: string): number {
  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / READING_SPEED));
}

/** Every media id the body embeds, in order, without duplicates. */
export function embeddedMediaIds(document: PostDocument): string[] {
  const ids = new Set<string>();

  const walk = (nodes: readonly DocBlock[] | readonly DocListItem[]) => {
    for (const node of nodes) {
      if (node.type === "image") {
        ids.add(node.attrs.mediaId);
        continue;
      }
      if ("content" in node && Array.isArray(node.content)) {
        walk(node.content as readonly DocBlock[]);
      }
    }
  };

  walk(document.content);
  return [...ids];
}
