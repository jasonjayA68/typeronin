"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { socialSchema } from "@/features/social/config";
import { SOCIAL_KEY } from "@/features/social/service";
import { prisma } from "@/lib/prisma";

/**
 * The social-links editor, mirroring the economy and play editors.
 *
 * `settings:write` — the same permission those use — because this is site
 * configuration of exactly that kind. The schema in config.ts is the validation,
 * so a half-typed address never reaches the row the footer trusts.
 */

export type SocialActionResult = { ok: true } | { ok: false; message: string };

export async function updateSocialLinks(input: unknown): Promise<SocialActionResult> {
  const { user } = await requirePermission("settings:write");

  const parsed = socialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the addresses." };
  }
  const value = parsed.data;

  try {
    await prisma.setting.upsert({
      where: { key: SOCIAL_KEY },
      update: { value, updatedById: user.id },
      create: {
        key: SOCIAL_KEY,
        value,
        description: "Social media links, rendered in the site footer.",
        updatedById: user.id,
      },
      select: { key: true },
    });

    await audit({
      actorId: user.id,
      action: "social.updated",
      entity: "Setting",
      entityId: SOCIAL_KEY,
      // Which networks are now linked — not the URLs, which are public anyway but
      // are noise in an audit line.
      meta: { linked: Object.entries(value).filter(([, v]) => v).map(([k]) => k) },
    });

    revalidatePath("/admin/social");
    // The footer is on every page; revalidate the layout-level surfaces that
    // render it most.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("updateSocialLinks failed", error);
    return { ok: false, message: "The links could not be saved." };
  }
}
