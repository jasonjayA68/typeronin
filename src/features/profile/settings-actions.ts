"use server";

import { revalidatePath } from "next/cache";

import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  emailChangeSchema,
  passwordChangeSchema,
  profileInfoSchema,
} from "@/features/profile/settings-schemas";
import { ensureProfile } from "@/features/profile/service";
import { MEDIA_BUCKET } from "@/features/media/url";
import { prisma } from "@/lib/prisma";
import { isAdminKeyConfigured, supabaseAdmin } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Account settings — a user editing their own profile, email and password.
 *
 * Every action re-authenticates the caller: a Server Action is a public
 * endpoint, so "the logged-in user" is established here from the verified
 * session, never trusted from an argument. A user can only ever change their own
 * account — there is no id parameter to tamper with.
 *
 * The avatar is stored in the same public `media` bucket the library uses, under
 * an `avatars/<profileId>/` prefix, so next/image's existing allow-list already
 * covers it and no new bucket is needed. Writes go through the service-role
 * client (which bypasses RLS); the authorization that makes that safe is the
 * getUser() check at the top of each action, exactly as the media library gates
 * its own writes behind a permission.
 */

export type SettingsResult = { ok: true; message?: string } | { ok: false; message: string };

const STORAGE_UNCONFIGURED =
  "Photo storage is not set up yet. It will work once the deployment has its storage key.";

function refresh(handle?: string) {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout"); // the header/menu greet by name and avatar
  if (handle) revalidatePath(`/profile/${handle}`);
}

/* -------------------------------------------------------- profile info */

export async function updateProfileInfo(input: unknown): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const parsed = profileInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  try {
    const profile = await ensureProfile(user);
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { displayName: parsed.data.displayName, bio: parsed.data.bio || null },
      select: { handle: true },
    });

    // Keep the auth user's name in step, since the header reads it from there.
    const supabase = await createClient();
    await supabase.auth.updateUser({ data: { name: parsed.data.displayName } });

    refresh(updated.handle);
    return { ok: true, message: "Profile updated." };
  } catch (error) {
    console.error("updateProfileInfo failed", error);
    return { ok: false, message: "Your profile could not be saved." };
  }
}

/* -------------------------------------------------------- avatar */

const AVATAR_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadAvatar(formData: FormData): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };
  if (!isAdminKeyConfigured) return { ok: false, message: STORAGE_UNCONFIGURED };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image to upload." };
  }
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: "Use a JPEG, PNG, or WebP image." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, message: "That image is too large. Try a smaller one." };
  }

  try {
    const profile = await ensureProfile(user);
    const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
    const folder = `avatars/${profile.id}`;

    // Clear any previous avatar for this user so we never orphan objects.
    const { data: existing } = await storage.list(folder);
    if (existing && existing.length > 0) {
      await storage.remove(existing.map((o) => `${folder}/${o.name}`));
    }

    const ext = AVATAR_EXT[file.type] ?? "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await storage.upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error("uploadAvatar storage error", uploadError);
      return { ok: false, message: "The image could not be uploaded. Try again." };
    }

    const publicUrl = storage.getPublicUrl(path).data.publicUrl;
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl: publicUrl },
      select: { handle: true },
    });

    refresh(updated.handle);
    return { ok: true, message: "Photo updated." };
  } catch (error) {
    console.error("uploadAvatar failed", error);
    return { ok: false, message: "The image could not be uploaded." };
  }
}

export async function removeAvatar(): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  try {
    const profile = await ensureProfile(user);
    if (isAdminKeyConfigured) {
      const storage = supabaseAdmin().storage.from(MEDIA_BUCKET);
      const folder = `avatars/${profile.id}`;
      const { data: existing } = await storage.list(folder);
      if (existing && existing.length > 0) {
        await storage.remove(existing.map((o) => `${folder}/${o.name}`));
      }
    }
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl: null },
      select: { handle: true },
    });
    refresh(updated.handle);
    return { ok: true, message: "Photo removed." };
  } catch (error) {
    console.error("removeAvatar failed", error);
    return { ok: false, message: "The photo could not be removed." };
  }
}

/* -------------------------------------------------------- email */

export async function updateEmail(input: unknown): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const parsed = emailChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  if (parsed.data.email.toLowerCase() === (user.email ?? "").toLowerCase()) {
    return { ok: false, message: "That is already your email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
    if (error) return { ok: false, message: error.message };

    return {
      ok: true,
      message: "Check your inbox — confirm the change from the link we just emailed.",
    };
  } catch (error) {
    console.error("updateEmail failed", error);
    return { ok: false, message: "Your email could not be changed." };
  }
}

/* -------------------------------------------------------- password */

export async function updatePassword(input: unknown): Promise<SettingsResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Sign in first." };

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the passwords." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Password changed." };
  } catch (error) {
    console.error("updatePassword failed", error);
    return { ok: false, message: "Your password could not be changed." };
  }
}
