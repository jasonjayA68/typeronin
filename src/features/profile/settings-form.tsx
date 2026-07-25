"use client";

import { CameraIcon, Trash2Icon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  removeAvatar,
  updateEmail,
  updatePassword,
  updateProfileInfo,
  uploadAvatar,
  type SettingsResult,
} from "@/features/profile/settings-actions";
import { passwordStrength } from "@/features/auth/schemas";
import { AVATAR_MIME_TYPES } from "@/features/profile/settings-schemas";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/** Initials fallback when there is no photo. */
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "TR"
  );
}

function toastResult(result: SettingsResult, fallbackOk: string) {
  if (result.ok) toast.success(result.message ?? fallbackOk);
  else toast.error(result.message);
}

/**
 * Resize a chosen image to a centred 512×512 square JPEG, so the upload is small
 * (well under the server-action body limit) and the avatar is always a clean
 * square. Done in the browser so the bytes that leave are already the bytes we
 * keep.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", 0.85)
  );
}

/* ---------------------------------------------------------------- avatar */

export function AvatarSettings({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(avatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    let blob: Blob;
    try {
      blob = await toSquareJpeg(file);
    } catch {
      toast.error("That image could not be read.");
      return;
    }
    const data = new FormData();
    data.set("avatar", blob, "avatar.jpg");
    // Optimistic preview while it saves.
    setUrl(URL.createObjectURL(blob));
    start(async () => {
      const result = await uploadAvatar(data);
      toastResult(result, "Photo updated.");
      if (!result.ok) setUrl(avatarUrl);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-sakura/30 bg-sakura/10">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied host; next/image would need each allow-listed.
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true" className="font-heading text-xl text-sakura">
            {initials(name)}
          </span>
        )}
      </span>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <CameraIcon aria-hidden="true" />
            {url ? "Change photo" : "Upload photo"}
          </Button>
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await removeAvatar();
                  toastResult(result, "Photo removed.");
                  if (result.ok) setUrl(null);
                })
              }
            >
              <Trash2Icon aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Square works best.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onPick(file);
          e.target.value = ""; // allow re-picking the same file
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- profile info */

export function ProfileInfoForm({
  displayName,
  bio,
}: {
  displayName: string;
  bio: string;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(displayName);
  const [about, setAbout] = useState(bio);

  const save = () =>
    start(async () => {
      const result = await updateProfileInfo({ displayName: name, bio: about });
      toastResult(result, "Profile updated.");
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={name}
          maxLength={32}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">About you</Label>
        <textarea
          id="bio"
          value={about}
          maxLength={300}
          disabled={pending}
          rows={3}
          onChange={(e) => setAbout(e.target.value)}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          placeholder="A sentence about you (optional)."
        />
        <p className="text-right text-xs text-muted-foreground">{about.length} / 300</p>
      </div>
      <Button onClick={save} disabled={pending} variant="dojo">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- email */

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");

  const save = () =>
    start(async () => {
      const result = await updateEmail({ email });
      toastResult(result, "Check your inbox to confirm.");
      if (result.ok) setEmail("");
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-email">Current email</Label>
        <Input id="current-email" value={currentEmail} disabled readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-email">New email</Label>
        <Input
          id="new-email"
          type="email"
          inputMode="email"
          value={email}
          disabled={pending}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button onClick={save} disabled={pending || !email} variant="dojo">
        {pending ? "Sending…" : "Change email"}
      </Button>
      <p className="text-xs text-muted-foreground">
        We&apos;ll email a confirmation link. Your email changes only after you click it.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- password */

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const strength = passwordStrength(password);

  const save = () =>
    start(async () => {
      const result = await updatePassword({ password, confirm });
      toastResult(result, "Password changed.");
      if (result.ok) {
        setPassword("");
        setConfirm("");
      }
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          disabled={pending}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        {password ? (
          <p className="text-xs text-muted-foreground">
            Strength: <span className="text-foreground">{strength.label}</span>
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          disabled={pending}
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
          className={cn(confirm && confirm !== password && "border-destructive")}
        />
      </div>
      <Button onClick={save} disabled={pending || !password || !confirm} variant="dojo">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </div>
  );
}
