"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

/**
 * Role grants and revocations.
 *
 * Each one re-checks the permission. A Server Action is a public endpoint — the
 * page's guard protects the render, not these.
 */

export type UserActionResult = { ok: true } | { ok: false; message: string };

/** Role slugs are seeded, so a grant is a lookup rather than free text. */
const roleSlugSchema = z.enum(["admin", "editor", "moderator"]);

export async function grantRole(profileId: string, roleSlug: string): Promise<UserActionResult> {
  const { user } = await requirePermission("users:write");

  const id = z.uuid().safeParse(profileId);
  if (!id.success) return { ok: false, message: "Unknown student." };

  const slug = roleSlugSchema.safeParse(roleSlug);
  if (!slug.success) return { ok: false, message: "Unknown role." };

  try {
    const [profile, role] = await Promise.all([
      prisma.profile.findUnique({ where: { id: id.data }, select: { handle: true } }),
      prisma.role.findUnique({ where: { slug: slug.data }, select: { id: true } }),
    ]);
    if (!profile) return { ok: false, message: "Unknown student." };
    if (!role) return { ok: false, message: "Unknown role." };

    await prisma.profileRole.upsert({
      where: { profileId_roleId: { profileId: id.data, roleId: role.id } },
      update: {},
      create: { profileId: id.data, roleId: role.id, grantedBy: user.id },
    });

    await audit({
      actorId: user.id,
      action: "role.granted",
      entity: "Profile",
      entityId: id.data,
      meta: { roleSlug: slug.data, handle: profile.handle },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("grantRole failed", error);
    return { ok: false, message: "That role could not be granted." };
  }
}

export async function revokeRole(profileId: string, roleSlug: string): Promise<UserActionResult> {
  const { user } = await requirePermission("users:write");

  const id = z.uuid().safeParse(profileId);
  if (!id.success) return { ok: false, message: "Unknown student." };

  const slug = roleSlugSchema.safeParse(roleSlug);
  if (!slug.success) return { ok: false, message: "Unknown role." };

  // Dropping your own admin role locks the panel behind a role only the panel
  // could grant back. Refuse it here rather than in the UI: this is the check
  // that survives a direct POST.
  if (slug.data === "admin" && id.data === user.id) {
    return {
      ok: false,
      message: "You cannot revoke your own admin role. Ask another Magistrate to do it.",
    };
  }

  try {
    const [profile, role] = await Promise.all([
      prisma.profile.findUnique({ where: { id: id.data }, select: { handle: true } }),
      prisma.role.findUnique({ where: { slug: slug.data }, select: { id: true } }),
    ]);
    if (!profile) return { ok: false, message: "Unknown student." };
    if (!role) return { ok: false, message: "Unknown role." };

    await prisma.profileRole.deleteMany({ where: { profileId: id.data, roleId: role.id } });

    await audit({
      actorId: user.id,
      action: "role.revoked",
      entity: "Profile",
      entityId: id.data,
      meta: { roleSlug: slug.data, handle: profile.handle },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("revokeRole failed", error);
    return { ok: false, message: "That role could not be revoked." };
  }
}
