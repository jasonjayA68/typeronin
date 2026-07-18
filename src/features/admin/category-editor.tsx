"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/admin/content-actions";
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

export type CategoryDraft = {
  id: string;
  name: string;
  slug: string;
  description: string;
  intro: string;
  sort: number;
  isActive: boolean;
};

const BLANK: Omit<CategoryDraft, "id"> = {
  name: "",
  slug: "",
  description: "",
  intro: "",
  sort: 0,
  isActive: true,
};

/** Shared field set. Create and edit differ only in where the values start. */
function CategoryFields({
  values,
  onChange,
  disabled,
}: {
  values: Omit<CategoryDraft, "id">;
  onChange: (next: Omit<CategoryDraft, "id">) => void;
  disabled: boolean;
}) {
  const set = <K extends keyof Omit<CategoryDraft, "id">>(
    key: K,
    value: Omit<CategoryDraft, "id">[K]
  ) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          value={values.name}
          disabled={disabled}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-slug">Slug</Label>
        <Input
          id="category-slug"
          value={values.slug}
          disabled={disabled}
          placeholder="Left blank, it is derived from the name"
          onChange={(e) => set("slug", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-description">Description</Label>
        <Input
          id="category-description"
          value={values.description}
          disabled={disabled}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-intro">Intro</Label>
        <textarea
          id="category-intro"
          rows={3}
          value={values.intro}
          disabled={disabled}
          onChange={(e) => set("intro", e.target.value)}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
        />
        <p className="text-xs text-muted-foreground">
          Long-form copy for the category landing page.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <div className="w-24 space-y-2">
          <Label htmlFor="category-sort">Sort</Label>
          <Input
            id="category-sort"
            inputMode="numeric"
            className="tabular"
            value={String(values.sort)}
            disabled={disabled}
            onChange={(e) => set("sort", Number(e.target.value.replace(/\D/g, "")) || 0)}
          />
        </div>
        <Label htmlFor="category-active" className="pb-2">
          <input
            id="category-active"
            type="checkbox"
            checked={values.isActive}
            disabled={disabled}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 accent-sakura"
          />
          Active
        </Label>
      </div>
    </div>
  );
}

/** Create. Lives in the page header, so it is a dialog rather than a panel. */
export function NewCategoryButton() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(BLANK);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await createCategory(values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${values.name} added`);
      setValues(BLANK);
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New category</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            The slug is the URL. Leave it blank and it follows the name.
          </DialogDescription>
        </DialogHeader>
        <CategoryFields values={values} onChange={setValues} disabled={pending} />
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? "Saving" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Edit and delete for one row. */
export function CategoryRowActions({
  category,
  postCount,
}: {
  category: CategoryDraft;
  postCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [values, setValues] = useState<Omit<CategoryDraft, "id">>(category);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await updateCategory(category.id, values);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${values.name} saved`);
      setEditing(false);
    });

  const remove = () =>
    startTransition(async () => {
      // The count is shown above; acknowledging it is what the action requires.
      const result = await deleteCategory(category.id, true);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        postCount > 0
          ? `${category.name} removed. ${postCount} ${postCount === 1 ? "post is" : "posts are"} now uncategorised.`
          : `${category.name} removed`
      );
      setConfirming(false);
    });

  return (
    <span className="flex items-center justify-end gap-1">
      <Dialog
        open={editing}
        onOpenChange={(next) => {
          setEditing(next);
          if (next) setValues(category);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{category.name}</DialogTitle>
            <DialogDescription>
              Changing the slug changes the URL. Existing links to the old one will not resolve.
            </DialogDescription>
          </DialogHeader>
          <CategoryFields values={values} onChange={setValues} disabled={pending} />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {category.name}</DialogTitle>
            <DialogDescription>
              {postCount > 0 ? (
                <>
                  <span className="tabular text-sakura">{postCount}</span>{" "}
                  {postCount === 1 ? "post is" : "posts are"} filed here. Deleting the category
                  does not delete them — they stay published and become uncategorised, with no
                  category page to reach them from. Re-file them first if that is not what you
                  want.
                </>
              ) : (
                "Nothing is filed here. This removes the category only."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={remove} disabled={pending}>
              {pending ? "Removing" : postCount > 0 ? `Delete and uncategorise ${postCount}` : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}
