import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true, quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

/**
 * Turn the ad slots on with HOUSE placeholders, so the client can SEE where
 * advertising lands without a live AdSense account.
 *
 *   npx tsx scripts/demo-ads.ts
 *   npx tsx scripts/demo-ads.ts --off
 *
 * Why this is a script and not a seed: the seed deliberately leaves every
 * placement `isActive: false` and never flips it on re-seed, because whether ads
 * run is an operator's decision, not a fixture. This is that decision, made
 * explicitly and reversibly — `--off` puts it exactly back.
 *
 * It only touches the SIX placements the pages actually render. Enabling the
 * others (top-banner, sidebar, footer…) would light up nothing, because no page
 * asks for them yet — an "on" slot that renders nowhere is a lie in the admin
 * panel. A HOUSE advert draws the labelled placeholder box (see ad-slot.tsx):
 * honest about being a demo, and safe on a live site in a way a fake ad is not.
 *
 * Once a real AdSense unit is booked in a placement from the panel, it wins —
 * the query takes the most recently updated active advert — so this never stands
 * in the way of the real thing.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** The placements a page renders today, and the format each should demo as. */
const RENDERED: { slug: string; format: "RESPONSIVE" | "IN_ARTICLE" }[] = [
  { slug: "between-sections", format: "RESPONSIVE" },
  { slug: "game-result", format: "RESPONSIVE" },
  { slug: "blog-index", format: "RESPONSIVE" },
  { slug: "in-content", format: "IN_ARTICLE" },
  { slug: "after-paragraph-3", format: "IN_ARTICLE" },
  { slug: "after-paragraph-7", format: "IN_ARTICLE" },
];

/** The name every demo advert carries, so the reverse pass can find its own. */
const DEMO_AD_NAME = "House placeholder (demo)";

async function enable() {
  for (const { slug, format } of RENDERED) {
    const placement = await prisma.advertisementPlacement.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!placement) {
      console.warn(`  skip ${slug}: no such placement (run \`npx prisma db seed\` first)`);
      continue;
    }

    await prisma.advertisementPlacement.update({
      where: { id: placement.id },
      data: { isActive: true },
    });

    // Idempotent: one demo advert per placement, updated rather than duplicated
    // on a second run. Keyed by name so re-running does not stack boxes.
    const existing = await prisma.advertisement.findFirst({
      where: { placementId: placement.id, name: DEMO_AD_NAME },
      select: { id: true },
    });
    if (existing) {
      await prisma.advertisement.update({
        where: { id: existing.id },
        data: { isActive: true, provider: "HOUSE", format, frequency: 100 },
      });
    } else {
      await prisma.advertisement.create({
        data: {
          name: DEMO_AD_NAME,
          provider: "HOUSE",
          format,
          isActive: true,
          frequency: 100,
          placementId: placement.id,
        },
      });
    }
    console.log(`  on  ${slug} (${format})`);
  }
  console.log(
    "\nDemo placeholders are live on: home, dojo, blog index, and articles.\n" +
      "Turn them off with:  npx tsx scripts/demo-ads.ts --off"
  );
}

async function disable() {
  // Remove only the demo adverts this script created; leave any real booking be.
  const removed = await prisma.advertisement.deleteMany({ where: { name: DEMO_AD_NAME } });

  // Return the placements to their seeded state, but only if nothing real is now
  // booked in them — an operator may have added a genuine advert since.
  for (const { slug } of RENDERED) {
    const placement = await prisma.advertisementPlacement.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { advertisements: true } } },
    });
    if (!placement) continue;
    if (placement._count.advertisements === 0) {
      await prisma.advertisementPlacement.update({
        where: { id: placement.id },
        data: { isActive: false },
      });
    } else {
      console.log(`  kept ${slug} active: a real advert is booked in it`);
    }
  }
  console.log(`\nRemoved ${removed.count} demo placeholder(s). Placements reset.`);
}

async function main() {
  const off = process.argv.includes("--off");
  console.log(off ? "Disabling demo ad placeholders…" : "Enabling demo ad placeholders…");
  if (off) await disable();
  else await enable();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
