import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

/**
 * An image in the body, as a reference to the library.
 *
 * Tiptap ships an Image extension and this deliberately replaces it. That one
 * stores a `src` — a URL, written into the document, forever. This stores a
 * `mediaId`, and the URL is derived at render from the row it names. Two things
 * follow that are worth the custom node:
 *
 *  - Moving the project, or the bucket, does not break every article ever
 *    published.
 *  - Alt text has one home. The library's description is the fallback and a post
 *    may override it, which is a decision someone makes; two independent copies
 *    silently disagreeing is not.
 *
 * `src` IS among the attributes below, and it is the exception that proves the
 * rule: it exists so the editor has something to draw, is filled in by
 * `hydrate()` from the library when a post loads, and is *not* in the allowlist
 * in document.ts — so `getJSON()` may hand it over on save and the parser drops
 * it on the floor. The URL never reaches the column. That is the whole trick:
 * the runtime document and the stored document differ by exactly one ephemeral
 * field, and the schema is what enforces it rather than a step someone has to
 * remember.
 */

export type ImageAttrs = {
  mediaId: string;
  alt: string | null;
  caption: string | null;
  /** Display only. Stripped on save — see above. */
  src: string | null;
};

/**
 * The editing surface for one image.
 *
 * The caption is an input rather than editable rich text: a caption is a line
 * about a picture, and making it a full ProseMirror node would let someone put a
 * list in it. `contentEditable={false}` on the wrapper keeps ProseMirror's own
 * handling away from the input; without it, typing in the caption is caught by
 * the editor and lands in the document instead.
 */
function ImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as ImageAttrs;

  return (
    <NodeViewWrapper
      as="figure"
      className={`my-6 rounded-lg transition-shadow ${selected ? "ring-3 ring-ring/50" : ""}`}
      contentEditable={false}
    >
      {attrs.src ? (
        // A remote URL rendered inside a contentEditable surface. next/image
        // cannot be used here: it renders a sized wrapper and a srcset that
        // ProseMirror would try to manage as part of the document. The public
        // article renders the same image through next/image — see renderer.tsx.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attrs.src}
          alt={attrs.alt ?? ""}
          className="h-auto w-full rounded-lg"
          draggable={false}
        />
      ) : (
        <span className="grid place-items-center rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          This image is no longer in the library.
        </span>
      )}

      <figcaption className="mt-2">
        <input
          value={attrs.caption ?? ""}
          disabled={!editor.isEditable}
          placeholder="Caption (optional)"
          aria-label="Image caption"
          onChange={(event) => updateAttributes({ caption: event.target.value || null })}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-center text-xs text-muted-foreground transition-colors outline-none placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {attrs.alt ? (
          <span className="mt-1 block truncate text-center text-[0.7rem] text-muted-foreground/70">
            Alt: {attrs.alt}
          </span>
        ) : (
          <span className="mt-1 block text-center text-[0.7rem] text-warning">
            No alt text — describe this image in the library.
          </span>
        )}
      </figcaption>
    </NodeViewWrapper>
  );
}

export const MediaImage = Node.create({
  name: "image",
  group: "block",
  // Atomic: it has no editable content of its own as far as ProseMirror is
  // concerned. The caption input above is outside the document's control.
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mediaId: { default: null },
      alt: { default: null },
      caption: { default: null },
      src: { default: null },
    };
  },

  parseHTML() {
    // For pasted content. An <img> with no data-media-id is not ours — it points
    // at someone else's server, and there is no row behind it — so it is not
    // matched here and does not become a node.
    return [{ tag: "img[data-media-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { mediaId, src, alt } = HTMLAttributes as Partial<ImageAttrs>;
    return ["img", mergeAttributes({ "data-media-id": mediaId, src, alt })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
