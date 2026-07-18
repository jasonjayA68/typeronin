import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true, quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { handleSuffix, mintReferralCode, slugifyHandle } from "../src/features/profile/handles";

/**
 * Grant (or revoke) the admin role, by email.
 *
 *   npx tsx scripts/grant-admin.ts you@example.com
 *   npx tsx scripts/grant-admin.ts you@example.com --revoke
 *
 * Authority lives in the database, so this is the supported way to make the
 * first admin — there is no chicken-and-egg panel to log into first.
 *
 * The account must already exist in Supabase auth (i.e. you have registered).
 * This deliberately cannot create accounts: minting credentials from a script
 * is how you end up with logins nobody remembers making.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Mirrors ensureProfile: same handle rules, same collision retry. */
async function ensureProfileFor(id: string, email: string, name: string | null) {
  const existing = await prisma.profile.findUnique({ where: { id } });
  if (existing) return existing;

  const base = slugifyHandle(name ?? "") ?? slugifyHandle(email.split("@")[0]) ?? "student";
  const displayName = (name ?? "").trim() || email.split("@")[0];

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.profile.create({
        data: {
          id,
          handle: attempt === 0 ? base : `${base}-${handleSuffix()}`,
          displayName,
          referralCode: mintReferralCode(),
        },
      });
    } catch (error) {
      const settled = await prisma.profile.findUnique({ where: { id } });
      if (settled) return settled;
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new Error(`could not mint a unique handle for ${email}`);
}

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("usage: npx tsx scripts/grant-admin.ts <email> [--revoke]");
    process.exit(1);
  }

  // auth.users is Supabase's, outside the Prisma schema — hence raw SQL.
  const users = await prisma.$queryRaw<
    { id: string; email: string; name: string | null; confirmed: boolean }[]
  >`
    select id::text,
           email,
           raw_user_meta_data->>'name' as name,
           (email_confirmed_at is not null) as confirmed
      from auth.users
     where lower(email) = lower(${email})
     limit 1
  `;

  const user = users[0];
  if (!user) {
    console.error(`No account for ${email}. Register at /register first — this script`);
    console.error("grants a role to an existing account; it does not create one.");
    process.exit(1);
  }
  if (!user.confirmed) {
    console.error(`${email} exists but has not confirmed its email. Confirm it first.`);
    process.exit(1);
  }

  const role = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!role) {
    console.error("No 'admin' role. Run `npx prisma db seed` first.");
    process.exit(1);
  }

  const profile = await ensureProfileFor(user.id, user.email, user.name);

  if (revoke) {
    await prisma.profileRole.deleteMany({ where: { profileId: profile.id, roleId: role.id } });
    console.log(`revoked admin from ${email} (${profile.handle})`);
    return;
  }

  await prisma.profileRole.upsert({
    where: { profileId_roleId: { profileId: profile.id, roleId: role.id } },
    update: {},
    create: { profileId: profile.id, roleId: role.id },
  });

  const granted = await prisma.role.findMany({
    where: { profiles: { some: { profileId: profile.id } } },
    select: { name: true, slug: true, _count: { select: { permissions: true } } },
  });

  console.log(`granted admin to ${email}`);
  console.log(`  profile : ${profile.handle} (${profile.displayName})`);
  console.log(`  roles   : ${granted.map((r) => `${r.name} [${r.slug}] — ${r._count.permissions} permissions`).join(", ")}`);
  console.log("  Sign out and back in is NOT required: the role is read per request.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
