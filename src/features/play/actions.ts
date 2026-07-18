"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { playLimitsSchema } from "@/features/play/limits";
import { PLAY_LIMITS_KEY } from "@/features/play/service";
import { prisma } from "@/lib/prisma";

/**
 * The daily-limits editor, mirroring the economy one.
 *
 * `settings:write` — the seeded permission whose description is exactly "Change
 * scoring, rewards and ranking rules", which is what these are. The schema in
 * limits.ts is the validation, so no malformed rule reaches the row.
 */

export type PlayLimitsActionResult = { ok: true } | { ok: false; message: string };

export async function updatePlayLimits(input: unknown): Promise<PlayLimitsActionResult> {
  const { user } = await requirePermission("settings:write");

  const parsed = playLimitsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }
  const value = parsed.data;

  try {
    await prisma.setting.upsert({
      where: { key: PLAY_LIMITS_KEY },
      update: { value, updatedById: user.id },
      create: {
        key: PLAY_LIMITS_KEY,
        value,
        description: "Daily play limits: games per day, cooldown, and the Honor multiplier.",
        updatedById: user.id,
      },
      select: { key: true },
    });

    await audit({
      actorId: user.id,
      action: "playLimits.updated",
      entity: "Setting",
      entityId: PLAY_LIMITS_KEY,
      meta: { ...value },
    });

    revalidatePath("/admin/play-limits");
    // Every dojo load reads these.
    revalidatePath("/dojo");
    return { ok: true };
  } catch (error) {
    console.error("updatePlayLimits failed", error);
    return { ok: false, message: "The limits could not be saved." };
  }
}
