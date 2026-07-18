import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true, quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";

import {
  parsePostDocument,
  toPlainText,
  toReadingMinutes,
  type DocBlock,
  type DocInline,
  type PostDocument,
} from "../src/features/blog/document";
import { slugify } from "../src/lib/slug";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Sample blog content, for seeing the thing.
 *
 * Deliberately NOT part of `prisma/seed.ts`. That file is the content the game
 * cannot run without — categories, permissions, roles, game modes — and it runs
 * against production. This is fixture writing: it exists so the blog can be
 * looked at before anyone has written for it, and it should never be somewhere
 * a deploy might run it by accident.
 *
 * Run it with `npm run db:seed:blog`. Every write is an upsert keyed on the
 * slug, so running it twice is a no-op — and editing a post here and re-running
 * updates that post rather than making a second one.
 *
 * Every body below is validated through `parsePostDocument` before it is
 * written. Fixtures that could not survive the real save path would be worse
 * than no fixtures: they would make the blog look like it works.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/* ------------------------------------------------------- document builders */

/** Small constructors, so the writing below reads as writing and not as JSON. */
const text = (value: string): DocInline => ({ type: "text", text: value });
const strong = (value: string): DocInline => ({
  type: "text",
  text: value,
  marks: [{ type: "bold" }],
});
const em = (value: string): DocInline => ({
  type: "text",
  text: value,
  marks: [{ type: "italic" }],
});
const link = (value: string, href: string): DocInline => ({
  type: "text",
  text: value,
  marks: [{ type: "link", attrs: { href } }],
});

const p = (...content: DocInline[]): DocBlock => ({ type: "paragraph", content });
const h2 = (value: string): DocBlock => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});
const h3 = (value: string): DocBlock => ({
  type: "heading",
  attrs: { level: 3 },
  content: [text(value)],
});
const quote = (...content: DocInline[]): DocBlock => ({
  type: "blockquote",
  content: [{ type: "paragraph", content }],
});
const bullets = (...items: string[]): DocBlock => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [text(item)] }],
  })),
});
const numbered = (...items: string[]): DocBlock => ({
  type: "orderedList",
  attrs: { start: 1 },
  content: items.map((item) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [text(item)] }],
  })),
});
const rule = (): DocBlock => ({ type: "horizontalRule" });

const doc = (...content: DocBlock[]): PostDocument => ({ type: "doc", content });

/* ------------------------------------------------------------------ posts */

type Sample = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  /** Days back from today. Published posts want a spread, not one timestamp. */
  daysAgo?: number;
  /** Days forward, for the scheduled one. */
  daysAhead?: number;
  isFeatured?: boolean;
  seoDescription?: string;
  body: PostDocument;
};

const SAMPLES: Sample[] = [
  {
    slug: "the-rate-you-are-afraid-to-name",
    title: "The Rate You Are Afraid To Name",
    excerpt:
      "Every freelancer has a number they believe they are worth and a smaller number they actually say out loud. The gap between them is not modesty. It is a tax you pay for flinching.",
    category: "freelancing",
    tags: ["Pricing", "Clients", "Nerve"],
    status: "PUBLISHED",
    daysAgo: 3,
    isFeatured: true,
    seoDescription:
      "Why freelancers quote below their worth, what the flinch actually costs, and how to name a rate without apologising for it.",
    body: doc(
      p(
        text(
          "There is a moment in every first call where the client asks what you charge. You know your number. You have known it for weeks. And what comes out of your mouth is smaller."
        )
      ),
      p(
        text("This is not humility. Humility is a virtue and this is a "),
        em("reflex"),
        text(
          " — the same one that makes you apologise when someone else steps on your foot. It costs you money every time it fires."
        )
      ),
      h2("What the flinch actually costs"),
      p(
        text(
          "Take the gap between the number you meant and the number you said. Call it twenty percent, which is generous — most people cut a third. Now apply it to every project this year."
        )
      ),
      p(
        text("That is not a discount. That is "),
        strong("a month and a half of unpaid work"),
        text(", handed to people who never asked for it and would not have noticed its absence.")
      ),
      quote(
        text(
          "A client who would walk away over twenty percent was going to be trouble at any price. You did not save the relationship. You bought a worse one."
        )
      ),
      h2("Why it happens"),
      p(
        text(
          "The flinch is not about money. It is about the silence after you say the number. Two seconds of nothing, while someone decides what you are worth, and you cannot read their face because there is no face — it is a call."
        )
      ),
      p(text("So you fill the silence. And the thing you fill it with is a discount.")),
      h3("The three tells"),
      bullets(
        "You say the number as a question. The pitch rises at the end, and now it is an offer to negotiate rather than a price.",
        "You explain it before you are asked. Nobody asked for the breakdown. Offering it says you expect to be argued with.",
        "You attach the discount to the quote. \"…but I could do it for less if the timeline is flexible.\" You have now negotiated against yourself, alone, in front of a stranger."
      ),
      h2("The practice"),
      p(
        text(
          "This is a drill, not an insight. Insight does not survive the silence; drills do. The whole thing is four steps and the fourth is the only hard one."
        )
      ),
      numbered(
        "Decide the number before the call. Write it down. It is not a feeling you have during a conversation, it is a decision you made in a quiet room.",
        "Say it as a statement. Full stop at the end. \"It is four thousand.\"",
        "Stop talking.",
        "Keep not talking."
      ),
      p(
        text(
          "The fourth step is where the money is. The silence is two seconds long and it feels like a minute. Let it. The next person to speak is negotiating, and it does not have to be you."
        )
      ),
      rule(),
      p(
        text("The keyboard part of this job is the part you can practise on purpose — that is what "),
        link("the dojo", "/dojo"),
        text(" is for. The rest of it is drills too. This is one of them.")
      )
    ),
  },
  {
    slug: "scope-creep-is-a-sentence-not-a-surprise",
    title: "Scope Creep Is A Sentence, Not A Surprise",
    excerpt:
      "Nobody wakes up and decides to double your workload. It arrives one reasonable sentence at a time, and each one is easy to say yes to. That is the mechanism.",
    category: "freelancing",
    tags: ["Clients", "Scope", "Contracts"],
    status: "PUBLISHED",
    daysAgo: 11,
    body: doc(
      p(
        text(
          "\"While you're in there, could you just…\" — that is the whole thing. That is scope creep. It is not a betrayal and it is not a plot. It is a sentence, and it is a reasonable one, and you will hear it eleven times."
        )
      ),
      h2("Why saying yes is rational every single time"),
      p(
        text(
          "Each request, on its own, is twenty minutes. Refusing costs a conversation. The conversation is more expensive than the twenty minutes. So you say yes, and you are right to."
        )
      ),
      p(
        text("You are right eleven times in a row and at the end of it you have worked an extra "),
        strong("four unpaid days"),
        text(". Every individual decision was correct. The sum was not. This is what makes it hard to see coming.")
      ),
      h2("The fix is not a better spine"),
      p(
        text(
          "Advice here usually amounts to \"learn to say no\", which is not advice, it is a description of the outcome. The fix is structural: make the eleventh request cost the same as the first."
        )
      ),
      h3("Name the unit"),
      p(
        text(
          "Not \"a website\". Not \"the redesign\". A number of specific things — pages, screens, revisions, calls. If the thing cannot be counted, it cannot be finished, and a project that cannot be finished is one you will be inside forever."
        )
      ),
      h3("Price the twelfth thing in advance"),
      p(
        text("Put a line in the quote that says what happens after the count runs out. Not as a threat — as "),
        em("furniture"),
        text(
          ". Then the extra request is not a favour being refused, it is a menu item with a price on it, and nobody has to feel anything about it."
        )
      ),
      quote(
        text(
          "The goal is not to stop the requests. The requests are the client caring about the work. The goal is for the eleventh one to be as easy to answer as the first."
        )
      ),
      h2("What to actually write"),
      bullets(
        "\"Includes up to three rounds of revisions per screen.\" Countable. Finishable.",
        "\"Further rounds are billed at the hourly rate.\" The menu item.",
        "\"Anything not listed above is out of scope and quoted separately.\" The catch-all that means you never have to argue about the definition of 'just'."
      ),
      p(
        text(
          "Three sentences. They do not make you difficult to work with. They make you legible, which is the thing clients actually want and cannot ask for."
        )
      )
    ),
  },
  {
    slug: "a-room-is-not-an-office-until-you-decide-it-is",
    title: "A Room Is Not An Office Until You Decide It Is",
    excerpt:
      "Working from home fails in a specific way: not from distraction, but from ambiguity. The room never decides what it is, so neither do you.",
    category: "work-from-home",
    tags: ["Focus", "Setup", "Routine"],
    status: "PUBLISHED",
    daysAgo: 18,
    body: doc(
      p(
        text(
          "The advice is always about distraction. Noise-cancelling headphones, website blockers, a door that closes. It treats working from home as a concentration problem."
        )
      ),
      p(text("It is not. It is an "), strong("ambiguity"), text(" problem.")),
      h2("The actual failure"),
      p(
        text(
          "An office is not a productive place because it is quiet. Offices are not quiet. An office works because the building has already decided what it is for, and you inherit that decision on the way in. You do not negotiate with the lobby."
        )
      ),
      p(
        text(
          "Your kitchen table has made no such decision. It is a table where you eat, and argue, and pay bills, and now also work. Every time you sit down, you have to decide what it is today. That decision is small and you make it forty times."
        )
      ),
      quote(
        text(
          "You are not tired at four o'clock because you worked hard. You are tired because you spent the day telling a room what it was."
        )
      ),
      h2("Deciding on purpose"),
      p(
        text(
          "The fix is to make the decision once, in advance, and then let the room hold it for you. This is cheaper than it sounds and it is not about furniture."
        )
      ),
      h3("One surface, one meaning"),
      p(
        text(
          "If you have a spare room, this is easy and you already knew that. If you do not — and most people do not — pick a surface and give it one job. Not a room. A surface. Half a table counts."
        )
      ),
      h3("A ritual that costs thirty seconds"),
      p(
        text(
          "Something that means the surface has changed state. Not a productivity system. A gesture — the same one, every time, until it stops being a gesture and starts being a threshold."
        )
      ),
      bullets(
        "The laptop comes out of a bag and goes back into it. The bag is the office door.",
        "One object appears on the desk when you start and leaves when you stop. A lamp. A cup. It does not matter what it is; it matters that it is only there for this.",
        "The chair turns to face a different direction. Genuinely enough. The point is the boundary, not the ergonomics."
      ),
      h2("The part nobody says"),
      p(
        text(
          "This works in the other direction too, and that is the half people skip. The ritual that opens the office has to close it, or you have not built an office — you have built a house you can never leave."
        )
      ),
      p(
        text("The grey mornings are the ones that count, and they count "),
        em("both ways"),
        text(".")
      )
    ),
  },
  {
    slug: "the-grey-morning-protocol",
    title: "The Grey Morning Protocol",
    excerpt:
      "Everyone can work on the good days. The good days are not the problem. This is about the ones where nothing is wrong and nothing will start.",
    category: "work-from-home",
    tags: ["Routine", "Discipline", "Focus"],
    status: "PUBLISHED",
    daysAgo: 26,
    body: doc(
      p(
        text(
          "Nothing is wrong. You slept. There is coffee. The work is not especially hard and the deadline is real but not frightening. And you have been sitting here for fifty minutes."
        )
      ),
      p(text("This is a grey morning. It is the ordinary condition of the job, and almost no advice is written for it.")),
      h2("Why motivation advice fails here"),
      p(
        text(
          "Most of it is written for a crisis — the burnout, the impossible deadline, the client from hell. Those are rare and, oddly, easy: adrenaline does the work for you."
        )
      ),
      p(
        text("A grey morning has no adrenaline to offer. It is not a crisis. It is "),
        em("weather"),
        text(", and you cannot argue with weather. You can only have a protocol.")
      ),
      h2("The protocol"),
      numbered(
        "Do not decide what to work on. Deciding is the thing that is broken this morning; asking it to fix itself will cost another fifty minutes.",
        "Open the thing you had open yesterday. Not the most important thing. The most recent thing.",
        "Work for five minutes badly. Not as a trick to fool yourself into working for an hour — that trick stops working once you know it. Five minutes, genuinely, and you may stop.",
        "Stop, if you want to. Most days you will not want to."
      ),
      quote(
        text(
          "Step three is not a productivity hack. It is a floor. On a grey morning you are not trying to have a good day, you are trying to not have a zero — and a zero is the only thing that actually compounds."
        )
      ),
      h2("On the days it does not work"),
      p(
        text(
          "Sometimes you do the five minutes and stop, and that is the whole day's work. This is fine, and treating it as a failure is how a grey morning becomes a grey week."
        )
      ),
      p(
        text(
          "The streak that matters is not \"days I worked well\". It is \"days I showed up at all\". One is a fantasy about consistency. The other is consistency."
        )
      )
    ),
  },
  {
    slug: "make-money-online-what-each-route-actually-costs",
    title: "Making Money Online: What Each Route Actually Costs",
    excerpt:
      "Every list of ways to earn online tells you what you might make. None of them tell you what you spend to get there. Here is the second column.",
    category: "make-money-online",
    tags: ["Income", "Freelancing", "Honesty"],
    status: "PUBLISHED",
    daysAgo: 34,
    seoDescription:
      "An honest accounting of the common ways to earn online — what each one pays, and the cost in time, risk and reputation that the listicles leave out.",
    body: doc(
      p(
        text(
          "Search for this and you will find the same list twelve times. Freelance. Sell a course. Affiliate links. Dropship. Each with a number beside it, and the number is always someone's best month."
        )
      ),
      p(text("The number is not the interesting column. This is the other one.")),
      h2("Freelancing a skill you already have"),
      p(
        strong("Pays: "),
        text("immediately, and roughly what you are worth once you stop flinching at the quote. ")
      ),
      p(
        strong("Costs: "),
        text(
          "it is a job. That is the whole cost and it is the one people skip past. You have traded one boss for six, and none of them are obliged to keep you. The upside is that the feedback is honest and it arrives in a week rather than a year."
        )
      ),
      h2("Selling what you know"),
      p(strong("Pays: "), text("badly at first, then possibly very well, then usually badly again.")),
      p(
        strong("Costs: "),
        text("about a year before the first honest pound, and — the part nobody prices — you have to become "),
        em("a person who markets"),
        text(
          ". If that sentence made you tired, this route will cost more than it pays, and no amount of the work being good will rescue it."
        )
      ),
      h2("Affiliate and ad revenue"),
      p(strong("Pays: "), text("nothing, nothing, nothing, then something, for as long as an algorithm agrees.")),
      p(
        strong("Costs: "),
        text(
          "your judgement, slowly. Every recommendation is worth more if it converts, and you will not notice the day that starts deciding what you recommend. The people who do this well keep the two decisions in separate rooms, on purpose, forever."
        )
      ),
      h2("The ones to skip"),
      bullets(
        "Anything where the money comes from recruiting the next person. The name changes every four years. The shape does not.",
        "Anything sold to you as passive. Passive means the work happened before the money, not that it did not happen.",
        "Anything that needs you to move first and asks you to trust the platform. If your income can be switched off by an email, it is not income, it is an allowance."
      ),
      rule(),
      h2("The honest summary"),
      p(
        text(
          "Every route on the list is a job. Some of them pay later and some pay sooner; none of them pay for nothing. The question is never \"what pays the most\" — it is \"which of these costs am I actually willing to keep paying on a grey morning\"."
        )
      ),
      p(
        text("Answer that one honestly and the list gets very short, which is the point.")
      )
    ),
  },
  {
    slug: "the-client-who-will-not-pay",
    title: "The Client Who Will Not Pay",
    excerpt:
      "It is almost never malice, and that is what makes it hard. Here is the ladder, one rung at a time, and where most people fall off it.",
    category: "freelancing",
    tags: ["Clients", "Invoicing", "Nerve"],
    // A draft, on purpose: the admin list needs one, and it proves a slug guess
    // against /blog cannot reach unpublished writing.
    status: "DRAFT",
    body: doc(
      p(
        text(
          "The invoice went out five weeks ago. You have sent two polite notes. They replied to the first one. This is the part of freelancing nobody puts in the brochure."
        )
      ),
      h2("It is almost never malice"),
      p(
        text(
          "This is the thing that makes it hard, and the thing that makes most advice useless. Advice assumes a villain. Usually there is an overwhelmed person, a finance system nobody understands, and an email sitting in a folder."
        )
      ),
      p(text("Which means the tone that works is not the tone that feels good.")),
      h2("The ladder"),
      numbered(
        "The nudge. No apology, no essay. One line and the invoice attached again.",
        "The named person. Not \"the team\" — a human with a name, asked a question they can answer.",
        "The stop. Work pauses. Said as a fact, not a threat, and without a single adjective.",
        "The date. A specific day after which this becomes a different kind of conversation."
      ),
      p(text("Most people fall off between three and four, and the fall is always the same: they say rung four in the voice of rung one.")),
      rule(),
      p(em("Still being written. The last section needs a rewrite — it is currently just angry."))
    ),
  },
  {
    slug: "what-typing-speed-is-actually-worth",
    title: "What Typing Speed Is Actually Worth",
    excerpt:
      "An honest accounting from a company that sells typing practice, of how much typing speed is really worth to your income. The answer is smaller than we would like.",
    category: "make-money-online",
    tags: ["Income", "Craft", "Honesty"],
    // Scheduled: the publisher job will flip it. It also proves the admin list's
    // scheduled state renders, and that /blog does not show it early.
    status: "SCHEDULED",
    daysAhead: 4,
    body: doc(
      p(
        text(
          "We sell typing practice. So take this with the appropriate amount of salt, and notice that the number below is not the one that would sell the most subscriptions."
        )
      ),
      h2("The honest number"),
      p(
        text("If you write for a living, going from 40 to 80 words a minute will not double your output. It will save you perhaps "),
        strong("twenty minutes a day"),
        text(", because writing is not typing — it is deciding, and then typing is the easy part at the end.")
      ),
      quote(
        text(
          "Anyone who tells you typing speed doubles your income is selling typing lessons. So are we. The difference is the number."
        )
      ),
      h2("What it is actually worth"),
      p(
        text(
          "The twenty minutes is real, and over a year it is two working weeks. That is not nothing. But it is not the reason to do it."
        )
      ),
      p(
        text("The reason is that at 40 words a minute the keyboard is "),
        em("in the way"),
        text(
          " of the thought. At 80 it is not. The thing you gain is not speed, it is the sentence arriving without an obstacle between you and it — and that does not show up on any invoice."
        )
      ),
      h2("So who should bother"),
      bullets(
        "If you type all day and it hurts, fix the technique. That is worth more than the speed.",
        "If you type all day and lose the thread mid-sentence, the keyboard may be the thing taking it.",
        "If you type an hour a week, this is a hobby. A good one. But do not tell yourself it is an investment."
      ),
      p(text("The dojo is "), link("open either way", "/dojo"), text("."))
    ),
  },
];

/* ------------------------------------------------------------------- seed */

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  /**
   * The author.
   *
   * Whoever is already in the database. `BlogPost.authorId` is nullable — the
   * archive survives a deleted staff account — so a project with no profiles
   * still seeds, and the posts simply have no byline.
   */
  const author = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, displayName: true },
  });

  const categories = await prisma.blogCategory.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  if (categoryBySlug.size === 0) {
    console.error(
      "No blog categories found. Run the main seed first: npx prisma db seed"
    );
    process.exit(1);
  }

  let written = 0;

  for (const sample of SAMPLES) {
    /**
     * The fixture goes through the same gate as a real save.
     *
     * If a body here cannot survive `parsePostDocument`, the sample content is
     * lying about what the editor can produce — so this fails loudly rather than
     * writing a post the app would refuse.
     */
    const parsed = parsePostDocument(sample.body);
    if (!parsed.ok) {
      console.error(`  ✗ ${sample.slug}: ${parsed.message}`);
      process.exit(1);
    }

    const plainText = toPlainText(parsed.document);
    const categoryId = categoryBySlug.get(sample.category) ?? null;

    if (!categoryId) {
      console.warn(`  ! ${sample.slug}: no category "${sample.category}", filing it uncategorised`);
    }

    const publishedAt =
      sample.status === "PUBLISHED" ? daysFromNow(-(sample.daysAgo ?? 1)) : null;
    const scheduledFor =
      sample.status === "SCHEDULED" ? daysFromNow(sample.daysAhead ?? 7) : null;

    const tagIds: string[] = [];
    for (const name of sample.tags) {
      const tag = await prisma.blogTag.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { slug: slugify(name), name },
        select: { id: true },
      });
      tagIds.push(tag.id);
    }

    const columns = {
      title: sample.title,
      excerpt: sample.excerpt,
      content: parsed.document as never,
      plainText,
      readingMinutes: toReadingMinutes(plainText),
      status: sample.status,
      publishedAt,
      scheduledFor,
      isFeatured: sample.isFeatured ?? false,
      seoDescription: sample.seoDescription ?? null,
      categoryId,
      authorId: author?.id ?? null,
    };

    await prisma.blogPost.upsert({
      where: { slug: sample.slug },
      update: {
        ...columns,
        // Replace rather than merge, exactly as updatePost does — otherwise a
        // re-run accumulates tags that were removed from the sample.
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      },
      create: {
        ...columns,
        slug: sample.slug,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: { id: true },
    });

    written++;
    const state =
      sample.status === "PUBLISHED"
        ? `published ${sample.daysAgo}d ago`
        : sample.status === "SCHEDULED"
          ? `scheduled +${sample.daysAhead}d`
          : "draft";
    console.log(`  ✓ ${sample.title} — ${state}`);
  }

  const live = SAMPLES.filter((sample) => sample.status === "PUBLISHED").length;
  console.log(
    `\n${written} sample posts written (${live} live at /blog).` +
      (author ? ` Author: ${author.displayName}.` : " No profile found — posts have no byline.")
  );
  console.log("None of them carry images: uploading needs SUPABASE_SECRET_KEY and the media bucket.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
