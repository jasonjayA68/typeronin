import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true, quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { Difficulty } from "../generated/prisma/enums";

/**
 * Seed: the content the game cannot run without.
 *
 * Every write is an upsert keyed on a natural unique — running this twice must
 * be a no-op, because it will be run twice.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CATEGORIES = [
  {
    slug: "bushido",
    name: "Bushido",
    description: "The vocabulary of the warrior's code.",
    sort: 0,
    words: {
      EASY: ["honor", "duty", "calm", "still", "focus", "path", "steel", "vow", "rank", "oath"],
      MEDIUM: ["discipline", "precision", "patience", "restraint", "loyalty", "courage", "mastery", "resolve", "conduct", "virtue"],
      HARD: ["rectitude", "benevolence", "perseverance", "equanimity", "self-command", "righteousness", "forbearance", "magnanimity", "circumspection", "steadfastness"],
    },
  },
  {
    slug: "nature",
    name: "Nature",
    description: "Blossom, season, mountain, rain.",
    sort: 1,
    words: {
      EASY: ["rain", "leaf", "moon", "pond", "wind", "stone", "moss", "dusk", "snow", "river"],
      MEDIUM: ["blossom", "lantern", "bamboo", "current", "thunder", "meadow", "harvest", "willow", "hollow", "twilight"],
      HARD: ["chrysanthemum", "reflection", "impermanence", "constellation", "wilderness", "undergrowth", "transience", "cascading", "windswept", "luminescence"],
    },
  },
  {
    slug: "common",
    name: "Common",
    description: "Everyday English, for everyday hands.",
    sort: 2,
    words: {
      EASY: ["about", "there", "which", "would", "could", "their", "other", "after", "first", "never"],
      MEDIUM: ["question", "language", "movement", "practice", "distance", "medicine", "argument", "attention", "carefully", "difficult"],
      HARD: ["extraordinary", "acknowledgement", "responsibility", "circumstances", "characteristic", "recommendation", "simultaneously", "unquestionably", "straightforward", "internationally"],
    },
  },
  {
    slug: "code",
    name: "Code",
    description: "Symbols and terms from the working programmer's day.",
    sort: 3,
    words: {
      EASY: ["const", "async", "value", "array", "class", "types", "throw", "await", "yield", "props"],
      MEDIUM: ["function", "iterator", "boolean", "database", "callback", "resolver", "argument", "instance", "compiler", "abstract"],
      HARD: ["asynchronous", "polymorphism", "encapsulation", "memoization", "orchestration", "deserialize", "idempotency", "concurrency", "immutability", "instantiation"],
    },
  },
] as const;

/**
 * The seven achievements shown on the Train page.
 *
 * Each `description` states the exact condition the player must meet, and those
 * conditions live in TRIAL_REQUIREMENTS (src/features/gamification/trials.ts) —
 * the two must agree. They previously did not: these were the seven Bushido
 * virtues, and "Take a scroll two ranks above your standing" described nothing
 * the code actually checked (it checks one game on the hard setting). A player
 * could not tell what to do, and would not know when they had done it.
 *
 * The `slug` stays as the virtue name: it is the key TRIAL_REQUIREMENTS and
 * ProfileAchievement rows are stored against, and renaming it would orphan every
 * achievement already earned.
 */
const ACHIEVEMENTS = [
  { slug: "rectitude", name: "Perfect Game", description: "Finish one Typing Phrases game with no wrong keys.", honorReward: 800, xpReward: 200, sort: 0 },
  { slug: "courage", name: "Try Something Hard", description: "Finish one game on the hard setting.", honorReward: 1200, xpReward: 300, sort: 1 },
  { slug: "benevolence", name: "Come Back Again", description: "Play on two different days.", honorReward: 600, xpReward: 150, sort: 2 },
  { slug: "respect", name: "Perfect Round", description: "Answer every question correctly in one Find the Word round.", honorReward: 900, xpReward: 220, sort: 3 },
  { slug: "honesty", name: "First Three Games", description: "Play three games. Every game counts, good or bad.", honorReward: 500, xpReward: 120, sort: 4 },
  { slug: "honour", name: "Three Perfect Games", description: "Finish three Typing Phrases games with no wrong keys.", honorReward: 1500, xpReward: 400, sort: 5 },
  { slug: "loyalty", name: "Seven Days", description: "Play on seven different days.", honorReward: 2000, xpReward: 500, sort: 6 },
] as const;

/** Reward and gameplay knobs the admin panel will later edit in place. */
const SETTINGS = [
  { key: "rewards.daily", value: { honor: 100, xp: 25, ki: 10 }, description: "Granted once per day on first session." },
  { key: "rewards.referral", value: { referrer: 500, referee: 250, qualifyAfterSessions: 3 }, description: "Referral payout and the bar a referee must clear." },
  { key: "game.timedPresets", value: { seconds: [120, 300], allowCustom: true, customMin: 15, customMax: 600 }, description: "Clocks offered in Timed mode." },
  { key: "ads.enabled", value: false, description: "Master switch for advertising placements." },
] as const;

/**
 * Permissions, named `resource:action`. The list is the vocabulary of the admin
 * panel — a module that grants no permission cannot be built.
 */
const PERMISSIONS = [
  ["users:read", "users", "View students and their sessions"],
  ["users:write", "users", "Edit students, grant and revoke roles"],
  ["words:read", "words", "View the word corpus"],
  ["words:write", "words", "Create, edit, import and export words"],
  ["modes:write", "game", "Create and configure game modes"],
  ["settings:write", "game", "Change scoring, rewards and ranking rules"],
  ["blog:read", "blog", "View posts, including drafts"],
  ["blog:write", "blog", "Create and edit posts"],
  ["blog:publish", "blog", "Publish, schedule and feature posts"],
  ["media:write", "blog", "Upload and manage media"],
  ["comments:moderate", "blog", "Approve, reject and mark comments as spam"],
  ["ads:write", "revenue", "Configure placements and ad units"],
  ["payouts:read", "revenue", "View withdrawal requests"],
  ["payouts:write", "revenue", "Approve, reject and mark withdrawals paid"],
  ["reports:read", "moderation", "View abuse reports"],
  ["reports:resolve", "moderation", "Resolve abuse reports"],
  ["analytics:read", "insight", "View dashboards and reports"],
  ["audit:read", "insight", "Read the audit log"],
] as const;

const ROLES = [
  {
    slug: "admin",
    // The name is a display label and nothing is gated on it — the `slug` is what
    // the permission checks read. So it says what the role does, in the plainest
    // word available. These were Magistrate / Scribe / Warden, which asked a new
    // admin to learn a metaphor before they could tell who was allowed to do what.
    name: "Admin",
    description: "Can do everything.",
    // Every permission. Spelled as a wildcard here and expanded below, so a new
    // permission is never accidentally withheld from the role that must have it.
    permissions: "*" as const,
  },
  {
    slug: "editor",
    name: "Editor",
    description: "Writes and publishes blog posts. Cannot change the game or money.",
    permissions: [
      "blog:read",
      "blog:write",
      "blog:publish",
      "media:write",
      "comments:moderate",
      "analytics:read",
    ],
  },
  {
    slug: "moderator",
    name: "Moderator",
    description: "Handles players and reports. Cannot see money.",
    permissions: ["users:read", "comments:moderate", "reports:read", "reports:resolve"],
  },
] as const;

const GAME_MODES = [
  {
    slug: "practice",
    name: "Practice",
    kanji: "型",
    kind: "PRACTICE" as const,
    description: "Untimed form work. The passage ends when it ends.",
    timeOptions: [],
    allowCustomTime: false,
    sort: 0,
  },
  {
    slug: "timed",
    name: "Timed",
    kanji: "刻",
    kind: "TIMED" as const,
    description: "Race a clock. Two minutes, five, or a span of your own naming.",
    timeOptions: [120, 300],
    allowCustomTime: true,
    customMinSeconds: 15,
    customMaxSeconds: 600,
    sort: 1,
  },
] as const;

/**
 * Ad slots. Components render these by slug, so no page ever names a provider.
 * Every one starts inactive — advertising is opt-in, and a fresh install should
 * not surprise anyone with an ad.
 */
const AD_PLACEMENTS = [
  // slug, name, desktop, mobile
  ["top-banner", "Top banner", true, true],
  ["in-content", "Within content", true, true],
  ["after-paragraph-3", "After the third paragraph", true, true],
  ["after-paragraph-7", "After the seventh paragraph", true, true],
  ["sidebar", "Sidebar", true, false],
  ["desktop-sidebar", "Desktop sidebar", true, false],
  ["bottom-banner", "Bottom banner", true, true],
  ["footer", "Footer", true, true],
  ["mobile-sticky", "Mobile sticky", false, true],
  ["between-sections", "Between page sections", true, true],
  ["game-result", "Game result screen", true, true],
  ["dashboard-widget", "Dashboard widget", true, false],
  ["leaderboard-inline", "Leaderboard, inline", true, true],
  ["blog-index", "Blog index", true, true],
] as const;

/** The client's content pillars. */
const BLOG_CATEGORIES = [
  {
    slug: "freelancing",
    name: "Freelancing",
    description: "Winning work, pricing it, and keeping the client.",
    intro:
      "Freelancing rewards the same thing the dojo does: consistent, unglamorous practice. These are notes on finding work, naming a price, and delivering without drama.",
    sort: 0,
  },
  {
    slug: "work-from-home",
    name: "Work From Home",
    description: "Setting up a desk, a routine, and a boundary.",
    intro:
      "A room is not an office until you decide it is. Notes on building a working day at home that you can repeat on the grey mornings.",
    sort: 1,
  },
  {
    slug: "make-money-online",
    name: "Make Money Online",
    description: "Honest routes to income on a keyboard, and the ones to avoid.",
    intro:
      "There is no shortcut worth taking. These are the routes that pay, what they actually require, and the traps that cost more than they return.",
    sort: 2,
  },
] as const;

async function seedAccessControl(prisma: PrismaClient) {
  for (const [slug, resource, description] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug },
      update: { resource, description },
      create: { slug, resource, description },
    });
  }

  for (const role of ROLES) {
    const row = await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { slug: role.slug, name: role.name, description: role.description, isSystem: true },
    });

    const slugs =
      role.permissions === "*" ? PERMISSIONS.map(([slug]) => slug) : [...role.permissions];
    const permissions = await prisma.permission.findMany({
      where: { slug: { in: slugs as string[] } },
      select: { id: true },
    });

    // Replace rather than merge: the seed is the definition of a system role, so
    // a permission removed here must actually be removed.
    await prisma.rolePermission.deleteMany({ where: { roleId: row.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: row.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, sort: category.sort },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        sort: category.sort,
      },
    });

    for (const [difficulty, words] of Object.entries(category.words)) {
      for (const text of words) {
        await prisma.word.upsert({
          // The natural key from the schema — running twice cannot duplicate.
          where: {
            text_categoryId_lang: { text, categoryId: row.id, lang: "en" },
          },
          update: { difficulty: difficulty as Difficulty },
          create: {
            text,
            categoryId: row.id,
            lang: "en",
            difficulty: difficulty as Difficulty,
          },
        });
      }
    }
  }

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: { ...achievement },
      create: { ...achievement },
    });
  }

  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: { key: setting.key, value: setting.value, description: setting.description },
    });
  }

  await seedAccessControl(prisma);

  for (const mode of GAME_MODES) {
    const { slug, ...rest } = mode;
    await prisma.gameMode.upsert({
      where: { slug },
      update: { ...rest, timeOptions: [...rest.timeOptions] },
      create: { slug, ...rest, timeOptions: [...rest.timeOptions] },
    });
  }

  for (const [slug, name, showOnDesktop, showOnMobile] of AD_PLACEMENTS) {
    await prisma.advertisementPlacement.upsert({
      where: { slug },
      // Never flip isActive on re-seed: an operator's choice outranks the seed.
      update: { name, showOnDesktop, showOnMobile },
      create: { slug, name, showOnDesktop, showOnMobile, isActive: false },
    });
  }

  // Retire slots the seed no longer defines. Safe because a slot is only ever
  // addressed by slug: an orphan renders nowhere, but would linger in the admin
  // list forever. Skips any that an operator has switched on.
  const retired = await prisma.advertisementPlacement.deleteMany({
    where: { slug: { notIn: AD_PLACEMENTS.map(([slug]) => slug) }, isActive: false },
  });
  if (retired.count) console.log(`retired ${retired.count} unused ad placements`);

  for (const category of BLOG_CATEGORIES) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: { ...category },
      create: { ...category },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    words: await prisma.word.count(),
    achievements: await prisma.achievement.count(),
    settings: await prisma.setting.count(),
    permissions: await prisma.permission.count(),
    roles: await prisma.role.count(),
    gameModes: await prisma.gameMode.count(),
    adPlacements: await prisma.advertisementPlacement.count(),
    blogCategories: await prisma.blogCategory.count(),
  };

  console.log(
    "seeded: " +
      Object.entries(counts)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
