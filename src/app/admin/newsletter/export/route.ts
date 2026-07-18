import { audit } from "@/features/admin/audit";
import { requirePermission } from "@/features/admin/guard";
import { prisma } from "@/lib/prisma";

import type { SubscriberStatus } from "../../../../../generated/prisma/client";

/**
 * The subscriber export.
 *
 * A Route Handler is as public as a Server Action, so it re-checks the same
 * permission the page does — and the download itself is audited, because an
 * export of every address on file is the single most sensitive thing this
 * module does.
 *
 * CONFIRMED only, unless ?status= says otherwise. That default is the whole
 * point: exporting unproven addresses to a sending tool is how a domain gets
 * itself blocklisted.
 */

const STATUSES = ["CONFIRMED", "PENDING", "UNSUBSCRIBED"] as const;

/**
 * RFC 4180 quoting, plus the spreadsheet caveat: a field opening with =, +, -
 * or @ is executed as a formula by Excel and Sheets on open. Prefixing an
 * apostrophe defuses it — an address is data, never a formula.
 */
function csvField(value: string | null): string {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(request: Request) {
  const { user } = await requirePermission("blog:write");

  const requested = new URL(request.url).searchParams.get("status")?.toUpperCase();
  const status = STATUSES.find((s) => s === requested) ?? ("CONFIRMED" satisfies SubscriberStatus);

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    select: { email: true, status: true, source: true, createdAt: true },
  });

  const rows = subscribers.map((s) =>
    [csvField(s.email), csvField(s.status), csvField(s.source), csvField(s.createdAt.toISOString())].join(",")
  );
  const csv = ["email,status,source,createdAt", ...rows].join("\r\n");

  await audit({
    actorId: user.id,
    action: "subscriber.exported",
    entity: "NewsletterSubscriber",
    meta: { status, count: subscribers.length },
  });

  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${status.toLowerCase()}-${today}.csv"`,
      // A list of email addresses must not sit in a shared cache.
      "Cache-Control": "no-store, private",
    },
  });
}
