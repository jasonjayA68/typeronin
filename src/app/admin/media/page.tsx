import type { Metadata } from "next";

import { requirePermission } from "@/features/admin/guard";
import {
  AdminPage,
  EmptyState,
  Pagination,
  Panel,
  PanelGrid,
  Pill,
  Stat,
  Toolbar,
} from "@/features/admin/ui";
import { formatBytes, MEDIA_KINDS } from "@/features/media/accepted";
import { MediaRowActions } from "@/features/media/media-row-actions";
import { MediaThumb } from "@/features/media/media-thumb";
import { MediaUploader } from "@/features/media/media-uploader";
import { mediaSelect, mediaWhere } from "@/features/media/queries";
import { prisma } from "@/lib/prisma";
import { isAdminKeyConfigured } from "@/lib/supabase/admin";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export const metadata: Metadata = {
  title: "Media library",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 24;

type Query = {
  q?: string;
  kind?: string;
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
function link(query: Query, path = "/admin/media"): string {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.kind) search.set("kind", query.kind);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export default async function MediaPage(props: PageProps<"/admin/media">) {
  await requirePermission("media:write");

  const searchParams = await props.searchParams;

  const q = one(searchParams.q);
  const kindParam = one(searchParams.kind)?.toUpperCase();
  const kind = MEDIA_KINDS.find((value) => value === kindParam);

  const filter: Query = { q, kind };
  const where = mediaWhere(q, kind);

  const [total, byKind, weight] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.groupBy({ by: ["kind"], where, _count: { _all: true } }),
    prisma.media.aggregate({ where, _sum: { bytes: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(one(searchParams.page) ?? "1");
  const page = Math.min(Math.max(Number.isFinite(requested) ? Math.trunc(requested) : 1, 1), pages);

  const media = await prisma.media.findMany({
    where,
    // Newest first: the file you want is nearly always the one you just added.
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: mediaSelect,
  });

  const countOf = (value: (typeof MEDIA_KINDS)[number]) =>
    byKind.find((row) => row.kind === value)?._count._all ?? 0;
  const number = (value: number) => value.toLocaleString("en-US");

  return (
    <AdminPage
      title="Media library"
      description="Every image, video and document used on the blog. Upload a file once and use it in any post. The description you write here is used everywhere the file appears."
    >
      {!isAdminKeyConfigured ? (
        <p
          role="status"
          className="rounded-lg border border-sakura/30 bg-sakura/10 px-4 py-3 text-sm text-sakura"
        >
          File storage is not set up, so nothing can be uploaded or deleted. A developer needs to set{" "}
          <code className="text-xs">SUPABASE_SECRET_KEY</code> in{" "}
          <code className="text-xs">.env.local</code> and run{" "}
          <code className="text-xs">supabase/media-bucket.sql</code> once. Files already here still
          show and still work.
        </p>
      ) : null}

      <PanelGrid cols={4}>
        <Stat
          label="Files"
          value={number(total)}
          hint={`${formatBytes(weight._sum.bytes ?? 0)} stored`}
          framed
          accent
        />
        {MEDIA_KINDS.map((value) => (
          <Stat key={value} label={`${title(value)}s`} value={number(countOf(value))} framed />
        ))}
      </PanelGrid>

      <Panel title="Library">
        <Toolbar>
          {/* GET, so a search is a URL someone can send to someone else. */}
          <form
            method="get"
            action="/admin/media"
            className="flex w-full min-w-0 shrink-0 gap-2 sm:w-72"
          >
            {kind ? <input type="hidden" name="kind" value={kind} /> : null}
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search file name or description"
              aria-label="Search media"
              className="h-7 min-w-0 flex-1"
            />
            <Button type="submit" size="sm" variant="outline" className="shrink-0">
              Search
            </Button>
          </form>

          <Pill href={link({ ...filter, kind: undefined })} active={!kind}>
            Everything
          </Pill>
          {MEDIA_KINDS.map((value) => (
            <Pill key={value} href={link({ ...filter, kind: value })} active={kind === value}>
              {title(value)}s
            </Pill>
          ))}
        </Toolbar>

        {media.length ? (
          <>
            {/*
              A grid, where the rest of the panel is tables. A library is browsed
              by eye — a filename in a row tells you nothing about which photo it
              is. The items stay flat: the Panel is the surface, and a card around
              each thumbnail would be a second one inside it.
            */}
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((item) => (
                <li key={item.id} className="min-w-0">
                  <MediaThumb
                    media={item}
                    className="aspect-4/3 w-full"
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                  />
                  <p className="mt-2 truncate text-sm font-medium" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(item.bytes)}
                    {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                  </p>
                  {item.kind === "IMAGE" && !item.altText ? (
                    <p className="mt-1 text-xs text-warning">No description</p>
                  ) : (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.altText ?? item.caption ?? "—"}
                    </p>
                  )}
                  <div className="mt-1 -ml-2">
                    <MediaRowActions
                      media={{
                        id: item.id,
                        kind: item.kind,
                        fileName: item.fileName,
                        altText: item.altText ?? "",
                        caption: item.caption ?? "",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <Pagination page={page} pages={pages} build={(next) => link({ ...filter, page: next })} />
          </>
        ) : (
          <EmptyState title={q || kind ? "Nothing matches" : "The library is empty"}>
            {q || kind
              ? "No file fits this filter. Try a wider filter, or upload the file below."
              : "Upload the first file below. Posts use files from here."}
          </EmptyState>
        )}
      </Panel>

      {isAdminKeyConfigured ? (
        <Panel title="Upload">
          <MediaUploader />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
