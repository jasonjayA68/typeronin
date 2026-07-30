import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { holds, requirePermission } from "@/features/admin/guard";
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
import { deleteWord, setWordsActive } from "@/features/admin/word-actions";
import { WordCreate, WordImport } from "@/features/admin/word-form";
import { prisma } from "@/lib/prisma";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export const metadata: Metadata = {
  title: "Words",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type Query = {
  q?: string;
  category?: string;
  difficulty?: string;
  active?: string;
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
function link(query: Query, path = "/admin/words"): string {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.category) search.set("category", query.category);
  if (query.difficulty) search.set("difficulty", query.difficulty);
  if (query.active) search.set("active", query.active);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/** A hidden `back` field is attacker-supplied; only ever return to this module. */
function safeBack(value: FormDataEntryValue | null): string {
  const raw = String(value ?? "");
  return raw.startsWith("/admin/words") ? raw : "/admin/words";
}

function refused(back: string): string {
  const [path, query = ""] = back.split("?");
  const search = new URLSearchParams(query);
  search.set("notice", "refused");
  return `${path}?${search.toString()}`;
}

async function toggleWord(formData: FormData) {
  "use server";

  const back = safeBack(formData.get("back"));
  const result = await setWordsActive(
    [String(formData.get("id") ?? "")],
    formData.get("next") === "true"
  );

  redirect(result.ok ? back : refused(back));
}

async function removeWord(formData: FormData) {
  "use server";

  const back = safeBack(formData.get("back"));
  const result = await deleteWord(String(formData.get("id") ?? ""));

  redirect(result.ok ? back : refused(back));
}

export default async function WordsPage(props: PageProps<"/admin/words">) {
  const context = await requirePermission("words:read");
  const canWrite = holds(context, "words:write");

  const searchParams = await props.searchParams;

  const q = one(searchParams.q);
  const category = one(searchParams.category);
  const difficultyParam = one(searchParams.difficulty)?.toUpperCase();
  const difficulty = DIFFICULTIES.find((value) => value === difficultyParam);
  const activeParam = one(searchParams.active);
  const active = activeParam === "true" ? true : activeParam === "false" ? false : undefined;
  const notice = one(searchParams.notice);

  const filter: Query = {
    q,
    category,
    difficulty,
    active: active === undefined ? undefined : String(active),
  };

  const where = {
    ...(q ? { text: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(active === undefined ? {} : { isActive: active }),
  };

  const [total, activeCount, byDifficulty, categories] = await Promise.all([
    prisma.word.count({ where }),
    prisma.word.count({ where: { ...where, isActive: true } }),
    prisma.word.groupBy({ by: ["difficulty"], where, _count: { _all: true } }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { sort: "asc" },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(one(searchParams.page) ?? "1");
  const page = Math.min(Math.max(Number.isFinite(requested) ? Math.trunc(requested) : 1, 1), pages);

  const words = await prisma.word.findMany({
    where,
    orderBy: [{ text: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      text: true,
      difficulty: true,
      lang: true,
      isActive: true,
      tags: true,
      frequency: true,
      category: { select: { name: true } },
    },
  });

  const back = link({ ...filter, page });
  const countOf = (value: Difficulty) =>
    byDifficulty.find((row) => row.difficulty === value)?._count._all ?? 0;
  const number = (value: number) => value.toLocaleString("en-US");

  return (
    <AdminPage
      title="Words"
      description="The list of words the games use. Each word sits in one category. Difficulty and frequency decide how often it is picked. A word with a meaning also becomes a Find the Word question."
      actions={
        // A plain anchor rather than PanelLink: this is a download, and Link
        // would prefetch it — running the export query on hover.
        <a
          href={link(filter, "/admin/words/export")}
          className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Export CSV
        </a>
      }
    >
      {notice === "refused" ? (
        <p
          role="status"
          className="rounded-lg border border-sakura/30 bg-sakura/10 px-4 py-3 text-sm text-sakura"
        >
          That change was not allowed. Nothing was changed.
        </p>
      ) : null}

      <PanelGrid cols={4}>
        <Stat
          label="Words"
          value={number(total)}
          hint={`${number(activeCount)} on · ${number(total - activeCount)} off`}
          framed
          accent
        />
        {DIFFICULTIES.map((value) => (
          <Stat key={value} label={title(value)} value={number(countOf(value))} framed />
        ))}
      </PanelGrid>

      <Panel title="Word list">
        <Toolbar>
          {/* GET, so a search is a URL someone can send to someone else. */}
          <form method="get" action="/admin/words" className="flex w-full min-w-0 shrink-0 gap-2 sm:w-72">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {difficulty ? <input type="hidden" name="difficulty" value={difficulty} /> : null}
            {activeParam ? <input type="hidden" name="active" value={activeParam} /> : null}
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search words"
              aria-label="Search words"
              className="h-7 min-w-0 flex-1"
            />
            <Button type="submit" size="sm" variant="outline" className="shrink-0">
              Search
            </Button>
          </form>

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

          <Pill href={link({ ...filter, difficulty: undefined })} active={!difficulty}>
            Any difficulty
          </Pill>
          {DIFFICULTIES.map((value) => (
            <Pill
              key={value}
              href={link({ ...filter, difficulty: value })}
              active={difficulty === value}
            >
              {title(value)}
            </Pill>
          ))}

          <Pill href={link({ ...filter, active: undefined })} active={active === undefined}>
            On or off
          </Pill>
          <Pill href={link({ ...filter, active: "true" })} active={active === true}>
            On
          </Pill>
          <Pill href={link({ ...filter, active: "false" })} active={active === false}>
            Off
          </Pill>
        </Toolbar>

        {words.length ? (
          <>
            <DataTable>
              <caption className="sr-only">
                Words matching the current filter, ordered alphabetically.
              </caption>
              <thead>
                <Tr>
                  <Th>Word</Th>
                  <Th>Category</Th>
                  <Th>Difficulty</Th>
                  <Th>Language</Th>
                  <Th>Tags</Th>
                  <Th numeric>Frequency</Th>
                  <Th>State</Th>
                  {canWrite ? <Th numeric>Actions</Th> : null}
                </Tr>
              </thead>
              <tbody>
                {words.map((word) => (
                  <Tr key={word.id}>
                    <Td className="font-medium whitespace-nowrap text-foreground">{word.text}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {word.category.name}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {title(word.difficulty)}
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-muted-foreground">{word.lang}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {word.tags.length ? word.tags.join(" · ") : "—"}
                    </Td>
                    <Td className="text-muted-foreground" numeric>
                      {word.frequency === null ? "—" : number(word.frequency)}
                    </Td>
                    <Td>
                      <StatusDot tone={word.isActive ? "on" : "off"}>
                        {word.isActive ? "On" : "Off"}
                      </StatusDot>
                    </Td>
                    {canWrite ? (
                      <Td numeric>
                        <div className="flex justify-end gap-2">
                          <form action={toggleWord}>
                            <input type="hidden" name="id" value={word.id} />
                            <input type="hidden" name="next" value={String(!word.isActive)} />
                            <input type="hidden" name="back" value={back} />
                            <Button type="submit" size="xs" variant="ghost">
                              {word.isActive ? "Turn off" : "Turn on"}
                            </Button>
                          </form>
                          <form action={removeWord}>
                            <input type="hidden" name="id" value={word.id} />
                            <input type="hidden" name="back" value={back} />
                            <Button type="submit" size="xs" variant="ghost">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </Td>
                    ) : null}
                  </Tr>
                ))}
              </tbody>
            </DataTable>

            <Pagination page={page} pages={pages} build={(next) => link({ ...filter, page: next })} />
          </>
        ) : (
          <EmptyState title="No words match">
            No word fits this filter. Try a wider filter, or add the word below.
          </EmptyState>
        )}
      </Panel>

      {canWrite ? (
        <Panel title="Add a word">
          <WordCreate categories={categories} />
        </Panel>
      ) : null}

      {canWrite ? (
        <Panel title="Import CSV">
          <WordImport categories={categories} />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
