import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/features/blog/post-card";
import { cardSelect, PUBLIC_POSTS } from "@/features/blog/queries";
import { mediaUrl } from "@/features/media/url";
import { prisma } from "@/lib/prisma";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

/** One shelf of the blog. The category's `intro` is what makes it a page rather than a filter. */
async function getCategory(slug: string) {
  return prisma.blogCategory.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      intro: true,
      kanji: true,
      seoTitle: true,
      seoDescription: true,
      ogImage: { select: { path: true } },
    },
  });
}

export async function generateMetadata(
  props: PageProps<"/blog/category/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return {};

  const description = category.seoDescription ?? category.description ?? undefined;
  const shareUrl = category.ogImage ? mediaUrl(category.ogImage.path) : null;

  return {
    title: category.seoTitle ?? category.name,
    description,
    openGraph: {
      title: category.seoTitle ?? category.name,
      description,
      ...(shareUrl ? { images: [{ url: shareUrl }] } : {}),
    },
  };
}

export default async function CategoryPage(props: PageProps<"/blog/category/[slug]">) {
  const { slug } = await props.params;

  const category = await getCategory(slug);
  // An inactive category is not a category. Same rule as a draft post: it does
  // not exist rather than being refused.
  if (!category) notFound();

  const [posts, others] = await Promise.all([
    prisma.blogPost.findMany({
      where: { ...PUBLIC_POSTS, categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      select: cardSelect,
    }),
    prisma.blogCategory.findMany({
      where: { isActive: true, id: { not: category.id }, posts: { some: PUBLIC_POSTS } },
      select: { slug: true, name: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHeader
          eyebrow="Blog"
          kanji={category.kanji ?? "書"}
          title={category.name}
          lede={category.intro ?? category.description ?? undefined}
        />

        <Container className="py-12 sm:py-16">
          <nav aria-label="Categories" className="mb-10 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-sakura/40 hover:text-foreground"
            >
              Everything
            </Link>
            <span
              aria-current="page"
              className="rounded-lg border border-sakura/40 bg-sakura/10 px-3 py-1.5 text-xs text-sakura"
            >
              {category.name}
            </span>
            {others.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/category/${item.slug}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-sakura/40 hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {posts.length ? (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-6 py-20 text-center">
              <p className="font-heading text-lg tracking-wide">Nothing filed here yet</p>
              <p className="mx-auto mt-2 max-w-sm text-pretty text-muted-foreground">
                This shelf is waiting on its first note.{" "}
                <Link href="/blog" className="text-sakura underline-offset-4 hover:underline">
                  Everything else
                </Link>{" "}
                is over here.
              </p>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
