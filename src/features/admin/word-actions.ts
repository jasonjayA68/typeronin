"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * Changes to the word list.
 *
 * Each one re-checks its own permission. A Server Action is a public endpoint —
 * the page's guard protects the render, not these.
 */

export type WordActionResult = { ok: true } | { ok: false; message: string };

/** Import reports counts, so it needs more than the shared result. */
export type WordImportResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; message: string };

/** Caps, so one request cannot rewrite the whole word list. */
const BULK_MAX = 500;
const IMPORT_MAX_ROWS = 5000;

const wordFields = {
  text: z.string().trim().min(1, "A word needs text.").max(64, "That is too long for a word."),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  lang: z.string().trim().min(2, "Use a language code such as en.").max(8).default("en"),
  tags: z.array(z.string().trim().min(1).max(32)).max(12, "Use twelve tags at most.").default([]),
  frequency: z.number().int().min(0).max(10_000_000).nullable().default(null),
  /** The meaning. Blank stores null; a word without one is not a Find the Word question. */
  definition: z
    .string()
    .trim()
    .max(300, "That meaning is too long. Keep it short, like a clue.")
    .transform((v) => v || null)
    .nullable()
    .default(null),
};

const wordSchema = z.object({ ...wordFields, categoryId: z.uuid("Choose a category.") });
const importRowSchema = z.object(wordFields);

const idSchema = z.uuid();
const idsSchema = z
  .array(z.uuid())
  .min(1, "Select at least one word.")
  .max(BULK_MAX, `Select no more than ${BULK_MAX} words at once.`);

function refresh() {
  revalidatePath("/admin/words");
}

/** The word list has a unique index on [text, categoryId, lang]. */
function isDuplicate(error: unknown): boolean {
  return (error as { code?: string }).code === "P2002";
}

function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

export async function createWord(input: unknown): Promise<WordActionResult> {
  const { user } = await requirePermission("words:write");

  const parsed = wordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, "Check the details.") };

  try {
    const word = await prisma.word.create({ data: parsed.data, select: { id: true } });
    await audit({
      actorId: user.id,
      action: "word.created",
      entity: "Word",
      entityId: word.id,
      meta: { text: parsed.data.text, difficulty: parsed.data.difficulty, lang: parsed.data.lang },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, message: "That word is already in this category." };
    console.error("createWord failed", error);
    return { ok: false, message: "That word could not be saved." };
  }
}

export async function updateWord(id: string, input: unknown): Promise<WordActionResult> {
  const { user } = await requirePermission("words:write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Unknown word." };

  const parsed = wordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, "Check the details.") };

  try {
    await prisma.word.update({
      where: { id: parsedId.data },
      data: parsed.data,
      select: { id: true },
    });
    await audit({
      actorId: user.id,
      action: "word.updated",
      entity: "Word",
      entityId: parsedId.data,
      meta: { text: parsed.data.text, difficulty: parsed.data.difficulty, lang: parsed.data.lang },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, message: "That word is already in this category." };
    console.error("updateWord failed", error);
    return { ok: false, message: "That word could not be saved." };
  }
}

export async function deleteWord(id: string): Promise<WordActionResult> {
  const { user } = await requirePermission("words:write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Unknown word." };

  try {
    const word = await prisma.word.delete({
      where: { id: parsedId.data },
      select: { text: true },
    });
    await audit({
      actorId: user.id,
      action: "word.deleted",
      entity: "Word",
      entityId: parsedId.data,
      meta: { text: word.text },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("deleteWord failed", error);
    return { ok: false, message: "That word could not be removed." };
  }
}

export async function setWordsActive(ids: string[], isActive: boolean): Promise<WordActionResult> {
  const { user } = await requirePermission("words:write");

  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, "Unknown words.") };

  try {
    const { count } = await prisma.word.updateMany({
      where: { id: { in: parsed.data } },
      data: { isActive },
    });
    await audit({
      actorId: user.id,
      action: isActive ? "words.enabled" : "words.disabled",
      // The ids themselves are not worth logging in bulk; the count is.
      entity: "Word",
      meta: { count },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("setWordsActive failed", error);
    return { ok: false, message: "Those words could not be changed." };
  }
}

export async function deleteWords(ids: string[]): Promise<WordActionResult> {
  const { user } = await requirePermission("words:write");

  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, "Unknown words.") };

  try {
    const { count } = await prisma.word.deleteMany({ where: { id: { in: parsed.data } } });
    await audit({
      actorId: user.id,
      action: "words.deleted",
      entity: "Word",
      meta: { count },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("deleteWords failed", error);
    return { ok: false, message: "Those words could not be removed." };
  }
}

/**
 * Split one CSV line into fields.
 *
 * A quoted field may contain commas, and a quote inside one is doubled, per RFC
 * 4180. A field may not contain a newline: rows are split by line before this
 * runs, which is the one place this parser is narrower than the spec.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);

  return fields.map((value) => value.trim());
}

/**
 * Import words into one category.
 *
 * Columns: text,difficulty,lang,tags,frequency. `tags` is PIPE-separated
 * ("short|common") because the comma is already the field delimiter — quoting a
 * tag list would work but nothing that writes CSV by hand does it reliably.
 *
 * A header row is optional. Blank lines are ignored. Rows that fail validation
 * and rows already in the category are skipped rather than failing the import,
 * so a partly-bad file still lands the good rows.
 */
export async function importWordsCsv(csv: string, categoryId: string): Promise<WordImportResult> {
  const { user } = await requirePermission("words:write");

  const parsedCategory = z.uuid().safeParse(categoryId);
  if (!parsedCategory.success) return { ok: false, message: "Choose a category." };

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (splitCsvLine(lines[0] ?? "")[0]?.toLowerCase() === "text") lines.shift();
  if (lines.length === 0) return { ok: false, message: "That file has no rows." };
  if (lines.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      message: `That file has more than ${IMPORT_MAX_ROWS} rows. Split it into smaller files.`,
    };
  }

  const rows: (z.infer<typeof importRowSchema> & { categoryId: string })[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Definition is the last column, appended after category/active so an older
    // CSV without it still imports unchanged.
    const cells = splitCsvLine(line);
    const [text, difficulty, lang, tags, frequency] = cells;
    const definition = cells[7];

    const row = importRowSchema.safeParse({
      text,
      difficulty: difficulty?.toUpperCase(),
      lang: lang ? lang.toLowerCase() : undefined,
      tags: tags ? tags.split("|").map((tag) => tag.trim()).filter(Boolean) : undefined,
      frequency: frequency ? Number(frequency) : null,
      definition: definition ?? undefined,
    });
    if (!row.success) continue;

    // Mirrors the unique index, which is case-sensitive, so "Ken" and "ken" are
    // two words rather than one.
    const key = `${row.data.text} ${row.data.lang}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({ ...row.data, categoryId: parsedCategory.data });
  }

  if (rows.length === 0) return { ok: false, message: "No row in that file could be used." };

  try {
    const { count } = await prisma.word.createMany({ data: rows, skipDuplicates: true });
    const skipped = lines.length - count;

    await audit({
      actorId: user.id,
      action: "words.imported",
      entity: "Word",
      meta: { categoryId: parsedCategory.data, added: count, skipped },
    });
    refresh();
    return { ok: true, added: count, skipped };
  } catch (error) {
    console.error("importWordsCsv failed", error);
    return { ok: false, message: "That import could not be finished." };
  }
}
