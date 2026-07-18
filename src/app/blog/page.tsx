import type { Metadata } from "next";
import Link from "next/link";

import { FeaturedPostCard, PostCard } from "@/features/blog/post-card";
import { cardSelect, PUBLIC_POSTS } from "@/features/blog/queries";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";
import { Button } from "@/shared/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on freelancing, working from home, and earning a living at a keyboard. The same practice the dojo asks for, applied to the work.",
};

const PAGE_SIZE = 9;

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function BlogPage(props: PageProps<"/blog">) {
  const searchParams = await props.searchParams;

  const requested = Number(one(searchParams.page) ?? "1");
  const wanted = Math.max(Number.isFinite(requested) ? Math.trunc(requested) : 1, 1);

  const [total, categories] = await Promise.all([
    prisma.blogPost.count({ where: PUBLIC_POSTS }),
    prisma.blogCategory.findMany({
      where: { isActive: true, posts: { some: PUBLIC_POSTS } },
      select: { slug: true, name: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
    }),
  ]);

  /**
   * The lead story.
   *
   * `isFeatured` is an editorial pin; the newest post is the fallback, so the
   * blog has a lead whether or not anyone has pinned one — a masthead with a hole
   * in it is worse than a masthead that picks for itself.
   *
   * It is resolved on EVERY page even though it is only rendered on the first,
   * because it has to be excluded from the grid consistently. Resolving it only
   * on page one would put it back into the list on page two, where it would show
   * up a second time and push a post off the end that no page then shows at all.
   */
  const featured =
    (await prisma.blogPost.findFirst({
      where: { ...PUBLIC_POSTS, isFeatured: true },
      orderBy: { publishedAt: "desc" },
      select: cardSelect,
    })) ??
    (await prisma.blogPost.findFirst({
      where: PUBLIC_POSTS,
      orderBy: { publishedAt: "desc" },
      select: cardSelect,
    }));

  // The grid is everything except the lead, on every page — so the pagination
  // counts that set, not the whole one.
  const gridWhere = featured ? { ...PUBLIC_POSTS, id: { not: featured.id } } : PUBLIC_POSTS;
  const pages = Math.max(1, Math.ceil((total - (featured ? 1 : 0)) / PAGE_SIZE));
  const page = Math.min(wanted, pages);

  const posts = await prisma.blogPost.findMany({
    where: gridWhere,
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: cardSelect,
  });

  return (
    <>
      <SiteHeader />
      <main id="main">
        <PageHeader
          eyebrow="Blog"
          kanji="書"
          title="Notes from the desk"
          lede="Freelancing, working from home, and earning at a keyboard. The dojo trains the hands; these are for everything after."
        />

        <Container className="py-12 sm:py-16">
          {categories.length ? (
            <nav aria-label="Categories" className="mb-10 flex flex-wrap gap-2">
              <span
                aria-current="page"
                className="rounded-lg border border-sakura/40 bg-sakura/10 px-3 py-1.5 text-xs text-sakura"
              >
                Everything
              </span>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/blog/category/${category.slug}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-sakura/40 hover:text-foreground"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}

          {featured && page === 1 ? (
            <>
              <FeaturedPostCard post={featured} />
              {posts.length ? <hr className="ink-divider my-12" /> : null}
            </>
          ) : null}

          {posts.length ? (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : featured ? null : (
            <div className="rounded-lg border border-dashed border-border px-6 py-20 text-center">
              <p className="font-heading text-lg tracking-wide">Nothing written yet</p>
              <p className="mx-auto mt-2 max-w-sm text-pretty text-muted-foreground">
                The first note is still being drafted. In the meantime, the dojo awaits.
              </p>
              <Button asChild variant="dojo" size="sm" className="mt-6">
                <Link href="/dojo">Train instead</Link>
              </Button>
            </div>
          )}

          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-16 flex items-center justify-between gap-4">
              <PageLink href={page > 1 ? `/blog?page=${page - 1}` : null}>Newer</PageLink>
              <p className="tabular text-xs text-muted-foreground">
                Page {page} of {pages}
              </p>
              <PageLink href={page < pages ? `/blog?page=${page + 1}` : null}>Older</PageLink>
            </nav>
          ) : null}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

/** A pagination step, or the dead space where one would be. */
function PageLink({ href, children }: { href: string | null; children: string }) {
  const className = "rounded-lg border px-3 py-1.5 text-xs transition-colors";

  if (!href) {
    return (
      <span className={cn(className, "border-border/50 text-muted-foreground/40")}>{children}</span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(className, "border-border text-muted-foreground hover:border-sakura/40 hover:text-foreground")}
    >
      {children}
    </Link>
  );
}
