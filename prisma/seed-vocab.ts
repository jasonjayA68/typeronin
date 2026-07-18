import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true, quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

/**
 * Sample vocabulary for SCROLL — words with meanings.
 *
 * A SCROLL question is a word that has a definition, and its distractors are the
 * other words in the same category, so a single themed category of a dozen-plus
 * terms gives every question tempting near-neighbour wrong answers. All MEDIUM,
 * matching the round the trainer plays.
 *
 * Idempotent, like the other seeds — keyed on the natural [text, category, lang]
 * unique, so running it twice changes nothing. Run with `npm run db:seed:vocab`.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CATEGORY = { slug: "lexicon", name: "The Warrior's Lexicon", sort: 50 };

const WORDS: { text: string; definition: string }[] = [
  { text: "bushido", definition: "The samurai code of honor, loyalty and conduct." },
  { text: "katana", definition: "A curved, single-edged sword worn edge-up." },
  { text: "wakizashi", definition: "The shorter companion sword to the katana." },
  { text: "tanto", definition: "A short Japanese dagger or knife." },
  { text: "naginata", definition: "A polearm tipped with a long curved blade." },
  { text: "yumi", definition: "The traditional asymmetric Japanese longbow." },
  { text: "dojo", definition: "A hall in which martial arts are trained." },
  { text: "sensei", definition: "A teacher or master who guides students." },
  { text: "ronin", definition: "A samurai with no lord to serve." },
  { text: "daimyo", definition: "A great feudal lord of old Japan." },
  { text: "shogun", definition: "The supreme military ruler of feudal Japan." },
  { text: "kata", definition: "A rehearsed solo pattern of precise movements." },
  { text: "zanshin", definition: "Relaxed, complete awareness after an action." },
  { text: "kenjutsu", definition: "The classical art of the sword." },
  { text: "seppuku", definition: "Ritual suicide to preserve one's honor." },
  { text: "kensho", definition: "A brief, sudden glimpse of one's true nature." },
];

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: CATEGORY.slug },
    update: { name: CATEGORY.name, sort: CATEGORY.sort, isActive: true },
    create: { slug: CATEGORY.slug, name: CATEGORY.name, sort: CATEGORY.sort },
    select: { id: true },
  });

  let written = 0;
  for (const word of WORDS) {
    await prisma.word.upsert({
      where: {
        text_categoryId_lang: { text: word.text, categoryId: category.id, lang: "en" },
      },
      update: { definition: word.definition, difficulty: "MEDIUM", isActive: true },
      create: {
        text: word.text,
        categoryId: category.id,
        lang: "en",
        difficulty: "MEDIUM",
        definition: word.definition,
      },
      select: { id: true },
    });
    written++;
  }

  console.log(`${written} vocabulary words seeded into "${CATEGORY.name}" — SCROLL is playable.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
