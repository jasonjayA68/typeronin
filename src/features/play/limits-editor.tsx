"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DEFAULT_PLAY_LIMITS, type PlayLimits } from "@/features/play/limits";
import { updatePlayLimits } from "@/features/play/actions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

/**
 * The daily-limits editor.
 *
 * Same shape as the Honor value editor: local state, a transition, a toast. What
 * each field does is spelled out beside it in plain terms, because "0" meaning
 * "no limit" or "no wait" is obvious to whoever wrote it and a trap for whoever
 * reads it next.
 */

type Draft = {
  maxGamesPerDay: string;
  cooldownSeconds: string;
  honorMultiplierPercent: string;
};

function toDraft(limits: PlayLimits): Draft {
  return {
    maxGamesPerDay: String(limits.maxGamesPerDay),
    cooldownSeconds: String(limits.cooldownSeconds),
    honorMultiplierPercent: String(limits.honorMultiplierPercent),
  };
}

const digits = (value: string) => value.replace(/[^0-9]/g, "");

function Field({
  id,
  label,
  hint,
  suffix,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  suffix: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          className="tabular"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(digits(e.target.value))}
        />
        <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function PlayLimitsEditor({ initial }: { initial: PlayLimits }) {
  const [draft, setDraft] = useState<Draft>(toDraft(initial));
  const [pending, startTransition] = useTransition();

  const set = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const max = Number(draft.maxGamesPerDay) || 0;
  const cooldown = Number(draft.cooldownSeconds) || 0;
  const mult = Number(draft.honorMultiplierPercent) || 0;

  const save = () =>
    startTransition(async () => {
      const result = await updatePlayLimits({
        maxGamesPerDay: Number(draft.maxGamesPerDay),
        cooldownSeconds: Number(draft.cooldownSeconds),
        honorMultiplierPercent: Number(draft.honorMultiplierPercent),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Limits saved");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="pl-max"
          label="Games per day"
          hint="How many games a player can earn from each day. 0 means no limit."
          suffix="games"
          value={draft.maxGamesPerDay}
          onChange={(v) => set("maxGamesPerDay", v)}
          disabled={pending}
        />
        <Field
          id="pl-cooldown"
          label="Wait between games"
          hint="How long a player must wait before the next game counts. 0 means no wait."
          suffix="seconds"
          value={draft.cooldownSeconds}
          onChange={(v) => set("cooldownSeconds", v)}
          disabled={pending}
        />
        <Field
          id="pl-mult"
          label="Honor payout"
          hint="100 pays the normal amount. 200 pays double. 50 pays half."
          suffix="%"
          value={draft.honorMultiplierPercent}
          onChange={(v) => set("honorMultiplierPercent", v)}
          disabled={pending}
        />
        <div className="sm:col-span-3">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving" : "Save limits"}
          </Button>
        </div>
      </div>

      {/* In plain words. */}
      <aside className="rounded-xl border border-border bg-card p-5 text-sm">
        <p className="font-heading text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
          What this means
        </p>
        <ul className="mt-4 space-y-2 text-muted-foreground">
          <li>
            {max === 0 ? (
              "No daily limit. Players can play as much as they like."
            ) : (
              <>
                Each player can earn from{" "}
                <span className="tabular text-foreground">{max}</span>{" "}
                {max === 1 ? "game" : "games"} a day.
              </>
            )}
          </li>
          <li>
            {cooldown === 0 ? (
              "No wait between games."
            ) : (
              <>
                Players wait <span className="tabular text-foreground">{cooldown}s</span> before the
                next game counts.
              </>
            )}
          </li>
          <li>
            {mult === 100 ? (
              "Honor pays the normal amount."
            ) : (
              <>
                Honor pays{" "}
                <span className="tabular text-foreground">{mult}%</span>
                {mult > 100 ? " — more than normal." : mult < 100 ? " — less than normal." : ""}
              </>
            )}
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Starting values: no daily limit, no wait,{" "}
          {DEFAULT_PLAY_LIMITS.honorMultiplierPercent}% Honor.
        </p>
      </aside>
    </div>
  );
}
