import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { holds, requirePermission } from "@/features/admin/guard";
import { AdminPage } from "@/features/admin/ui";
import { EMPTY_DOCUMENT, embeddedMediaIds, parsePostDocument } from "@/features/blog/document";
import { hydrate } from "@/features/blog/hydrate";
import { PostEditor } from "@/features/blog/post-editor";
import { mediaUrl } from "@/features/media/url";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

export default async function EditPostPage(props: PageProps<"/admin/posts/[id]">) {
  const context = await requirePermission("blog:write");

  const { id } = await props.params;
  // A route param is a string from a stranger. Prisma would throw on a malformed
  // uuid rather than miss, which is a 500 where a 404 is the honest answer.
  if (!z.uuid().safeParse(id).success) notFound();

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      status: true,
      publishedAt: true,
      scheduledFor: true,
      isFeatured: true,
      isTrending: true,
      seoTitle: true,
      seoDescription: true,
      canonicalUrl: true,
      categoryId: true,
      featuredImage: { select: { id: true, kind: true, path: true, fileName: true, altText: true } },
      ogImage: { select: { id: true, kind: true, path: true, fileName: true, altText: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  if (!post) notFound();

  const categories = await prisma.blogCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });

  /**
   * The stored body, re-parsed on the way out.
   *
   * The column is JSON and the database enforces nothing about its shape, so a
   * row could hold something this editor cannot open — written by an older
   * allowlist, or by hand. Parsing here means the editor is fed a tree it
   * understands or an empty one, rather than crashing on load and taking the
   * only screen that could fix the post with it.
   */
  const parsed = parsePostDocument(post.content);
  const document = parsed.ok ? parsed.document : EMPTY_DOCUMENT;

  // The body names files; the editor needs URLs. One query for the images this
  // post actually uses.
  const ids = parsed.ok ? embeddedMediaIds(parsed.document) : [];
  const media = ids.length
    ? await prisma.media.findMany({
        where: { id: { in: ids } },
        select: { id: true, path: true, altText: true },
      })
    : [];

  const urls = Object.fromEntries(
    media.map((item) => [item.id, { url: mediaUrl(item.path), altText: item.altText }])
  );

  return (
    <AdminPage
      title={post.title}
      description={
        parsed.ok
          ? undefined
          : `The text of this post could not be read (${parsed.message}), so the box below is empty. If you save now, the old text is lost. Ask a developer to look at it first if the writing matters.`
      }
    >
      <PostEditor
        postId={post.id}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          categoryId: post.categoryId ?? "",
          tags: post.tags.map((row) => row.tag.name).join(", "),
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          canonicalUrl: post.canonicalUrl ?? "",
        }}
        initialContent={hydrate(document, urls)}
        initialFeatured={post.featuredImage}
        initialOg={post.ogImage}
        categories={categories}
        status={post.status}
        publishedAt={post.publishedAt?.toISOString() ?? null}
        scheduledFor={post.scheduledFor?.toISOString() ?? null}
        isFeatured={post.isFeatured}
        isTrending={post.isTrending}
        canPublish={holds(context, "blog:publish")}
      />
    </AdminPage>
  );
}
