/**
 * Fill in each image's `src` from the library, so a loaded post has something to
 * draw.
 *
 * The stored document names files; the editor needs URLs. This is the one place
 * that turns the first into the second, on the way in — and it is the mirror of
 * the parser dropping `src` on the way out (see the note in image-node.tsx).
 *
 * It lives apart from that file, with no React and no Tiptap in it, because the
 * server page is what calls it. Importing it from image-node.tsx would drag
 * ProseMirror and the whole editor into the server bundle to run twenty lines of
 * object walking.
 *
 * An id with no row behind it — the file was deleted — gets a null `src`, and
 * the node view says so. Dropping the node instead would silently rearrange
 * someone's article on load.
 */
export function hydrate<T>(
  document: T,
  urls: Record<string, { url: string | null; altText: string | null }>
): T {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;

    const value = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown };

    if (value.type === "image" && value.attrs) {
      const found = urls[String(value.attrs.mediaId)];
      return {
        ...value,
        attrs: {
          ...value.attrs,
          src: found?.url ?? null,
          // The post's own alt wins; the library's is the fallback. The same rule
          // as the renderer's, deliberately — an editor that showed different
          // alt text from the article would be lying about the article.
          alt: value.attrs.alt ?? found?.altText ?? null,
        },
      };
    }

    if (value.content) return { ...value, content: walk(value.content) };
    return value;
  };

  return walk(document) as T;
}
