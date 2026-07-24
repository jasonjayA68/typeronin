import type { MetadataRoute } from "next";

import { PUBLIC_POSTS } from "@/features/blog/queries";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";

/**
 * The sitemap.
 *
 * Built from the database rather than written by hand, because the pages worth
 * indexing are the posts an editor publishes — a hand-kept list is a list that
 * is wrong by the second article.
 *
 * `PUBLIC_POSTS` is reused deliberately: it is the one definition of "a reader
 * may read this" (see features/blog/queries.ts), and a sitemap that disagrees
 * with it would hand crawlers the URLs of drafts and scheduled posts.
 */

/** Rebuilt hourly. A new post should not wait for a deploy to be listed. */
export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.9, changeFrequency: "daily" },
  { path: "/dojo", priority: 0.8, changeFrequency: "monthly" },
  { path: "/leaderboard", priority: 0.6, changeFrequency: "daily" },
  { path: "/missions", priority: 0.5, changeFrequency: "monthly" },
  { path: "/achievements", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const base: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const [posts, categories] = await Promise.all([
      prisma.blogPost.findMany({
        where: PUBLIC_POSTS,
        orderBy: { publishedAt: "desc" },
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
      prisma.blogCategory.findMany({
        where: { isActive: true },
        orderBy: { sort: "asc" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...base,
      ...categories.map((category) => ({
        url: absoluteUrl(`/blog/category/${category.slug}`),
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...posts.map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.updatedAt ?? post.publishedAt ?? now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    // A sitemap is regenerated on a timer; an unreachable database should cost
    // this build one refresh, not the whole deploy. The static routes still go
    // out, so the site never serves an empty sitemap.
    console.error("sitemap: could not read published content", error);
    return base;
  }
}
