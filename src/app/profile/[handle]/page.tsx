import { CalendarIcon, FlameIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { nextRank, rankForHonor } from "@/features/gamification/ranks";
import { Empty, Panel, Stat, when } from "@/features/profile/dashboard-panels";
import { getPublicProfile } from "@/features/profile/queries";
import { Container } from "@/shared/components/layout/container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SiteFooter } from "@/shared/components/layout/site-footer";
import { SiteHeader } from "@/shared/components/layout/site-header";

// generateMetadata and the page both need the profile; one request, one read.
const load = cache(getPublicProfile);

const JOINED = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

/** Initials for the avatar fallback, from the chosen name. */
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "TR"
  );
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const shape =
    "size-16 shrink-0 rounded-full border border-sakura/30 sm:size-20";

  // Decorative: the name is rendered beside it, in the h1.
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- avatar hosts are user-supplied; next/image would need every one allow-listed.
    <img src={url} alt="" className={`${shape} object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`${shape} grid place-items-center bg-sakura/10 font-heading text-lg text-sakura sm:text-xl`}
    >
      {initials(name)}
    </span>
  );
}

/**
 * BattleRow's shape, minus the honor column: public history carries no
 * honorEarned, and a hardcoded "+0" on every row would read as a score.
 */
function HistoryRow({
  session,
}: {
  session: {
    mode: string;
    wpm: number;
    accuracy: number;
    playedAt: Date;
    category: { name: string } | null;
  };
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {session.category?.name ?? "Free practice"}
          <span className="ml-2 text-xs text-muted-foreground capitalize">
            {session.mode.toLowerCase()}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">{when(session.playedAt)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-right">
        <span className="tabular text-sm text-foreground">{session.wpm} wpm</span>
        <span className="tabular text-sm text-muted-foreground">{session.accuracy}%</span>
      </div>
    </li>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const data = await load(handle);
  if (!data) return { title: "Profile not found" };

  const { profile, stats } = data;
  const rank = rankForHonor(profile.honor);
  const best = stats.best?.wpm ?? 0;

  return {
    title: profile.displayName,
    description: `${profile.displayName} holds the rank of ${rank.name}, with a best of ${best} WPM.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const data = await load(handle);
  if (!data) notFound();

  const { profile, stats, badges, history } = data;
  const held = rankForHonor(profile.honor);
  const next = nextRank(profile.honor);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow={held.name}
          title={profile.displayName}
          lede={profile.bio ?? held.creed}
          actions={<Avatar name={profile.displayName} url={profile.avatarUrl} />}
        />

        <Container className="py-10 sm:py-14">
          {/* Standing */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel title="Honor">
              <Stat
                label="Earned"
                value={profile.honor.toLocaleString()}
                accent
                hint={next ? `Next: ${next.name}` : "The summit"}
              />
            </Panel>
            <Panel title="Experience">
              <Stat label="XP" value={profile.xp.toLocaleString()} />
            </Panel>
            <Panel title="Streak">
              <div className="flex items-center gap-2">
                <FlameIcon
                  aria-hidden="true"
                  className={
                    profile.streakDays > 0
                      ? "size-5 text-sakura"
                      : "size-5 text-muted-foreground"
                  }
                />
                <Stat label="Days running" value={String(profile.streakDays)} />
              </div>
            </Panel>
            <Panel title="Standing">
              <div className="flex items-center gap-2">
                <CalendarIcon aria-hidden="true" className="size-5 text-muted-foreground" />
                <Stat
                  label="Member since"
                  value={JOINED.format(profile.createdAt)}
                  hint={`@${profile.handle}`}
                />
              </div>
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Statistics */}
            <Panel title="Statistics" className="lg:col-span-2">
              {stats.sessions ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Stat label="Best WPM" value={String(stats.best?.wpm ?? 0)} accent />
                  <Stat label="Avg WPM" value={String(stats.avgWpm)} />
                  <Stat label="Accuracy" value={`${stats.avgAccuracy}%`} />
                  <Stat label="Rhythm" value={String(stats.avgMa)} />
                  <Stat label="Sessions" value={String(stats.sessions)} />
                  <Stat label="Words cut" value={stats.wordsCut.toLocaleString()} />
                </div>
              ) : (
                <Empty>This student has not yet cut their first passage.</Empty>
              )}
            </Panel>

            {/* Favourite mode */}
            <Panel title="Favoured Form">
              {stats.favouriteMode ? (
                <Stat
                  label="Played most"
                  value={titleCase(stats.favouriteMode)}
                  hint="Chosen more than any other"
                />
              ) : (
                <Empty>No form favoured yet.</Empty>
              )}
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* History */}
            <Panel title="Typing History" className="lg:col-span-2">
              {history.length ? (
                <ul>
                  {history.map((session) => (
                    <HistoryRow key={session.id} session={session} />
                  ))}
                </ul>
              ) : (
                <Empty>No cuts recorded yet.</Empty>
              )}
            </Panel>

            {/* Badges */}
            <Panel title="Bushido Trials">
              {badges.length ? (
                <ul className="space-y-2">
                  {badges.map((badge) => (
                    <li key={badge.achievement.slug} className="flex items-center gap-3">
                      <span aria-hidden="true" className="font-heading text-lg text-sakura">
                        {badge.achievement.kanji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {badge.achievement.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {when(badge.unlockedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No trials passed yet.</Empty>
              )}
            </Panel>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
