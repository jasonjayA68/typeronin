import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";

/**
 * The Prisma client.
 *
 * Prisma 7 no longer reads a connection string from the schema — a driver
 * adapter is required, and `new PrismaClient()` with no adapter is a type error
 * rather than a runtime surprise. Every guide written for Prisma 5/6 is wrong
 * on this point.
 *
 * DATABASE_URL should be Supabase's POOLED connection (port 6543). Migrations
 * use DIRECT_URL (5432) instead — see prisma.config.ts for why.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your " +
        "Supabase connection strings."
    );
  }

  // The Supabase dashboard shows the project API URL far more prominently than
  // the database connection string, and pasting the wrong one is easy. Without
  // this check the failure surfaces deep inside the pg driver as an opaque
  // parse error, so name it here instead.
  if (!/^postgres(ql)?:\/\//.test(connectionString)) {
    throw new Error(
      `DATABASE_URL must be a Postgres connection string, but starts with ` +
        `"${connectionString.split(":")[0]}:". That looks like the project API ` +
        `URL. Use Dashboard → Project Settings → Database → Connection string ` +
        `(it begins with postgresql://). See .env.example.`
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Queries are noisy; warnings and errors are not.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Dev reloads re-evaluate modules on every change. Without this the process
 * accumulates a new pool per reload until Postgres refuses new connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
