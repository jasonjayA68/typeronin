"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * Game mode and leaderboard season mutations.
 *
 * Each one re-checks its permission. A Server Action is a public HTTP endpoint —
 * the page guard protects the render, not these — so every rule below lives in
 * the action rather than only in the form that happens to call it.
 */

export type PlayActionResult = { ok: true } | { ok: false; message: string };

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string }).code === "P2002";
}

function refreshModes() {
  revalidatePath("/admin/modes");
  // A retired mode must be gone from the dojo picker on the next render, not
  // when a cached shell expires.
  revalidatePath("/dojo");
}

function refreshSeasons() {
  revalidatePath("/admin/leaderboards");
  revalidatePath("/leaderboard");
}

/* ------------------------------------------------------------ game modes */

/** Integer percentages: 100 = unchanged. A float here rounds into balances. */
const multiplier = z.coerce.number().int().min(0, "A multiplier cannot be negative.").max(1000, "A multiplier above 1000% is a typo, not a design.");
const seconds = z.coerce.number().int().min(5).max(7200);

const modeFields = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "A slug is lowercase letters, numbers and hyphens."),
  name: z.string().trim().min(2, "Give it a name.").max(60),
  description: z.string().trim().max(240).nullable(),
  kanji: z.string().trim().max(4).nullable(),
  kind: z.enum(["PRACTICE", "TIMED"]),
  isActive: z.boolean(),
  sort: z.coerce.number().int().min(0).max(999),
  timeOptions: z.array(seconds).max(8, "Eight clocks is already more than anyone will read."),
  allowCustomTime: z.boolean(),
  customMinSeconds: seconds.nullable(),
  customMaxSeconds: seconds.nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).nullable(),
  honorMultiplier: multiplier,
  xpMultiplier: multiplier,
  kiCost: z.coerce.number().int().min(0).max(10_000),
  minAccuracy: z.coerce.number().int().min(0, "An accuracy floor cannot be negative.").max(100, "An accuracy floor above 100% can never be met."),
});

const createModeInput = modeFields.extend({ categoryIds: z.array(z.uuid()).max(50) });

type ModeFields = z.infer<typeof modeFields>;

/**
 * The rules no single field can express.
 *
 * `kind` is an enum because each kind implies engine behaviour, and the engine
 * for TIMED needs a clock to start: a timed mode offering neither a preset nor a
 * custom span is a row that renders a picker with nothing in it.
 */
function checkMode(data: ModeFields): string | null {
  if (data.kind === "TIMED" && data.timeOptions.length === 0 && !data.allowCustomTime) {
    return "A timed mode needs at least one clock, or custom time allowed. Otherwise there is nothing to start.";
  }
  if (data.kind === "PRACTICE" && (data.timeOptions.length > 0 || data.allowCustomTime)) {
    return "A practice mode has no clock. Clear its time options, or make it timed.";
  }
  if (data.allowCustomTime) {
    if (data.customMinSeconds === null || data.customMaxSeconds === null) {
      return "Custom time needs both a floor and a ceiling.";
    }
    if (data.customMinSeconds >= data.customMaxSeconds) {
      return "The custom time floor must be below its ceiling.";
    }
  }
  return null;
}

function clocks(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/** Rejects ids that are not categories, so a pool cannot point at nothing. */
async function poolIsUnknown(categoryIds: string[]): Promise<boolean> {
  if (categoryIds.length === 0) return false;
  const found = await prisma.category.count({ where: { id: { in: categoryIds } } });
  return found !== categoryIds.length;
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the details.";
}

export async function createGameMode(input: unknown): Promise<PlayActionResult> {
  const { user } = await requirePermission("modes:write");

  const parsed = createModeInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const { categoryIds, ...fields } = parsed.data;
  const problem = checkMode(fields);
  if (problem) return { ok: false, message: problem };

  const pool = [...new Set(categoryIds)];
  if (await poolIsUnknown(pool)) {
    return { ok: false, message: "That word pool names a category that does not exist." };
  }

  try {
    const mode = await prisma.gameMode.create({
      data: {
        ...fields,
        timeOptions: clocks(fields.timeOptions),
        categories: { create: pool.map((categoryId) => ({ categoryId })) },
      },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "mode.created",
      entity: "GameMode",
      entityId: mode.id,
      meta: { slug: fields.slug, kind: fields.kind, categories: pool.length },
    });

    refreshModes();
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, message: `The slug "${fields.slug}" is taken.` };
    console.error("createGameMode failed", error);
    return { ok: false, message: "That mode could not be created." };
  }
}

export async function updateGameMode(modeId: string, input: unknown): Promise<PlayActionResult> {
  const { user } = await requirePermission("modes:write");

  const id = z.uuid().safeParse(modeId);
  if (!id.success) return { ok: false, message: "Unknown mode." };

  const parsed = modeFields.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const problem = checkMode(parsed.data);
  if (problem) return { ok: false, message: problem };

  try {
    await prisma.gameMode.update({
      where: { id: id.data },
      data: { ...parsed.data, timeOptions: clocks(parsed.data.timeOptions) },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "mode.updated",
      entity: "GameMode",
      entityId: id.data,
      meta: { slug: parsed.data.slug, kind: parsed.data.kind, isActive: parsed.data.isActive },
    });

    refreshModes();
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: `The slug "${parsed.data.slug}" is taken.` };
    }
    console.error("updateGameMode failed", error);
    return { ok: false, message: "That mode could not be saved." };
  }
}

export async function setGameModeActive(modeId: string, isActive: boolean): Promise<PlayActionResult> {
  const { user } = await requirePermission("modes:write");

  const id = z.uuid().safeParse(modeId);
  if (!id.success) return { ok: false, message: "Unknown mode." };

  try {
    const mode = await prisma.gameMode.update({
      where: { id: id.data },
      data: { isActive },
      select: { slug: true },
    });

    await audit({
      actorId: user.id,
      action: isActive ? "mode.enabled" : "mode.retired",
      entity: "GameMode",
      entityId: id.data,
      meta: { slug: mode.slug },
    });

    refreshModes();
    return { ok: true };
  } catch (error) {
    console.error("setGameModeActive failed", error);
    return { ok: false, message: "That mode could not be changed." };
  }
}

export async function setGameModeCategories(
  modeId: string,
  categoryIds: string[]
): Promise<PlayActionResult> {
  const { user } = await requirePermission("modes:write");

  const parsed = z
    .object({ modeId: z.uuid(), categoryIds: z.array(z.uuid()).max(50) })
    .safeParse({ modeId, categoryIds });
  if (!parsed.success) return { ok: false, message: "Unknown mode or category." };

  const pool = [...new Set(parsed.data.categoryIds)];
  if (await poolIsUnknown(pool)) {
    return { ok: false, message: "That word pool names a category that does not exist." };
  }

  try {
    // Replace rather than diff: the set is small, and a partial write would leave
    // a pool nobody chose.
    await prisma.$transaction([
      prisma.gameModeCategory.deleteMany({ where: { gameModeId: parsed.data.modeId } }),
      prisma.gameModeCategory.createMany({
        data: pool.map((categoryId) => ({ gameModeId: parsed.data.modeId, categoryId })),
      }),
    ]);

    await audit({
      actorId: user.id,
      action: "mode.pool",
      entity: "GameMode",
      entityId: parsed.data.modeId,
      // An empty pool means every active category, so the count is the whole story.
      meta: { categories: pool.length },
    });

    refreshModes();
    return { ok: true };
  } catch (error) {
    console.error("setGameModeCategories failed", error);
    return { ok: false, message: "That word pool could not be saved." };
  }
}

export async function deleteGameMode(modeId: string): Promise<PlayActionResult> {
  const { user } = await requirePermission("modes:write");

  const id = z.uuid().safeParse(modeId);
  if (!id.success) return { ok: false, message: "Unknown mode." };

  try {
    // Counted before the delete, and only for the log: TypingSession.gameModeId is
    // SetNull, so the runs survive with `mode` still recording what kind they were.
    const sessions = await prisma.typingSession.count({ where: { gameModeId: id.data } });

    const mode = await prisma.gameMode.delete({
      where: { id: id.data },
      select: { slug: true },
    });

    await audit({
      actorId: user.id,
      action: "mode.deleted",
      entity: "GameMode",
      entityId: id.data,
      meta: { slug: mode.slug, sessionsKept: sessions },
    });

    refreshModes();
    return { ok: true };
  } catch (error) {
    console.error("deleteGameMode failed", error);
    return { ok: false, message: "That mode could not be removed." };
  }
}

/* ---------------------------------------------------------- leaderboards */

const seasonInput = z.object({
  scope: z.enum(["GLOBAL", "WEEKLY", "MONTHLY", "COUNTRY"]),
  label: z.string().trim().min(2, "Give the season a label.").max(60),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function createSeason(input: unknown): Promise<PlayActionResult> {
  const { user } = await requirePermission("settings:write");

  const parsed = seasonInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "A season needs a scope, a label and two dates." };

  const { scope, label, startsAt, endsAt } = parsed.data;
  if (endsAt <= startsAt) return { ok: false, message: "A season must end after it starts." };

  try {
    const season = await prisma.leaderboardSeason.create({
      data: { scope, label, startsAt, endsAt },
      select: { id: true },
    });

    await audit({
      actorId: user.id,
      action: "season.created",
      entity: "LeaderboardSeason",
      entityId: season.id,
      meta: { scope, label },
    });

    refreshSeasons();
    return { ok: true };
  } catch (error) {
    // @@unique([scope, startsAt]): one season per scope may begin at any moment.
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: `A ${scope.toLowerCase()} season already starts at that moment. Move the start, or close the one that holds it.`,
      };
    }
    console.error("createSeason failed", error);
    return { ok: false, message: "That season could not be opened." };
  }
}

export async function closeSeason(seasonId: string): Promise<PlayActionResult> {
  const { user } = await requirePermission("settings:write");

  const id = z.uuid().safeParse(seasonId);
  if (!id.success) return { ok: false, message: "Unknown season." };

  try {
    // Guarded in the WHERE rather than by reading first: two admins closing at
    // once must not overwrite the earlier closing time.
    const closed = await prisma.leaderboardSeason.updateMany({
      where: { id: id.data, closedAt: null },
      data: { closedAt: new Date() },
    });

    if (closed.count === 0) {
      return { ok: false, message: "That season is already closed, or is not there." };
    }

    await audit({
      actorId: user.id,
      action: "season.closed",
      entity: "LeaderboardSeason",
      entityId: id.data,
    });

    refreshSeasons();
    return { ok: true };
  } catch (error) {
    console.error("closeSeason failed", error);
    return { ok: false, message: "That season could not be closed." };
  }
}

export async function deleteSeason(seasonId: string): Promise<PlayActionResult> {
  const { user } = await requirePermission("settings:write");

  const id = z.uuid().safeParse(seasonId);
  if (!id.success) return { ok: false, message: "Unknown season." };

  try {
    // LeaderboardEntry cascades. It is a cache of standings derived from
    // TypingSession, so what is lost here is recomputable; the runs are not touched.
    const entries = await prisma.leaderboardEntry.count({ where: { seasonId: id.data } });

    const season = await prisma.leaderboardSeason.delete({
      where: { id: id.data },
      select: { scope: true, label: true },
    });

    await audit({
      actorId: user.id,
      action: "season.deleted",
      entity: "LeaderboardSeason",
      entityId: id.data,
      meta: { scope: season.scope, label: season.label, entriesDropped: entries },
    });

    refreshSeasons();
    return { ok: true };
  } catch (error) {
    console.error("deleteSeason failed", error);
    return { ok: false, message: "That season could not be removed." };
  }
}
