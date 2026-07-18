import Image from "next/image";
import type { ReactNode } from "react";

import type {
  DocBlock,
  DocInline,
  DocListItem,
  DocMark,
  PostDocument,
} from "@/features/blog/document";
import { mediaUrl } from "@/features/media/url";

/**
 * The document, as React.
 *
 * Note what this file does not contain: `dangerouslySetInnerHTML`. Nothing is
 * ever concatenated into markup — every node becomes an element, and every string
 * lands in a text position or a prop that React escapes. That, together with the
 * allowlist in document.ts, is the whole reason the content column holds a tree.
 * Tiptap ships `generateHTML`, and using it would hand back the injection surface
 * the schema went out of its way to avoid.
 *
 * Pure and server-renderable: the editor's preview mounts it in the browser and
 * the public article will render it on the server, from the same code, so the
 * preview cannot lie about what a reader gets.
 */

/**
 * The Media rows a document's images point at.
 *
 * Passed in rather than fetched here: this renders inside a client preview as
 * well as on a server, and a component that queried the database would be usable
 * from exactly one of those.
 */
export type MediaLookup = Record<
  string,
  { path: string; altText: string | null; width: number | null; height: number | null }
>;

/* ------------------------------------------------------------------ marks */

/**
 * Marks, innermost first.
 *
 * Order is not arbitrary — `reduce` wraps in the order given, so the array
 * ["bold","italic"] becomes <em><strong>text</strong></em>. Which of the two is
 * outside makes no rendered difference, and both are correct HTML, so the array's
 * own order is simply honoured.
 */
function withMarks(text: string, marks: DocMark[] | undefined, key: string): ReactNode {
  if (!marks?.length) return text;

  return marks.reduce<ReactNode>((inner, mark, index) => {
    const markKey = `${key}-m${index}`;

    switch (mark.type) {
      case "bold":
        return <strong key={markKey}>{inner}</strong>;
      case "italic":
        return <em key={markKey}>{inner}</em>;
      case "underline":
        return <u key={markKey}>{inner}</u>;
      case "strike":
        return <s key={markKey}>{inner}</s>;
      case "code":
        return (
          <code key={markKey} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            {inner}
          </code>
        );
      case "link": {
        // The scheme was validated on the way in (document.ts). This decides
        // only how the link behaves.
        const external = !mark.attrs.href.startsWith("/") && !mark.attrs.href.startsWith("#");
        return (
          <a
            key={markKey}
            href={mark.attrs.href}
            // A new tab for somewhere else, the same one for here. `noreferrer`
            // rather than only `noopener`: the target has no business knowing
            // which draft or which article sent the reader.
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-sakura underline underline-offset-4 hover:no-underline"
          >
            {inner}
          </a>
        );
      }
      default:
        return inner;
    }
  }, text);
}

function Inline({ nodes, keyBase }: { nodes: DocInline[] | undefined; keyBase: string }) {
  if (!nodes?.length) return null;

  return (
    <>
      {nodes.map((node, index) => {
        const key = `${keyBase}-i${index}`;
        if (node.type === "hardBreak") return <br key={key} />;
        return <span key={key}>{withMarks(node.text, node.marks, key)}</span>;
      })}
    </>
  );
}

/* ----------------------------------------------------------------- images */

function Figure({
  mediaId,
  alt,
  caption,
  media,
}: {
  mediaId: string;
  alt: string | null;
  caption: string | null;
  media: MediaLookup;
}) {
  const found = media[mediaId];
  const url = found ? mediaUrl(found.path) : null;

  /**
   * A missing file says so.
   *
   * The body references media by id and a JSON column carries no foreign key, so
   * a deleted file leaves a dangling reference that nothing prevented. The
   * library warns before that delete, but it can be forced through — and when it
   * has been, an author needs to see the hole. Rendering nothing at all would
   * hide it until a reader found it.
   */
  if (!found || !url) {
    return (
      <figure className="my-6">
        <div className="grid place-items-center rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          This image is no longer in the library.
        </div>
      </figure>
    );
  }

  // The alt written for this post wins; the file's own description is the
  // fallback. An image with neither is decorative, and an empty alt is the
  // correct way to say so — it tells a screen reader to skip it rather than
  // reading out a filename.
  const description = alt ?? found.altText ?? "";

  return (
    <figure className="my-6">
      {found.width && found.height ? (
        <Image
          src={url}
          alt={description}
          width={found.width}
          height={found.height}
          sizes="(min-width: 768px) 720px, 100vw"
          className="h-auto w-full rounded-lg"
        />
      ) : (
        // No dimensions on the row — an old upload, or a decoder that would not
        // read them. next/image cannot lay out what it cannot measure, and
        // guessing an aspect ratio would be worse than not optimising.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={description} className="h-auto w-full rounded-lg" />
      )}
      {caption ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ----------------------------------------------------------------- blocks */

function Blocks({
  nodes,
  media,
  keyBase,
}: {
  nodes: (DocBlock | DocListItem)[];
  media: MediaLookup;
  keyBase: string;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${keyBase}-b${index}`;

        switch (node.type) {
          case "paragraph":
            return (
              <p key={key} className="my-4 leading-relaxed text-pretty">
                <Inline nodes={node.content} keyBase={key} />
              </p>
            );

          case "heading": {
            const Tag = (["h2", "h3", "h4"] as const)[node.attrs.level - 2];
            const size = { 2: "text-xl", 3: "text-lg", 4: "text-base" }[node.attrs.level];
            return (
              <Tag key={key} className={`font-heading mt-8 mb-3 ${size} font-semibold tracking-wide`}>
                <Inline nodes={node.content} keyBase={key} />
              </Tag>
            );
          }

          case "blockquote":
            return (
              <blockquote
                key={key}
                className="my-6 border-l-2 border-sakura/40 pl-4 text-muted-foreground italic"
              >
                <Blocks nodes={node.content} media={media} keyBase={key} />
              </blockquote>
            );

          case "bulletList":
            return (
              <ul key={key} className="my-4 list-disc space-y-1 pl-6">
                <Blocks nodes={node.content} media={media} keyBase={key} />
              </ul>
            );

          case "orderedList":
            return (
              <ol key={key} start={node.attrs.start} className="my-4 list-decimal space-y-1 pl-6">
                <Blocks nodes={node.content} media={media} keyBase={key} />
              </ol>
            );

          case "listItem":
            return (
              // The margins of the paragraphs inside are collapsed away: a list
              // item is a line, not a section.
              <li key={key} className="[&>p]:my-0">
                <Blocks nodes={node.content} media={media} keyBase={key} />
              </li>
            );

          case "codeBlock":
            return (
              <pre
                key={key}
                className="my-6 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-xs"
              >
                <code className={node.attrs.language ? `language-${node.attrs.language}` : undefined}>
                  {node.content?.map((text) => text.text).join("") ?? ""}
                </code>
              </pre>
            );

          case "horizontalRule":
            return <hr key={key} className="ink-divider my-8" />;

          case "image":
            return (
              <Figure
                key={key}
                mediaId={node.attrs.mediaId}
                alt={node.attrs.alt}
                caption={node.attrs.caption}
                media={media}
              />
            );

          default:
            // Unreachable while this switch covers DocBlock. Left as a hole
            // rather than a throw: a tree that somehow got past the parser
            // should cost one paragraph, not the whole page.
            return null;
        }
      })}
    </>
  );
}

export function PostBody({
  document,
  media = {},
  className,
}: {
  document: PostDocument;
  media?: MediaLookup;
  className?: string;
}) {
  return (
    <div className={className}>
      <Blocks nodes={document.content} media={media} keyBase="d" />
    </div>
  );
}
