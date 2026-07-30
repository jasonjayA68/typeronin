/**
 * Passages are prose, not word salad. Random word lists are what every typing
 * site drills; sentences with rhythm are what a player can actually breathe to,
 * and rhythm is the thing TypeRonin measures.
 *
 * They are also read by someone who may be learning English, may be nine years
 * old, and may be running the page through a translator. So they use everyday
 * words and everyday images — practising an instrument, walking a road — and no
 * swords, no masters, no cultural knowledge required to follow the sentence.
 *
 * This set is the fallback and the first seed. Once `prisma/seed-passages.ts`
 * has run, the Passages admin owns the live copy and edits the database rows;
 * changing the prose here does NOT change what players already see.
 *
 * `Discipline` is an internal key for passage length, not a label: "kata" is a
 * medium passage, "iai" a single line, "scroll" a long one. Nothing renders
 * these words.
 */

export type Discipline = "kata" | "iai" | "scroll";

export type Passage = {
  id: string;
  discipline: Discipline;
  /** Shown while the passage is queued. */
  title: string;
  text: string;
};

export const PASSAGES: readonly Passage[] = [
  {
    id: "kata-still-water",
    discipline: "kata",
    title: "Still Water",
    text: "A calm mind is like still water. It shows the world exactly as it is. When the water is shaken, the picture breaks apart, and it is easy to mistake the pieces for the whole.",
  },
  {
    id: "kata-one-clear-choice",
    discipline: "kata",
    title: "One Clear Choice",
    text: "A student asked which answer was the best one. The teacher said the best answer is the one you give without doubting the answer before it. Doubt costs more time than the work does.",
  },
  {
    id: "kata-ten-thousand",
    discipline: "kata",
    title: "Ten Thousand Times",
    text: "I am not afraid of someone who has practised ten thousand things once. I am afraid of someone who has practised one thing ten thousand times, until the hands no longer need to think about it.",
  },
  {
    id: "iai-type-it-once",
    discipline: "iai",
    title: "Type It Once",
    text: "Type it once. Do not go back.",
  },
  {
    id: "iai-the-breath",
    discipline: "iai",
    title: "Smooth and Fast",
    text: "Slow is smooth, and smooth becomes fast.",
  },
  {
    id: "iai-no-second",
    discipline: "iai",
    title: "No Second Chance",
    text: "Once you press a key, it is final.",
  },
  {
    id: "scroll-the-long-road",
    discipline: "scroll",
    title: "The Long Road",
    text: "Getting better is not a mountain top. It is a road, and the road is made of ordinary days. The person who practises only when they feel excited will always fall behind the person who practises on grey mornings, when nothing feels easy and the hands are slow and the work is dull. Excitement comes and goes like a visitor. Practice lives in the house. Given enough time the two are hard to tell apart, because the visitor has simply stopped leaving.",
  },
  {
    id: "scroll-every-hour-shows",
    discipline: "scroll",
    title: "Every Hour Shows",
    text: "A song is not learned by playing it through once. Each time you play it, one more small mistake is driven out, and what is left is cleaner, faster, and far less kind to a player in a hurry. The music remembers every shortcut taken while it was being learned, and it will show them all on the day someone is finally listening. The same is true of your hands, and of the hours you give them.",
  },
];

export function passagesFor(discipline: Discipline): Passage[] {
  return PASSAGES.filter((p) => p.discipline === discipline);
}
