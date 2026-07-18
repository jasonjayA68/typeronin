/**
 * Passages are prose, not word salad. Random word lists are what every typing
 * site drills; sentences with rhythm are what a student can actually breathe to,
 * and rhythm is the thing TypeRonin measures.
 */

export type Discipline = "kata" | "iai" | "scroll";

export type Passage = {
  id: string;
  discipline: Discipline;
  /** Shown while the passage is queued. */
  title: string;
  text: string;
};

export const DISCIPLINES: Record<
  Discipline,
  { name: string; kanji: string; blurb: string }
> = {
  kata: {
    name: "Kata",
    kanji: "型",
    blurb: "Form practice. A measured passage, cut cleanly from first char to last.",
  },
  iai: {
    name: "Iai",
    kanji: "居合",
    blurb: "The single breath. One short line, drawn and finished without hesitation.",
  },
  scroll: {
    name: "Scroll",
    kanji: "巻物",
    blurb: "Long-form endurance. Your rhythm will drift; the work is noticing.",
  },
};

export const PASSAGES: readonly Passage[] = [
  {
    id: "kata-still-water",
    discipline: "kata",
    title: "Still Water",
    text: "The mind must be like still water, so that it reflects the world exactly as it is. When the water is disturbed, the moon upon it breaks into pieces, and the student mistakes the pieces for the moon.",
  },
  {
    id: "kata-the-plain-cut",
    discipline: "kata",
    title: "The Plain Cut",
    text: "A student asked which strike was strongest. The master answered that the strongest strike is the one made without a second thought about the first. Doubt costs more than distance.",
  },
  {
    id: "kata-ten-thousand",
    discipline: "kata",
    title: "Ten Thousand Times",
    text: "I do not fear the one who has practiced ten thousand strikes once. I fear the one who has practiced one strike ten thousand times, until the strike no longer belongs to the hand.",
  },
  {
    id: "iai-first-light",
    discipline: "iai",
    title: "First Light",
    text: "Draw once. Do not draw again.",
  },
  {
    id: "iai-the-breath",
    discipline: "iai",
    title: "The Breath",
    text: "Slow is smooth, and smooth becomes fast.",
  },
  {
    id: "iai-no-second",
    discipline: "iai",
    title: "No Second Chance",
    text: "A cut once made cannot be unmade.",
  },
  {
    id: "scroll-the-long-road",
    discipline: "scroll",
    title: "The Long Road",
    text: "Mastery is not a summit but a road, and the road is made of ordinary days. The student who trains only when inspired will always be outpaced by the one who trains on the grey mornings, when nothing feels sharp and the hands are slow and the work is dull. Inspiration arrives as a guest. Discipline lives in the house. In time the two are difficult to tell apart, because the disciplined student has been visited so often that the guest has simply stopped leaving.",
  },
  {
    id: "scroll-the-quiet-forge",
    discipline: "scroll",
    title: "The Quiet Forge",
    text: "Steel is folded not to make it beautiful but to make it honest. Each fold drives out what does not belong, and what remains is thinner, harder, and far less forgiving of the smith who hurried. The blade remembers every shortcut taken in its making, and it will confess them all on the day it is finally asked to cut something that matters. So it is with the hands, and so it is with the hours you give them.",
  },
];

export function passagesFor(discipline: Discipline): Passage[] {
  return PASSAGES.filter((p) => p.discipline === discipline);
}
