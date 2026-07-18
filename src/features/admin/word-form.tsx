"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createWord, importWordsCsv } from "@/features/admin/word-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * Adding words. Client-side because both forms report a result worth reading —
 * a refusal, or how many rows an import actually landed — rather than just
 * navigating away.
 */

type Category = { id: string; name: string };

const field =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export function WordCreate({ categories }: { categories: Category[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      action={(formData) => {
        const frequency = String(formData.get("frequency") ?? "").trim();
        const tags = String(formData.get("tags") ?? "").trim();

        startTransition(async () => {
          const result = await createWord({
            text: formData.get("text"),
            categoryId: formData.get("categoryId"),
            difficulty: formData.get("difficulty"),
            lang: formData.get("lang"),
            tags: tags ? tags.split("|").map((tag) => tag.trim()).filter(Boolean) : [],
            frequency: frequency ? Number(frequency) : null,
            definition: formData.get("definition"),
          });

          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          formRef.current?.reset();
          toast.success("Word added.");
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="word-text">Word</Label>
        <Input id="word-text" name="text" required maxLength={64} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="word-category">Category</Label>
        <select id="word-category" name="categoryId" required className={field}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="word-difficulty">Difficulty</Label>
        <select id="word-difficulty" name="difficulty" defaultValue="EASY" className={field}>
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="word-lang">Language</Label>
        <Input id="word-lang" name="lang" defaultValue="en" maxLength={8} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="word-tags">Tags</Label>
        <Input id="word-tags" name="tags" placeholder="short|common" autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="word-frequency">Frequency</Label>
        <Input
          id="word-frequency"
          name="frequency"
          type="number"
          min={0}
          inputMode="numeric"
          className="tabular"
          autoComplete="off"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="word-definition">Meaning</Label>
        <Input
          id="word-definition"
          name="definition"
          maxLength={300}
          autoComplete="off"
          placeholder="The clue shown in SCROLL. Leave blank for a typing-only word."
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding" : "Add word"}
        </Button>
      </div>
    </form>
  );
}

export function WordImport({ categories }: { categories: Category[] }) {
  const [csv, setCsv] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={() => {
        startTransition(async () => {
          const result = await importWordsCsv(csv, categoryId);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          setCsv("");
          toast.success(
            `${result.added.toLocaleString("en-US")} added, ${result.skipped.toLocaleString("en-US")} skipped.`
          );
        });
      }}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Columns:{" "}
        <code className="text-foreground">text,difficulty,lang,tags,frequency,category,active,definition</code>
        . A header row is optional, and only <code className="text-foreground">text</code>,{" "}
        <code className="text-foreground">difficulty</code> and the trailing{" "}
        <code className="text-foreground">definition</code> matter here — an exported file feeds
        straight back. A word with a definition becomes a SCROLL question. Tags use a pipe, not a
        comma. Rows already in the category are skipped.
      </p>

      <div className="space-y-2">
        <Label htmlFor="import-category">Category</Label>
        <select
          id="import-category"
          className={cn(field, "sm:max-w-xs")}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-csv">CSV</Label>
        <textarea
          id="import-csv"
          rows={6}
          spellCheck={false}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder={"text,difficulty,lang,tags,frequency\nkatana,EASY,en,short|common,1200"}
          className={cn(field, "h-auto resize-y py-2 font-mono text-xs")}
        />
      </div>

      <Button type="submit" size="sm" variant="secondary" disabled={pending || !csv.trim()}>
        {pending ? "Importing" : "Import"}
      </Button>
    </form>
  );
}
