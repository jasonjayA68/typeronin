"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * Passage mutations — the KATA prose an admin edits instead of the code.
 *
 * Each re-checks its own permission: a Server Action is a public endpoint, and
 * the page guard protects the render, not these. Saving a passage revalidates
 * the dojo too, so a new one is typeable on the next visit.
 */

export type PassageActionResult = { ok: true } | { ok: false; message: string };

const passageFields = {
  title: z
    .string()
    .trim()
    .min(2, "Give the passage a title.")
    .max(120, "That title is too long."),
  text: z
    .string()
    .trim()
    .min(20, "A passage needs at least a full sentence.")
    .max(2000, "That passage is longer than the game wants."),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  sort: z.coerce
    .number()
    .int()
    .min(0, "Order cannot be negative.")
    .max(9999, "That is too large an order.")
    .default(0),
  isActive: z.coerce.boolean().default(true),
};

const passageSchema = z.object(passageFields);
const idSchema = z.uuid();

function refresh() {
  revalidatePath("/admin/passages");
  revalidatePath("/dojo");
}

function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

export async function createPassage(input: unknown): Promise<PassageActionResult> {
  const { user } = await requirePermission("words:write");

  const parsed = passageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, "Check the details.") };

  try {
    const passage = await prisma.passage.create({ data: parsed.data, select: { id: true } });
    await audit({
      actorId: user.id,
      action: "passage.created",
      entity: "Passage",
      entityId: passage.id,
      meta: { title: parsed.data.title, difficulty: parsed.data.difficulty },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("createPassage failed", error);
    return { ok: false, message: "That passage could not be saved." };
  }
}

export async function updatePassage(id: string, input: unknown): Promise<PassageActionResult> {
  const { user } = await requirePermission("words:write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Unknown passage." };

  const parsed = passageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error, "Check the details.") };

  try {
    await prisma.passage.update({
      where: { id: parsedId.data },
      data: parsed.data,
      select: { id: true },
    });
    await audit({
      actorId: user.id,
      action: "passage.updated",
      entity: "Passage",
      entityId: parsedId.data,
      meta: { title: parsed.data.title, difficulty: parsed.data.difficulty },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("updatePassage failed", error);
    return { ok: false, message: "That passage could not be saved." };
  }
}

export async function setPassageActive(id: string, isActive: boolean): Promise<PassageActionResult> {
  const { user } = await requirePermission("words:write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Unknown passage." };

  try {
    await prisma.passage.update({
      where: { id: parsedId.data },
      data: { isActive },
      select: { id: true },
    });
    await audit({
      actorId: user.id,
      action: isActive ? "passage.enabled" : "passage.disabled",
      entity: "Passage",
      entityId: parsedId.data,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("setPassageActive failed", error);
    return { ok: false, message: "That passage could not be changed." };
  }
}

export async function deletePassage(id: string): Promise<PassageActionResult> {
  const { user } = await requirePermission("words:write");

  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "Unknown passage." };

  try {
    const passage = await prisma.passage.delete({
      where: { id: parsedId.data },
      select: { title: true },
    });
    await audit({
      actorId: user.id,
      action: "passage.deleted",
      entity: "Passage",
      entityId: parsedId.data,
      meta: { title: passage.title },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("deletePassage failed", error);
    return { ok: false, message: "That passage could not be removed." };
  }
}
