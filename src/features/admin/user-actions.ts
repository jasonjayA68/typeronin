"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";
import { isAdminKeyConfigured, supabaseAdmin } from "@/lib/supabase/admin";

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
  if (!id.success) return { ok: false, message: "Unknown user." };

  const slug = roleSlugSchema.safeParse(roleSlug);
  if (!slug.success) return { ok: false, message: "Unknown role." };

  try {
    const [profile, role] = await Promise.all([
      prisma.profile.findUnique({ where: { id: id.data }, select: { handle: true } }),
      prisma.role.findUnique({ where: { slug: slug.data }, select: { id: true } }),
    ]);
    if (!profile) return { ok: false, message: "Unknown user." };
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
  if (!id.success) return { ok: false, message: "Unknown user." };

  const slug = roleSlugSchema.safeParse(roleSlug);
  if (!slug.success) return { ok: false, message: "Unknown role." };

  // Dropping your own admin role locks the panel behind a role only the panel
  // could grant back. Refuse it here rather than in the UI: this is the check
  // that survives a direct POST.
  if (slug.data === "admin" && id.data === user.id) {
    return {
      ok: false,
      message: "You cannot revoke your own admin role. Ask another admin to do it.",
    };
  }

  try {
    const [profile, role] = await Promise.all([
      prisma.profile.findUnique({ where: { id: id.data }, select: { handle: true } }),
      prisma.role.findUnique({ where: { slug: slug.data }, select: { id: true } }),
    ]);
    if (!profile) return { ok: false, message: "Unknown user." };
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

/** Editable profile fields. Honor, roles and account status are owned elsewhere. */
const updateSchema = z.object({
  displayName: z.string().trim().min(1, "A name is required.").max(60, "That name is too long."),
  handle: z
    .string()
    .trim()
    .min(2, "A handle needs at least two characters.")
    .max(30, "That handle is too long.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Handles use letters, numbers, hyphens and underscores only."),
  bio: z.string().trim().max(300, "Keep the bio under 300 characters.").default(""),
  countryCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a 2-letter country code, or leave it blank."),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email, or leave it blank."),
});

export type UpdateUserInput = z.infer<typeof updateSchema>;

/**
 * Edit a user's profile — display name, handle, bio, country, and email.
 *
 * The handle is public and unique, so a change is checked against the rest of the
 * table first. Email lives in Supabase auth, not our tables, so it is changed
 * through the admin API (service key) and set as already-confirmed, since a staff
 * member is making the change deliberately. Email is done before the profile
 * write so a rejected address (e.g. already in use) fails cleanly with nothing
 * half-saved.
 */
export async function updateUser(
  profileId: string,
  input: unknown
): Promise<UserActionResult> {
  const { user } = await requirePermission("users:write");

  const id = z.uuid().safeParse(profileId);
  if (!id.success) return { ok: false, message: "Unknown user." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "That change did not make sense." };
  }
  const data = parsed.data;

  try {
    const existing = await prisma.profile.findUnique({
      where: { id: id.data },
      select: { handle: true },
    });
    if (!existing) return { ok: false, message: "Unknown user." };

    if (data.handle !== existing.handle) {
      const taken = await prisma.profile.findUnique({
        where: { handle: data.handle },
        select: { id: true },
      });
      if (taken && taken.id !== id.data) {
        return { ok: false, message: "That handle is already taken." };
      }
    }

    // Email change goes through Supabase auth. Only touch it when it actually
    // differs, and fail before writing the profile if the address is rejected.
    let emailChanged = false;
    if (data.email) {
      if (!isAdminKeyConfigured) {
        return { ok: false, message: "Editing email needs the admin key to be configured." };
      }
      const admin = supabaseAdmin();
      const current = await admin.auth.admin.getUserById(id.data);
      const currentEmail = current.data.user?.email ?? "";
      if (data.email.toLowerCase() !== currentEmail.toLowerCase()) {
        const { error } = await admin.auth.admin.updateUserById(id.data, {
          email: data.email,
          email_confirm: true,
        });
        if (error) return { ok: false, message: `Email: ${error.message}` };
        emailChanged = true;
      }
    }

    await prisma.profile.update({
      where: { id: id.data },
      data: {
        displayName: data.displayName,
        handle: data.handle,
        bio: data.bio || null,
        countryCode: data.countryCode || null,
      },
    });

    await audit({
      actorId: user.id,
      action: "user.updated",
      entity: "Profile",
      entityId: id.data,
      meta: {
        displayName: data.displayName,
        handle: data.handle,
        countryChanged: Boolean(data.countryCode),
        bioChanged: Boolean(data.bio),
        emailChanged,
      },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("updateUser failed", error);
    return { ok: false, message: "That user could not be updated." };
  }
}

/**
 * Delete a student's account outright — for clearing test/dummy accounts.
 *
 * Two things must go: the Profile (which cascades every session, claim, trial and
 * withdrawal it owns, and nulls the authorship of anything it wrote) and the
 * Supabase auth user behind it — otherwise the account could log back in and
 * `ensureProfile` would quietly recreate a blank profile. The auth user is
 * removed with the service-role admin API when configured, and by a direct delete
 * on `auth.users` otherwise. That step is best-effort: if it fails the app data is
 * already gone, and the orphaned login is logged rather than left to fail the
 * whole action.
 *
 * Guards that survive a direct POST: you cannot delete yourself, and an account
 * still holding the admin role must be demoted first — a deliberate speed bump
 * against nuking a colleague.
 */
export async function deleteUser(profileId: string): Promise<UserActionResult> {
  const { user } = await requirePermission("users:write");

  const id = z.uuid().safeParse(profileId);
  if (!id.success) return { ok: false, message: "Unknown user." };

  if (id.data === user.id) {
    return { ok: false, message: "You cannot delete your own account from here." };
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: id.data },
      select: {
        handle: true,
        displayName: true,
        roles: { select: { role: { select: { slug: true } } } },
      },
    });
    if (!profile) return { ok: false, message: "Unknown user." };

    if (profile.roles.some((r) => r.role.slug === "admin")) {
      return { ok: false, message: "Revoke this user's admin role before deleting the account." };
    }

    await prisma.profile.delete({ where: { id: id.data } });

    // Remove the login itself so the account cannot come back. Best-effort.
    try {
      if (isAdminKeyConfigured) {
        await supabaseAdmin().auth.admin.deleteUser(id.data);
      } else {
        await prisma.$executeRaw`delete from auth.users where id = ${id.data}::uuid`;
      }
    } catch (authError) {
      console.error("deleteUser: profile removed but auth user delete failed", authError);
    }

    await audit({
      actorId: user.id,
      action: "user.deleted",
      entity: "Profile",
      entityId: id.data,
      meta: { handle: profile.handle, displayName: profile.displayName },
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("deleteUser failed", error);
    return { ok: false, message: "That account could not be deleted." };
  }
}
