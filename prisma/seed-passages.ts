import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true, quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";

import { PASSAGES } from "../src/features/typing/passages";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Move the built-in KATA passages into the database, once.
 *
 * The prose used to live only in code; the Passages admin edits this table now.
 * This lifts the original set in so the game starts with content and nothing is
 * lost. It seeds only when the table is empty, so it is safe to run twice and it
 * never fights an admin who has since edited or removed a passage.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const existing = await prisma.passage.count();
  if (existing > 0) {
    console.log(`Passages already present (${existing}); leaving them alone.`);
    return;
  }

  const { count } = await prisma.passage.createMany({
    data: PASSAGES.map((p, i) => ({
      title: p.title,
      text: p.text,
      // The built-in set carried no difficulty; MEDIUM is the honest default an
      // admin can retune per passage.
      difficulty: "MEDIUM" as const,
      sort: i,
    })),
  });

  console.log(`${count} passages seeded from the built-in set. Edit them at /admin/passages.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
