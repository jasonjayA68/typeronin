import type { Metadata } from "next";

import { holds, requirePermission } from "@/features/admin/guard";
import { AdminPage } from "@/features/admin/ui";
import { EMPTY_DOCUMENT } from "@/features/blog/document";
import { PostEditor } from "@/features/blog/post-editor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "New post",
  robots: { index: false, follow: false },
};

/**
 * A post that does not exist yet.
 *
 * Its own route rather than a mode of the editor page, so that `/admin/posts/new`
 * is a URL someone can be sent. The static segment wins over `[id]` in Next's
 * matching, so "new" can never be read as a post id.
 */
export default async function NewPostPage() {
  const context = await requirePermission("blog:write");

  const categories = await prisma.blogCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });

  return (
    <AdminPage
      title="New post"
      description="It is saved as a draft. Nothing is public until someone publishes it."
    >
      <PostEditor
        postId={null}
        initial={{
          title: "",
          slug: "",
          excerpt: "",
          categoryId: "",
          tags: "",
          seoTitle: "",
          seoDescription: "",
          canonicalUrl: "",
        }}
        initialContent={EMPTY_DOCUMENT}
        initialFeatured={null}
        initialOg={null}
        categories={categories}
        status="DRAFT"
        publishedAt={null}
        scheduledFor={null}
        isFeatured={false}
        isTrending={false}
        canPublish={holds(context, "blog:publish")}
      />
    </AdminPage>
  );
}
