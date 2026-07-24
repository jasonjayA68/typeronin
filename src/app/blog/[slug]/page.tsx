import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/features/ads/ad-slot";
import { PostCard } from "@/features/blog/post-card";
import { cardSelect, formatPostDate, loadBody, PUBLIC_POSTS } from "@/features/blog/queries";
import { PostBody } from "@/features/blog/renderer";
import { mediaUrl } from "@/features/media/url";
import { prisma } from "@/lib/prisma";
import { Container } from "@/shared/components/layout/container";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

/**
 * One article.
 *
 * Everything here is filtered by `PUBLIC_POSTS`, including the lookup that
 * decides whether the page exists at all. A draft is not a 403 and not a
 * "coming soon" — as far as this route is concerned it was never written, which
 * is the only answer that tells someone guessing slugs nothing.
 */

/** The lookup, shared by the page and its metadata. */
async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { ...PUBLIC_POSTS, slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      updatedAt: true,
      readingMinutes: true,
      seoTitle: true,
      seoDescription: true,
      canonicalUrl: true,
      category: { select: { slug: true, name: true, kanji: true } },
      author: { select: { displayName: true, handle: true } },
      featuredImage: { select: { path: true, altText: true, width: true, height: true } },
      ogImage: { select: { path: true } },
      tags: { select: { tag: { select: { slug: true, name: true } } } },
    },
  });
}

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPost(slug);

  // Nothing to describe. The page itself will 404; saying so twice is not
  // metadata's job.
  if (!post) return {};

  // Social first, featured second. A post that set neither gets no image rather
  // than the site's logo — a card with a real picture or a card with none reads
  // better than a card with a shrug.
  const share = post.ogImage?.path ?? post.featuredImage?.path;
  const shareUrl = share ? mediaUrl(share) : null;

  const description = post.seoDescription ?? post.excerpt ?? undefined;

  return {
    title: post.seoTitle ?? post.title,
    description,
    // Only when set. An unconditional canonical pointing at ourselves is
    // harmless but noise; this field exists for a post published elsewhere first.
    ...(post.canonicalUrl ? { alternates: { canonical: post.canonicalUrl } } : {}),
    openGraph: {
      type: "article",
      title: post.seoTitle ?? post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author ? [post.author.displayName] : undefined,
      ...(shareUrl ? { images: [{ url: shareUrl }] } : {}),
    },
    twitter: {
      card: shareUrl ? "summary_large_image" : "summary",
      title: post.seoTitle ?? post.title,
      description,
      ...(shareUrl ? { images: [shareUrl] } : {}),
    },
  };
}

export default async function PostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;

  const post = await getPost(slug);
  if (!post) notFound();

  const body = await loadBody(post.content);

  const hero = post.featuredImage ? mediaUrl(post.featuredImage.path) : null;

  // More from the same shelf. Never this post, and only if the category has any.
  const related = post.category
    ? await prisma.blogPost.findMany({
        where: { ...PUBLIC_POSTS, id: { not: post.id }, category: { slug: post.category.slug } },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: cardSelect,
      })
    : [];

  return (
    <>
      <SiteHeader />
      <main id="main">
        <article>
          <header className="paper-texture relative overflow-hidden border-b border-border/60">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_-20%,color-mix(in_oklab,var(--color-sakura)_16%,transparent),transparent_70%)]"
            />
            <Container className="relative py-14 sm:py-20">
              {post.category ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-4 -z-10 -translate-y-1/2 font-heading text-[7rem] leading-none text-foreground/[0.04] select-none sm:text-[10rem] lg:right-8"
                >
                  {post.category.kanji ?? "書"}
                </span>
              ) : null}

              <div className="mx-auto max-w-3xl">
                {post.category ? (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="font-heading text-xs font-semibold tracking-[0.22em] text-sakura uppercase underline-offset-4 hover:underline"
                  >
                    {post.category.name}
                  </Link>
                ) : null}

                <h1 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
                  {post.title}
                </h1>

                {post.excerpt ? (
                  <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">{post.excerpt}</p>
                ) : null}

                <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {post.author ? (
                    <Link
                      href={`/profile/${post.author.handle}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {post.author.displayName}
                    </Link>
                  ) : null}
                  {post.author && post.publishedAt ? <span aria-hidden="true">·</span> : null}
                  {post.publishedAt ? (
                    <time dateTime={post.publishedAt.toISOString()}>
                      {formatPostDate(post.publishedAt)}
                    </time>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span className="tabular">{post.readingMinutes} min read</span>
                </p>
              </div>
            </Container>
          </header>

          <Container className="py-12 sm:py-16">
            <div className="mx-auto max-w-3xl min-w-0">
              {hero && post.featuredImage ? (
                <figure className="mb-10">
                  {post.featuredImage.width && post.featuredImage.height ? (
                    <Image
                      src={hero}
                      // The file's own description. This image IS content here —
                      // unlike in a card, where the title already names the link.
                      alt={post.featuredImage.altText ?? ""}
                      width={post.featuredImage.width}
                      height={post.featuredImage.height}
                      sizes="(min-width: 768px) 768px, 100vw"
                      className="h-auto w-full rounded-lg"
                      priority
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hero}
                      alt={post.featuredImage.altText ?? ""}
                      className="h-auto w-full rounded-lg"
                    />
                  )}
                </figure>
              ) : null}

              {body ? (
                <PostBody document={body.document} media={body.media} className="text-[0.975rem]" />
              ) : (
                /**
                 * The body did not parse — see loadBody. The article still has a
                 * title, a date and an author, and saying plainly that the text
                 * is missing beats a 500 that takes the whole page down and tells
                 * the reader nothing.
                 */
                <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                  This article could not be displayed. It has been logged, and someone is looking at
                  it.
                </p>
              )}

              {post.tags.length ? (
                <>
                  <hr className="ink-divider my-10" />
                  <ul className="flex flex-wrap gap-2">
                    {post.tags.map(({ tag }) => (
                      <li key={tag.slug}>
                        <Link
                          href={`/blog/tag/${tag.slug}`}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-sakura/40 hover:text-foreground"
                        >
                          {tag.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            {/* The end of the read, which is where an article may carry an
                advert: below the whole piece, after the tags, clearly outside
                the prose. Not woven into the body — an advert that interrupts a
                sentence earns a click by mistake, and mistaken clicks are what
                gets an AdSense account closed. Renders nothing at all until an
                operator switches the placement on. */}
            <AdSlot placement="in-content" className="mt-14" />
          </Container>
        </article>

        {related.length ? (
          <section className="border-t border-border/60 bg-card/30">
            <Container className="py-12 sm:py-16">
              <h2 className="font-heading text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                More from {post.category?.name}
              </h2>
              <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <PostCard key={item.id} post={item} />
                ))}
              </div>
            </Container>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
