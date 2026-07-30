"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createPassage, updatePassage } from "@/features/passages/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * Writing typing phrases. Client-side because each save reports a result worth
 * reading — why it was refused, or that it worked — rather than just navigating
 * away.
 */

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

const field =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export type PassageValues = {
  id?: string;
  title: string;
  text: string;
  difficulty: (typeof DIFFICULTIES)[number];
  sort: number;
  isActive: boolean;
};

/** Pulls the shared fields off the form; both create and edit read the same set. */
function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    text: formData.get("text"),
    difficulty: formData.get("difficulty"),
    sort: String(formData.get("sort") ?? "").trim() || 0,
    isActive: formData.get("isActive") === "on",
  };
}

/** The inputs, shared by the create panel and the edit dialog. */
function Fields({ values, idPrefix }: { values?: Partial<PassageValues>; idPrefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          name="title"
          required
          maxLength={120}
          autoComplete="off"
          defaultValue={values?.title ?? ""}
          placeholder="Still Water"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-text`}>Text</Label>
        <textarea
          id={`${idPrefix}-text`}
          name="text"
          required
          rows={4}
          maxLength={2000}
          spellCheck
          defaultValue={values?.text ?? ""}
          placeholder="The exact text the player types, from the first letter to the last."
          className={cn(field, "h-auto resize-y py-2 leading-relaxed")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-difficulty`}>Difficulty</Label>
        <select
          id={`${idPrefix}-difficulty`}
          name="difficulty"
          defaultValue={values?.difficulty ?? "MEDIUM"}
          className={field}
        >
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-sort`}>Order</Label>
        <Input
          id={`${idPrefix}-sort`}
          name="sort"
          type="number"
          min={0}
          inputMode="numeric"
          className="tabular"
          autoComplete="off"
          defaultValue={values?.sort ?? 0}
        />
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={values?.isActive ?? true}
          className="size-4 rounded border-input accent-sakura"
        />
        On — the game can use this phrase
      </label>
    </div>
  );
}

export function PassageCreate() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await createPassage(readForm(formData));
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          formRef.current?.reset();
          toast.success("Phrase added.");
        });
      }}
    >
      <Fields idPrefix="new-passage" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding" : "Add phrase"}
      </Button>
    </form>
  );
}

export function PassageEdit({ passage }: { passage: PassageValues }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="ghost">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit phrase</DialogTitle>
          <DialogDescription>
            Changes take effect the next time someone opens the game.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await updatePassage(passage.id!, readForm(formData));
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              setOpen(false);
              toast.success("Phrase saved.");
            });
          }}
          className="space-y-4"
        >
          <Fields idPrefix={`edit-${passage.id}`} values={passage} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
