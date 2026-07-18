"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { economySchema } from "@/features/economy/config";
import { ECONOMY_KEY } from "@/features/economy/service";
import { prisma } from "@/lib/prisma";

/**
 * The first typed setting editor.
 *
 * The settings page said this was coming — that editing arbitrary JSON safely
 * "needs per-key schemas and validation", and that until those exist the values
 * are changed with SQL. This is that, for the economy: the schema in config.ts
 * is the per-key validation, and nothing but a value that passes it can reach
 * the row. A malformed reward table can no longer be written into production
 * through this door.
 *
 * `settings:write`, the permission the settings module already uses, rather than
 * a new one — a new permission means a migration and a re-seed for a capability
 * an operator who can edit settings plainly already has.
 */

export type EconomyActionResult = { ok: true } | { ok: false; message: string };

export async function updateEconomyConfig(input: unknown): Promise<EconomyActionResult> {
  const { user } = await requirePermission("settings:write");

  const parsed = economySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values." };
  }
  const value = parsed.data;

  try {
    await prisma.setting.upsert({
      where: { key: ECONOMY_KEY },
      update: { value, updatedById: user.id },
      create: {
        key: ECONOMY_KEY,
        value,
        description: "Honor economy: conversion rate, withdrawal bounds and processing fee.",
        updatedById: user.id,
      },
      select: { key: true },
    });

    await audit({
      actorId: user.id,
      action: "economy.updated",
      entity: "Setting",
      entityId: ECONOMY_KEY,
      // The whole config is worth reading back — a bad rate is the kind of change
      // you want a line for.
      meta: { ...value },
    });

    revalidatePath("/admin/economy");
    // The wallet on every dashboard reads this rate.
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("updateEconomyConfig failed", error);
    return { ok: false, message: "The economy could not be saved." };
  }
}
