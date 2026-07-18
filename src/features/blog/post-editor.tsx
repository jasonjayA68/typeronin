"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { BodyEditor } from "@/features/blog/editor";
import { createPost, deletePost, setPostFlags, setPostStatus, updatePost } from "@/features/blog/post-actions";
import { MediaPicker, type Picked } from "@/features/media/media-picker";
import { MediaThumb } from "@/features/media/media-thumb";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Panel } from "@/features/admin/ui";

/**
 * The post editor.
 *
 * Saving and publishing are two buttons because they are two permissions — see
 * features/blog/post-actions.ts. A writer holding only `blog:write` gets the
 * whole editor and no way to put it live, and the state panel says so rather
 * than showing a button that would 404 them.
 */

export type PostDraftValues = {
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
};

export type PostEditorProps = {
  /** Null for a post that does not exist yet. */
  postId: string | null;
  initial: PostDraftValues;
  initialContent: unknown;
  initialFeatured: Picked | null;
  initialOg: Picked | null;
  categories: { id: string; name: string }[];
  status: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  isFeatured: boolean;
  isTrending: boolean;
  canPublish: boolean;
};

const field =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const STATUS_COPY: Record<string, string> = {
  DRAFT: "Only people with access to this panel can read it.",
  SCHEDULED: "Written and dated. The publisher job puts it live when the time comes.",
  PUBLISHED: "Live. Anyone can read it.",
  ARCHIVED: "Taken off the blog. The writing is kept.",
};

/** The datetime-local input wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ImageField({
  label,
  hint,
  picked,
  onPick,
  onClear,
  disabled,
}: {
  label: string;
  hint: string;
  picked: Picked | null;
  onPick: (media: Picked) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {picked ? (
        <div className="flex items-center gap-3">
          <MediaThumb media={{ ...picked, altText: picked.altText }} className="size-14 shrink-0" sizes="56px" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {picked.fileName}
          </span>
          <Button variant="ghost" size="xs" onClick={onClear} disabled={disabled}>
            Clear
          </Button>
        </div>
      ) : null}
      <MediaPicker
        heading={label}
        trigger={
          <Button variant="outline" size="xs" disabled={disabled}>
            {picked ? "Change" : "Choose"}
          </Button>
        }
        onPick={onPick}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function PostEditor(props: PostEditorProps) {
  const router = useRouter();
  const [values, setValues] = useState<PostDraftValues>(props.initial);
  const [featured, setFeatured] = useState<Picked | null>(props.initialFeatured);
  const [og, setOg] = useState<Picked | null>(props.initialOg);
  const [status, setStatus] = useState(props.status);
  const [when, setWhen] = useState(toLocalInput(props.scheduledFor));
  const [flags, setFlags] = useState({ isFeatured: props.isFeatured, isTrending: props.isTrending });
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * The body lives in a ref, not in state.
   *
   * `onChange` fires on every keystroke, and putting a whole document tree into
   * state would re-render this form — and the editor inside it — on each one.
   * Nothing here needs to read the body until save, so nothing does.
   */
  const contentRef = useRef<unknown>(props.initialContent);

  const set = <K extends keyof PostDraftValues>(key: K, value: PostDraftValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  /**
   * The browser's own "leave site?" prompt.
   *
   * The one piece of unsaved work in this panel that would genuinely hurt to
   * lose. It only fires on a real navigation away — a router push after saving
   * does not trigger it, because by then `dirty` is false.
   */
  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const payload = () => ({
    ...values,
    tags: values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    content: contentRef.current,
    featuredImageId: featured?.id ?? "",
    ogImageId: og?.id ?? "",
  });

  const save = () =>
    startTransition(async () => {
      if (props.postId) {
        const result = await updatePost(props.postId, payload());
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Saved");
        setDirty(false);
        router.refresh();
        return;
      }

      const created = await createPost(payload());
      if (!created.ok) {
        toast.error(created.message);
        return;
      }
      toast.success("Draft created");
      setDirty(false);
      // Onto its own URL, so a refresh from here lands on the post rather than
      // on an empty new-post form.
      router.push(`/admin/posts/${created.id}`);
    });

  const move = (next: string) =>
    startTransition(async () => {
      if (!props.postId) return;

      const result = await setPostStatus(props.postId, {
        status: next,
        // Only SCHEDULED reads this; the action ignores it otherwise.
        scheduledFor: next === "SCHEDULED" && when ? new Date(when).toISOString() : "",
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setStatus(next);
      toast.success(
        next === "PUBLISHED" ? "Published" : next === "SCHEDULED" ? "Scheduled" : next === "ARCHIVED" ? "Archived" : "Back to draft"
      );
      router.refresh();
    });

  const flag = (key: "isFeatured" | "isTrending", value: boolean) =>
    startTransition(async () => {
      if (!props.postId) return;

      const next = { ...flags, [key]: value };
      const result = await setPostFlags(props.postId, next);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setFlags(next);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (!props.postId) return;

      const result = await deletePost(props.postId, true);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${values.title} deleted`);
      setDirty(false);
      router.push("/admin/posts");
    });

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <Panel title="Post">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                value={values.title}
                disabled={pending}
                placeholder="The way of the keyboard"
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-slug">Slug</Label>
              <Input
                id="post-slug"
                value={values.slug}
                disabled={pending}
                placeholder="Left blank, it is derived from the title"
                onChange={(e) => set("slug", e.target.value)}
              />
              {status === "PUBLISHED" ? (
                <p className="text-xs text-warning">
                  This post is live. Changing the slug changes its URL, and every link to the old
                  one stops working.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-excerpt">Excerpt</Label>
              <textarea
                id="post-excerpt"
                rows={2}
                value={values.excerpt}
                disabled={pending}
                placeholder="One paragraph. Used on cards, and as the SEO description when none is set."
                onChange={(e) => set("excerpt", e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              />
            </div>
          </div>
        </Panel>

        <Panel title="Body">
          <BodyEditor
            initialContent={props.initialContent}
            disabled={pending}
            onChange={(document) => {
              contentRef.current = document;
              // Set once, not per keystroke — this is state, and the guard keeps
              // the form from re-rendering on every character typed.
              setDirty((current) => current || true);
            }}
          />
        </Panel>
      </div>

      <div className="min-w-0 space-y-4">
        <Panel title="State">
          <div className="space-y-4">
            <div>
              <p className="font-heading text-sm tracking-wide">
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {STATUS_COPY[status]}
              </p>
              {props.publishedAt ? (
                <p className="tabular mt-2 text-xs text-muted-foreground">
                  First published {new Date(props.publishedAt).toLocaleDateString("en-US")}
                </p>
              ) : null}
            </div>

            <Button
              size="sm"
              className="w-full"
              onClick={save}
              disabled={pending || !values.title.trim()}
            >
              {pending ? "Saving" : props.postId ? "Save" : "Create draft"}
            </Button>
            {dirty ? (
              <p className="text-xs text-warning">Unsaved changes.</p>
            ) : null}

            {!props.postId ? (
              <p className="text-xs text-muted-foreground">
                A post is created as a draft. Publishing comes after it exists.
              </p>
            ) : props.canPublish ? (
              <div className="space-y-3 border-t border-border pt-4">
                {status !== "PUBLISHED" ? (
                  <Button
                    size="sm"
                    variant="dojo"
                    className="w-full"
                    onClick={() => move("PUBLISHED")}
                    disabled={pending || dirty}
                  >
                    Publish now
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => move("DRAFT")}
                    disabled={pending}
                  >
                    Return to draft
                  </Button>
                )}

                {dirty && status !== "PUBLISHED" ? (
                  // Publishing sends what is in the database, not what is on
                  // screen. Rather than silently publishing the old text, say so.
                  <p className="text-xs text-muted-foreground">Save first — publishing sends the saved version.</p>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="post-when">Schedule</Label>
                  <input
                    id="post-when"
                    type="datetime-local"
                    value={when}
                    disabled={pending}
                    onChange={(e) => setWhen(e.target.value)}
                    className={field}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    className="w-full"
                    onClick={() => move("SCHEDULED")}
                    disabled={pending || !when || dirty}
                  >
                    Schedule
                  </Button>
                </div>

                {status !== "ARCHIVED" ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="w-full"
                    onClick={() => move("ARCHIVED")}
                    disabled={pending}
                  >
                    Archive
                  </Button>
                ) : null}

                <div className="space-y-2 border-t border-border pt-3">
                  <Label htmlFor="post-featured" className="text-xs">
                    <input
                      id="post-featured"
                      type="checkbox"
                      checked={flags.isFeatured}
                      disabled={pending}
                      onChange={(e) => flag("isFeatured", e.target.checked)}
                      className="size-4 accent-sakura"
                    />
                    Featured
                  </Label>
                  <Label htmlFor="post-trending" className="text-xs">
                    <input
                      id="post-trending"
                      type="checkbox"
                      checked={flags.isTrending}
                      disabled={pending}
                      onChange={(e) => flag("isTrending", e.target.checked)}
                      className="size-4 accent-sakura"
                    />
                    Pinned as trending
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    An editorial pin, independent of what readers actually read.
                  </p>
                </div>

                <Dialog open={confirming} onOpenChange={setConfirming}>
                  <DialogTrigger asChild>
                    <Button size="xs" variant="ghost" className="w-full text-muted-foreground">
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete {values.title || "this post"}</DialogTitle>
                      <DialogDescription>
                        This removes the post and every comment on it, for good. Archiving takes it
                        off the blog and keeps the writing — that is nearly always the one you want.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
                        Cancel
                      </Button>
                      <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
                        {pending ? "Deleting" : "Delete for good"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                Publishing needs the <code className="text-xs">blog:publish</code> permission, which
                this account does not hold. Save the draft and someone who has it can put it live.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Filing">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-category">Category</Label>
              <select
                id="post-category"
                value={values.categoryId}
                disabled={pending}
                onChange={(e) => set("categoryId", e.target.value)}
                className={field}
              >
                <option value="">Uncategorised</option>
                {props.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-tags">Tags</Label>
              <Input
                id="post-tags"
                value={values.tags}
                disabled={pending}
                placeholder="kata, posture, drills"
                onChange={(e) => set("tags", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separated by commas. A tag is a page with a URL, so new ones are made as needed and
                matched case-insensitively.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Images">
          <div className="space-y-4">
            <ImageField
              label="Featured image"
              hint="Shown on cards and at the top of the article."
              picked={featured}
              disabled={pending}
              onPick={(media) => {
                setFeatured(media);
                setDirty(true);
              }}
              onClear={() => {
                setFeatured(null);
                setDirty(true);
              }}
            />
            <ImageField
              label="Social image"
              hint="What appears when the link is shared. Falls back to the featured image."
              picked={og}
              disabled={pending}
              onPick={(media) => {
                setOg(media);
                setDirty(true);
              }}
              onClear={() => {
                setOg(null);
                setDirty(true);
              }}
            />
          </div>
        </Panel>

        <Panel title="Search">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-seo-title">SEO title</Label>
              <Input
                id="post-seo-title"
                value={values.seoTitle}
                disabled={pending}
                placeholder="Falls back to the title"
                onChange={(e) => set("seoTitle", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-seo-description">SEO description</Label>
              <textarea
                id="post-seo-description"
                rows={2}
                value={values.seoDescription}
                disabled={pending}
                placeholder="Falls back to the excerpt"
                onChange={(e) => set("seoDescription", e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-canonical">Canonical URL</Label>
              <Input
                id="post-canonical"
                value={values.canonicalUrl}
                disabled={pending}
                placeholder="Only if this was published elsewhere first"
                onChange={(e) => set("canonicalUrl", e.target.value)}
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
