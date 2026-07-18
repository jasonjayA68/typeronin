import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/features/admin/guard";
import {
  AdminPage,
  DataTable,
  EmptyState,
  Pagination,
  Panel,
  PanelGrid,
  Pill,
  Stat,
  StatusDot,
  Td,
  Th,
  Toolbar,
  Tr,
} from "@/features/admin/ui";
import { prisma } from "@/lib/prisma";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export const metadata: Metadata = {
  title: "Blog posts",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;
const STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
type Status = (typeof STATUSES)[number];

/** Live, pending, or off. Drives the dot beside each row. */
const TONE: Record<Status, "on" | "off" | "warn"> = {
  PUBLISHED: "on",
  SCHEDULED: "warn",
  DRAFT: "off",
  ARCHIVED: "off",
};

type Query = {
  q?: string;
  status?: string;
  category?: string;
  page?: number;
};

function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

function title(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Every link on this page carries the whole filter, so a URL is shareable. */
function link(query: Query, path = "/admin/posts"): string {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  if (query.category) search.set("category", query.category);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export default async function PostsPage(props: PageProps<"/admin/posts">) {
  await requirePermission("blog:write");

  const searchParams = await props.searchParams;

  const q = one(searchParams.q);
  const statusParam = one(searchParams.status)?.toUpperCase();
  const status = STATUSES.find((value) => value === statusParam);
  const category = one(searchParams.category);

  const filter: Query = { q, status, category };

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category: { slug: category } } : {}),
    // Title and body both. `plainText` is maintained on save precisely so this
    // does not have to walk the document tree — see features/blog/document.ts.
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { plainText: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, byStatus, categories] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.blogCategory.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { sort: "asc" },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(one(searchParams.page) ?? "1");
  const page = Math.min(Math.max(Number.isFinite(requested) ? Math.trunc(requested) : 1, 1), pages);

  const posts = await prisma.blogPost.findMany({
    where,
    // Newest work first, wherever it is in its life. `updatedAt` rather than
    // `publishedAt`: this is a workbench, and the thing you touched last is the
    // thing you are working on.
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      scheduledFor: true,
      updatedAt: true,
      viewCount: true,
      readingMinutes: true,
      isFeatured: true,
      category: { select: { name: true } },
      author: { select: { displayName: true } },
      _count: { select: { comments: true } },
    },
  });

  const countOf = (value: Status) =>
    byStatus.find((row) => row.status === value)?._count._all ?? 0;
  const number = (value: number) => value.toLocaleString("en-US");
  const date = (value: Date | null) =>
    value ? value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <AdminPage
      title="Blog posts"
      description="Everything written, at every stage. A post is created as a draft and stays one until someone with the right to publish decides otherwise."
      actions={
        <Button asChild size="sm">
          <Link href="/admin/posts/new">New post</Link>
        </Button>
      }
    >
      <PanelGrid cols={4}>
        <Stat label="Posts" value={number(total)} hint={`${number(countOf("PUBLISHED"))} live`} framed accent />
        <Stat label="Drafts" value={number(countOf("DRAFT"))} framed />
        <Stat label="Scheduled" value={number(countOf("SCHEDULED"))} framed />
        <Stat label="Archived" value={number(countOf("ARCHIVED"))} framed />
      </PanelGrid>

      <Panel title="Posts">
        <Toolbar>
          {/* GET, so a search is a URL someone can send to someone else. */}
          <form method="get" action="/admin/posts" className="flex w-full min-w-0 shrink-0 gap-2 sm:w-72">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search titles and bodies"
              aria-label="Search posts"
              className="h-7 min-w-0 flex-1"
            />
            <Button type="submit" size="sm" variant="outline" className="shrink-0">
              Search
            </Button>
          </form>

          <Pill href={link({ ...filter, status: undefined })} active={!status}>
            Any state
          </Pill>
          {STATUSES.map((value) => (
            <Pill key={value} href={link({ ...filter, status: value })} active={status === value}>
              {title(value)}
            </Pill>
          ))}

          {categories.length ? (
            <>
              <Pill href={link({ ...filter, category: undefined })} active={!category}>
                All categories
              </Pill>
              {categories.map((item) => (
                <Pill
                  key={item.id}
                  href={link({ ...filter, category: item.slug })}
                  active={category === item.slug}
                >
                  {item.name}
                </Pill>
              ))}
            </>
          ) : null}
        </Toolbar>

        {posts.length ? (
          <>
            <DataTable>
              <caption className="sr-only">
                Posts matching the current filter, most recently edited first.
              </caption>
              <thead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Author</Th>
                  <Th>State</Th>
                  <Th>Date</Th>
                  <Th numeric>Views</Th>
                  <Th numeric>Comments</Th>
                </Tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <Tr key={post.id}>
                    <Td>
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="block max-w-[18rem] truncate font-medium underline-offset-4 hover:underline"
                      >
                        {post.title}
                      </Link>
                      <span className="mt-0.5 block max-w-[18rem] truncate text-xs text-muted-foreground">
                        <code>{post.slug}</code>
                        {post.isFeatured ? <span className="text-sakura"> · Featured</span> : null}
                        <span className="tabular"> · {post.readingMinutes} min</span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {post.category?.name ?? "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {post.author?.displayName ?? "—"}
                    </Td>
                    <Td>
                      <StatusDot tone={TONE[post.status]}>{title(post.status)}</StatusDot>
                    </Td>
                    <Td className="tabular whitespace-nowrap text-xs text-muted-foreground">
                      {post.status === "SCHEDULED"
                        ? `for ${date(post.scheduledFor)}`
                        : post.status === "PUBLISHED"
                          ? date(post.publishedAt)
                          : `edited ${date(post.updatedAt)}`}
                    </Td>
                    <Td numeric className="text-muted-foreground">
                      {number(post.viewCount)}
                    </Td>
                    <Td numeric className="text-muted-foreground">
                      {number(post._count.comments)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>

            <Pagination page={page} pages={pages} build={(next) => link({ ...filter, page: next })} />
          </>
        ) : (
          <EmptyState
            title={q || status || category ? "Nothing matches" : "Nothing written yet"}
            action={
              <Button asChild size="sm">
                <Link href="/admin/posts/new">New post</Link>
              </Button>
            }
          >
            {q || status || category
              ? "No post fits this filter. Widen it, or start something new."
              : "The blog has no posts. The first one starts as a draft and goes out when you say so."}
          </EmptyState>
        )}
      </Panel>
    </AdminPage>
  );
}
