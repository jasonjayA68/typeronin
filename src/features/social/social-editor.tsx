"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  SOCIAL_INFO,
  SOCIAL_PLATFORMS,
  type SocialLinks,
} from "@/features/social/config";
import { updateSocialLinks } from "@/features/social/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * The social-links editor.
 *
 * One field per network, each next to its own glyph so an operator sees at a
 * glance which is which. A blank field is a network that will not appear in the
 * footer — validation is the server's, and blank is always allowed.
 */
export function SocialEditor({ initial }: { initial: SocialLinks }) {
  const [links, setLinks] = useState<SocialLinks>(initial);
  const [pending, startTransition] = useTransition();

  const set = (platform: keyof SocialLinks, value: string) =>
    setLinks((current) => ({ ...current, [platform]: value }));

  const save = () =>
    startTransition(async () => {
      const result = await updateSocialLinks(links);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Social links saved");
    });

  return (
    <div className="max-w-xl space-y-4">
      {SOCIAL_PLATFORMS.map((platform) => {
        const info = SOCIAL_INFO[platform];
        return (
          <div key={platform} className="space-y-2">
            <Label htmlFor={`social-${platform}`} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-muted-foreground">
                <path d={info.icon} />
              </svg>
              {info.label}
            </Label>
            <Input
              id={`social-${platform}`}
              // Gmail holds a plain email address, not a URL — the wrong input
              // type makes the browser reject a valid value before it can save.
              type={platform === "gmail" ? "email" : "url"}
              inputMode={platform === "gmail" ? "email" : "url"}
              value={links[platform]}
              disabled={pending}
              placeholder={info.placeholder}
              onChange={(e) => set(platform, e.target.value)}
            />
          </div>
        );
      })}

      <div className="pt-1">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving" : "Save links"}
        </Button>
      </div>
    </div>
  );
}
