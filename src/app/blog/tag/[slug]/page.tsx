import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/features/blog/post-card";
import { cardSelect, PUBLIC_POSTS } from "@/features/blog/queries";
import { prisma } from "@/lib/prisma";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

async function getTag(slug: string) {
  return prisma.blogTag.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } });
}

export async function generateMetadata(props: PageProps<"/blog/tag/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const tag = await getTag(slug);
  if (!tag) return {};

  return {
    title: `${tag.name}`,
    description: `Everything on the blog tagged ${tag.name}.`,
    // A tag page is a filtered view of writing that lives elsewhere. It earns
    // its URL for a reader and not for an index — telling search engines to
    // crawl every tag is how a small blog becomes a thousand thin pages.
    robots: { index: false, follow: true },
  };
}

export default async function TagPage(props: PageProps<"/blog/tag/[slug]">) {
  const { slug } = await props.params;

  const tag = await getTag(slug);
  if (!tag) notFound();

  const posts = await prisma.blogPost.findMany({
    where: { ...PUBLIC_POSTS, tags: { some: { tagId: tag.id } } },
    orderBy: { publishedAt: "desc" },
    select: cardSelect,
  });

  /**
   * A tag with nothing published under it is not a page.
   *
   * Unlike a category, a tag is created by typing it into the editor — so an
   * empty one is nearly always a typo, or the last post using it being
   * unpublished. Neither deserves a URL that says "yes, this topic exists, and
   * there is nothing in it".
   */
  if (posts.length === 0) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHeader
          eyebrow="Tagged"
          title={tag.name}
          lede={`${posts.length} ${posts.length === 1 ? "note" : "notes"} on this.`}
          actions={
            <Link
              href="/blog"
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-sakura/40 hover:text-foreground"
            >
              All notes
            </Link>
          }
        />

        <Container className="py-12 sm:py-16">
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
