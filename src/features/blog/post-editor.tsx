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
 * Saving and publishing are two buttons because they need two different
 * permissions — see features/blog/post-actions.ts. A writer who can only write
 * gets the whole editor and no way to put a post live, and the Status panel says
 * so rather than showing a button that would refuse them.
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
  DRAFT: "Only admins can read this. Readers cannot see it.",
  SCHEDULED: "Written and dated. It goes live on its own at the time you set.",
  PUBLISHED: "Live on the blog. Anyone can read it.",
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
                placeholder="Five ways to type faster"
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-slug">Web address</Label>
              <Input
                id="post-slug"
                value={values.slug}
                disabled={pending}
                placeholder="Leave empty and it is made from the title"
                onChange={(e) => set("slug", e.target.value)}
              />
              {status === "PUBLISHED" ? (
                <p className="text-xs text-warning">
                  This post is live. Changing the web address breaks every link to the old one.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-excerpt">Short summary</Label>
              <textarea
                id="post-excerpt"
                rows={2}
                value={values.excerpt}
                disabled={pending}
                placeholder="One short paragraph. Shown in post lists and in search results."
                onChange={(e) => set("excerpt", e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              />
            </div>
          </div>
        </Panel>

        <Panel title="Post text">
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
        <Panel title="Status">
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
                A new post is saved as a draft. You can publish it after you save.
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
                  <p className="text-xs text-muted-foreground">
                    Save first. Publishing sends the saved version, not what is on screen.
                  </p>
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
                    Show as featured
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
                    Show as trending
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    You choose this by hand. It is not based on what readers actually read.
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
                        off the blog but keeps the writing. That is usually the better choice.
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
                Your account is not allowed to publish. Save the draft, and someone who is allowed
                can put it live.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Category and tags">
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
                <option value="">No category</option>
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
                placeholder="typing, practice, beginners"
                onChange={(e) => set("tags", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas. Each tag gets its own page. New tags are created for you,
                and capital letters do not matter.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Images">
          <div className="space-y-4">
            <ImageField
              label="Main image"
              hint="Shown in post lists and at the top of the post."
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
              label="Sharing image"
              hint="Shown when the link is shared on social media. Uses the main image if empty."
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

        <Panel title="Google search">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-seo-title">Title in search results</Label>
              <Input
                id="post-seo-title"
                value={values.seoTitle}
                disabled={pending}
                placeholder="Uses the post title if empty"
                onChange={(e) => set("seoTitle", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-seo-description">Description in search results</Label>
              <textarea
                id="post-seo-description"
                rows={2}
                value={values.seoDescription}
                disabled={pending}
                placeholder="Uses the short summary if empty"
                onChange={(e) => set("seoDescription", e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="post-canonical">Original link</Label>
              <Input
                id="post-canonical"
                value={values.canonicalUrl}
                disabled={pending}
                placeholder="Only if this post appeared on another site first"
                onChange={(e) => set("canonicalUrl", e.target.value)}
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
