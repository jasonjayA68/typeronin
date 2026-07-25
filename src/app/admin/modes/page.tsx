import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requirePermission } from "@/features/admin/guard";
import {
  createGameMode,
  deleteGameMode,
  setGameModeActive,
  setGameModeCategories,
  updateGameMode,
} from "@/features/admin/play-actions";
import {
  AdminPage,
  DataTable,
  EmptyState,
  Panel,
  PanelGrid,
  PanelLink,
  Stat,
  StatusDot,
  Td,
  Th,
  Tr,
} from "@/features/admin/ui";
import { prisma } from "@/lib/prisma";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export const metadata: Metadata = {
  title: "Game modes",
  robots: { index: false, follow: false },
};

/** Matches Input, so a native select sits at the same height and radius. */
const CONTROL =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

async function getModes() {
  return prisma.gameMode.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      kanji: true,
      kind: true,
      isActive: true,
      sort: true,
      timeOptions: true,
      allowCustomTime: true,
      customMinSeconds: true,
      customMaxSeconds: true,
      difficulty: true,
      honorMultiplier: true,
      xpMultiplier: true,
      kiCost: true,
      minAccuracy: true,
      categories: { select: { category: { select: { id: true, name: true } } } },
      _count: { select: { sessions: true } },
    },
  });
}

type ModeRow = Awaited<ReturnType<typeof getModes>>[number];

/* ------------------------------------------------------- form → action */

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: FormDataEntryValue | null): string | null {
  return text(value) || null;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = text(value);
  return raw ? Number(raw) : null;
}

function clockList(value: FormDataEntryValue | null): number[] {
  return text(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
}

function back(notice: { error?: string; ok?: string; edit?: string }): string {
  const query = new URLSearchParams();
  if (notice.edit) query.set("edit", notice.edit);
  if (notice.error) query.set("error", notice.error);
  if (notice.ok) query.set("ok", notice.ok);
  return `/admin/modes${query.size ? `?${query}` : ""}`;
}

/**
 * The form's entry point. The imported actions carry the authority and every
 * rule; this only translates a post into a call and puts the refusal where it
 * can be read.
 */
async function saveMode(formData: FormData) {
  "use server";

  const id = text(formData.get("id"));
  const categoryIds = formData.getAll("categoryIds").map(String);
  const difficulty = text(formData.get("difficulty"));

  const fields = {
    slug: text(formData.get("slug")),
    name: text(formData.get("name")),
    description: optionalText(formData.get("description")),
    kanji: optionalText(formData.get("kanji")),
    kind: text(formData.get("kind")),
    isActive: formData.get("isActive") === "on",
    sort: Number(text(formData.get("sort")) || 0),
    timeOptions: clockList(formData.get("timeOptions")),
    allowCustomTime: formData.get("allowCustomTime") === "on",
    customMinSeconds: optionalNumber(formData.get("customMinSeconds")),
    customMaxSeconds: optionalNumber(formData.get("customMaxSeconds")),
    difficulty: difficulty || null,
    honorMultiplier: Number(text(formData.get("honorMultiplier")) || 0),
    xpMultiplier: Number(text(formData.get("xpMultiplier")) || 0),
    kiCost: Number(text(formData.get("kiCost")) || 0),
    minAccuracy: Number(text(formData.get("minAccuracy")) || 0),
  };

  if (!id) {
    const result = await createGameMode({ ...fields, categoryIds });
    redirect(result.ok ? back({ ok: "Mode created." }) : back({ edit: "new", error: result.message }));
  }

  const result = await updateGameMode(id, fields);
  if (!result.ok) redirect(back({ edit: id, error: result.message }));

  // Two actions, one save: the pool is a separate table and a separate action,
  // so a refusal here has to be reported even though the fields went through.
  const pool = await setGameModeCategories(id, categoryIds);
  redirect(pool.ok ? back({ ok: "Mode saved." }) : back({ edit: id, error: pool.message }));
}

async function toggleMode(formData: FormData) {
  "use server";

  const id = text(formData.get("id"));
  const result = await setGameModeActive(id, formData.get("next") === "on");
  redirect(result.ok ? back({ ok: "Mode changed." }) : back({ error: result.message }));
}

async function removeMode(formData: FormData) {
  "use server";

  const id = text(formData.get("id"));
  if (formData.get("confirm") !== "on") {
    redirect(back({ edit: id, error: "Tick the confirmation to delete a mode." }));
  }

  const result = await deleteGameMode(id);
  redirect(
    result.ok
      ? back({ ok: "Mode deleted. The runs played on it were kept." })
      : back({ edit: id, error: result.message })
  );
}

/* ------------------------------------------------------------------- ui */

function Field({
  name,
  label,
  hint,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={name} className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </Label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-sakura"
      />
      {label}
    </label>
  );
}

function clocksOf(mode: ModeRow): string {
  const preset = mode.timeOptions.map((s) => `${s}s`).join(", ");
  if (mode.allowCustomTime) {
    const bounds =
      mode.customMinSeconds !== null && mode.customMaxSeconds !== null
        ? `${mode.customMinSeconds}–${mode.customMaxSeconds}s`
        : "unbounded";
    return preset ? `${preset}, custom ${bounds}` : `custom ${bounds}`;
  }
  return preset || "—";
}

function ModeForm({
  mode,
  categories,
}: {
  mode: ModeRow | null;
  categories: { id: string; name: string }[];
}) {
  const pool = new Set(mode?.categories.map((c) => c.category.id) ?? []);

  return (
    <form action={saveMode} className="grid gap-4 sm:grid-cols-2">
      {mode ? <input type="hidden" name="id" value={mode.id} /> : null}

      <Field name="name" label="Name">
        <Input id="name" name="name" defaultValue={mode?.name ?? ""} required maxLength={60} />
      </Field>

      <Field name="slug" label="Slug" hint="Lowercase letters, numbers and hyphens. The engine addresses a mode by this.">
        <Input id="slug" name="slug" defaultValue={mode?.slug ?? ""} required maxLength={40} />
      </Field>

      <Field name="description" label="Description">
        <Input id="description" name="description" defaultValue={mode?.description ?? ""} maxLength={240} />
      </Field>

      <Field name="kanji" label="Kanji" hint="Optional, up to four characters.">
        <Input id="kanji" name="kanji" defaultValue={mode?.kanji ?? ""} maxLength={4} />
      </Field>

      <Field
        name="kind"
        label="Kind"
        hint="Kind is an enum because each implies engine behaviour: a clock, or no clock. Adding one is a code change."
      >
        <select id="kind" name="kind" defaultValue={mode?.kind ?? "PRACTICE"} className={CONTROL}>
          <option value="PRACTICE">Practice — untimed</option>
          <option value="TIMED">Timed — races a clock</option>
        </select>
      </Field>

      <Field name="difficulty" label="Difficulty" hint="Leave open and the player chooses.">
        <select
          id="difficulty"
          name="difficulty"
          defaultValue={mode?.difficulty ?? ""}
          className={CONTROL}
        >
          <option value="">Open — player chooses</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </Field>

      <Field
        name="timeOptions"
        label="Clocks (seconds)"
        hint="Comma separated, e.g. 120, 300. Empty for practice. A timed mode with no clock and no custom span is refused."
      >
        <Input
          id="timeOptions"
          name="timeOptions"
          defaultValue={mode?.timeOptions.join(", ") ?? ""}
          inputMode="numeric"
          className="tabular"
        />
      </Field>

      <Field name="sort" label="Sort">
        <Input
          id="sort"
          name="sort"
          type="number"
          min={0}
          max={999}
          defaultValue={mode?.sort ?? 0}
          className="tabular"
        />
      </Field>

      <Field name="customMinSeconds" label="Custom floor (seconds)">
        <Input
          id="customMinSeconds"
          name="customMinSeconds"
          type="number"
          min={5}
          max={7200}
          defaultValue={mode?.customMinSeconds ?? ""}
          className="tabular"
        />
      </Field>

      <Field name="customMaxSeconds" label="Custom ceiling (seconds)">
        <Input
          id="customMaxSeconds"
          name="customMaxSeconds"
          type="number"
          min={5}
          max={7200}
          defaultValue={mode?.customMaxSeconds ?? ""}
          className="tabular"
        />
      </Field>

      <Field
        name="honorMultiplier"
        label="Honor multiplier %"
        hint="Integer percentages, 100 leaves the payout unchanged. Range 0 to 1000."
      >
        <Input
          id="honorMultiplier"
          name="honorMultiplier"
          type="number"
          min={0}
          max={1000}
          defaultValue={mode?.honorMultiplier ?? 100}
          className="tabular"
        />
      </Field>

      <Field name="xpMultiplier" label="XP multiplier %">
        <Input
          id="xpMultiplier"
          name="xpMultiplier"
          type="number"
          min={0}
          max={1000}
          defaultValue={mode?.xpMultiplier ?? 100}
          className="tabular"
        />
      </Field>

      <Field name="kiCost" label="Ki cost" hint="Charged to start. Zero is free.">
        <Input
          id="kiCost"
          name="kiCost"
          type="number"
          min={0}
          max={10000}
          defaultValue={mode?.kiCost ?? 0}
          className="tabular"
        />
      </Field>

      <Field
        name="minAccuracy"
        label="Accuracy floor %"
        hint="Runs under this earn nothing. Zero disables the floor. Range 0 to 100."
      >
        <Input
          id="minAccuracy"
          name="minAccuracy"
          type="number"
          min={0}
          max={100}
          defaultValue={mode?.minAccuracy ?? 0}
          className="tabular"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Check name="isActive" label="Active" defaultChecked={mode?.isActive ?? true} />
        <Check name="allowCustomTime" label="Allow a custom clock" defaultChecked={mode?.allowCustomTime ?? false} />
      </div>

      <fieldset className="min-w-0 sm:col-span-2">
        <legend className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
          Word pool
        </legend>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Tick nothing and the mode draws from every active category — that is what an empty pool
          means, not a mode with no words.
        </p>
        {categories.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={pool.has(category.id)}
                  className="size-3.5 accent-sakura"
                />
                {category.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">No active categories to draw from.</p>
        )}
      </fieldset>

      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" variant="dojo" size="sm">
          {mode ? "Save mode" : "Create mode"}
        </Button>
        <PanelLink href="/admin/modes">Cancel</PanelLink>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- page */

export default async function GameModesPage(props: PageProps<"/admin/modes">) {
  await requirePermission("modes:write");

  const [modes, categories, params] = await Promise.all([
    getModes(),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    // A page's searchParams is a promise in this version — reading it is what
    // opts the route into dynamic rendering.
    props.searchParams,
  ]);

  const edit = typeof params.edit === "string" ? params.edit : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const ok = typeof params.ok === "string" ? params.ok : undefined;

  const editing = edit && edit !== "new" ? (modes.find((m) => m.id === edit) ?? null) : null;
  const showForm = edit === "new" || editing !== null;

  const active = modes.filter((m) => m.isActive).length;
  const runs = modes.reduce((total, m) => total + m._count.sessions, 0);

  return (
    <AdminPage
      title="Game modes"
      description="A mode is a row, not a deploy: its clock, its word pool, its difficulty and its payout all live in the table. Only kind stays code, because a kind is engine behaviour."
      actions={
        showForm ? null : (
          <Button asChild variant="dojo" size="sm">
            <Link href="/admin/modes?edit=new">New mode</Link>
          </Button>
        )
      }
    >
      {error ? (
        <p
          role="status"
          className="rounded-lg border border-sakura/30 bg-sakura/10 px-4 py-3 text-sm text-sakura"
        >
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
          {ok}
        </p>
      ) : null}

      <PanelGrid cols={4}>
        <Stat framed label="Modes" value={String(modes.length)} />
        <Stat framed accent label="Active" value={String(active)} hint="Retired modes keep their history." />
        <Stat framed label="Runs recorded" value={runs.toLocaleString("en-US")} />
        <Stat framed label="Active categories" value={String(categories.length)} hint="What an empty pool draws from." />
      </PanelGrid>

      <Panel title="Modes">
        {modes.length ? (
          <DataTable>
            <caption className="sr-only">
              Every game mode, with its clock, pool, difficulty, payout and the runs played on it.
            </caption>
            <thead>
              <tr>
                <Th>Mode</Th>
                <Th>Kind</Th>
                <Th>Clocks</Th>
                <Th>Difficulty</Th>
                <Th numeric>Honor</Th>
                <Th numeric>XP</Th>
                <Th numeric>Ki</Th>
                <Th numeric>Floor</Th>
                <Th>Word pool</Th>
                <Th numeric>Runs</Th>
                <Th>State</Th>
                <Th className="text-right">Edit</Th>
              </tr>
            </thead>
            <tbody>
              {modes.map((mode) => (
                <Tr key={mode.id}>
                  <Td>
                    <span className="font-medium">
                      {mode.kanji ? <span className="mr-2 text-muted-foreground">{mode.kanji}</span> : null}
                      {mode.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">{mode.slug}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{mode.kind === "TIMED" ? "Timed" : "Practice"}</Td>
                  <Td className="tabular text-xs whitespace-nowrap">{clocksOf(mode)}</Td>
                  <Td className="whitespace-nowrap capitalize">
                    {mode.difficulty ? mode.difficulty.toLowerCase() : "Open"}
                  </Td>
                  <Td numeric className={mode.honorMultiplier === 100 ? undefined : "text-sakura"}>
                    {mode.honorMultiplier}%
                  </Td>
                  <Td numeric className={mode.xpMultiplier === 100 ? undefined : "text-sakura"}>
                    {mode.xpMultiplier}%
                  </Td>
                  <Td numeric>{mode.kiCost}</Td>
                  <Td numeric>{mode.minAccuracy ? `${mode.minAccuracy}%` : "—"}</Td>
                  <Td className="text-xs">
                    {mode.categories.length ? (
                      mode.categories.map((c) => c.category.name).join(", ")
                    ) : (
                      <span className="text-muted-foreground">Every active category</span>
                    )}
                  </Td>
                  <Td numeric>{mode._count.sessions.toLocaleString("en-US")}</Td>
                  <Td>
                    <StatusDot tone={mode.isActive ? "on" : "off"}>
                      {mode.isActive ? "Active" : "Retired"}
                    </StatusDot>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      <form action={toggleMode}>
                        <input type="hidden" name="id" value={mode.id} />
                        <input type="hidden" name="next" value={mode.isActive ? "off" : "on"} />
                        <Button type="submit" size="xs" variant="outline">
                          {mode.isActive ? "Retire" : "Restore"}
                        </Button>
                      </form>
                      <PanelLink href={`/admin/modes?edit=${mode.id}`}>Edit</PanelLink>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No modes"
            action={<PanelLink href="/admin/modes?edit=new">Create the first one</PanelLink>}
          >
            The seed ships a practice and a timed mode. Without a row here the games have nothing to
            offer.
          </EmptyState>
        )}
      </Panel>

      {showForm ? (
        <Panel
          title={editing ? `Edit ${editing.name}` : "New mode"}
          action={<PanelLink href="/admin/modes">Close</PanelLink>}
        >
          <ModeForm mode={editing} categories={categories} />

          {editing ? (
            <form action={removeMode} className="mt-4 border-t border-border/60 pt-4">
              <input type="hidden" name="id" value={editing.id} />
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                Deleting this mode keeps the{" "}
                <span className="tabular text-sakura">
                  {editing._count.sessions.toLocaleString("en-US")}
                </span>{" "}
                {editing._count.sessions === 1 ? "run" : "runs"} played on it — the link is cleared
                and each run still records what kind it was. The mode itself does not come back.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Check name="confirm" label="I understand" />
                <Button type="submit" size="sm" variant="destructive">
                  Delete mode
                </Button>
              </div>
            </form>
          ) : null}
        </Panel>
      ) : null}
    </AdminPage>
  );
}
