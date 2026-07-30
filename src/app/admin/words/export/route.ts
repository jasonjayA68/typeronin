import type { NextRequest } from "next/server";

import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * The word list as a CSV file.
 *
 * A Route Handler is a public endpoint like any action, so it carries the same
 * read guard as the page. It honours the page's filters, so the file matches
 * what the person was looking at when they clicked Export.
 *
 * Columns match the importer, so an export can be edited and fed straight back:
 * `tags` is pipe-separated because the comma is the field delimiter.
 */

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
const MAX_ROWS = 50_000;

function escape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export async function GET(request: NextRequest) {
  await requirePermission("words:read");

  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const difficultyParam = searchParams.get("difficulty")?.trim().toUpperCase();
  const difficulty = DIFFICULTIES.find((value) => value === difficultyParam);
  const activeParam = searchParams.get("active");
  const active = activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const words = await prisma.word.findMany({
    where: {
      ...(q ? { text: { contains: q, mode: "insensitive" as const } } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(active === undefined ? {} : { isActive: active }),
    },
    orderBy: [{ text: "asc" }],
    take: MAX_ROWS,
    select: {
      text: true,
      difficulty: true,
      lang: true,
      tags: true,
      frequency: true,
      isActive: true,
      definition: true,
      category: { select: { slug: true } },
    },
  });

  const rows = words.map((word) =>
    [
      word.text,
      word.difficulty,
      word.lang,
      word.tags.join("|"),
      word.frequency === null ? "" : String(word.frequency),
      word.category.slug,
      String(word.isActive),
      // Appended last so an older importer that reads only the first columns is
      // unaffected, and the round-trip carries the meaning.
      word.definition ?? "",
    ]
      .map(escape)
      .join(",")
  );

  const csv = ["text,difficulty,lang,tags,frequency,category,active,definition", ...rows].join(
    "\r\n"
  );
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="words-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
