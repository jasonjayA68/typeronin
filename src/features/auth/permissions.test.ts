import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getGrants` decides who may do what, and these tests exist for one property
 * above the rest: it must fail closed AND it must not throw. Those pull in
 * opposite directions — the safe answer on a database error is "no grants", but
 * reaching that answer by throwing is what turned a database blip into a
 * site-wide 500, because this runs inside the header on every page. The outage
 * cases below are the regression guard for that fix.
 */

// server-only throws when imported outside a server bundle; a test is neither.
vi.mock("server-only", () => ({}));

const profileRoleFindMany = vi.fn();
const permissionFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profileRole: { findMany: (...args: unknown[]) => profileRoleFindMany(...args) },
    permission: { findMany: (...args: unknown[]) => permissionFindMany(...args) },
  },
}));

const { getGrants } = await import("@/features/auth/permissions");

/** A signed-in student: no role in app_metadata, so no break-glass. */
const student = { id: "student-1", app_metadata: {} } as unknown as User;
/** A break-glass admin: the one authority that does not depend on the tables. */
const breakGlassAdmin = { id: "admin-1", app_metadata: { role: "admin" } } as unknown as User;

beforeEach(() => {
  profileRoleFindMany.mockReset();
  permissionFindMany.mockReset();
});

describe("getGrants — the normal paths", () => {
  it("grants nothing to a signed-out visitor, without touching the database", async () => {
    const grants = await getGrants(null);

    expect(grants.isAdmin).toBe(false);
    expect(grants.permissions.size).toBe(0);
    expect(profileRoleFindMany).not.toHaveBeenCalled();
  });

  it("maps a role's permissions onto the user", async () => {
    profileRoleFindMany.mockResolvedValue([
      {
        role: {
          slug: "editor",
          permissions: [
            { permission: { slug: "blog:write" } },
            { permission: { slug: "media:write" } },
          ],
        },
      },
    ]);

    const grants = await getGrants(student);

    expect(grants.isAdmin).toBe(false);
    expect([...grants.permissions].sort()).toEqual(["blog:write", "media:write"]);
  });

  it("gives a break-glass admin every permission, even with no role rows", async () => {
    profileRoleFindMany.mockResolvedValue([]);
    permissionFindMany.mockResolvedValue([{ slug: "blog:write" }, { slug: "users:write" }]);

    const grants = await getGrants(breakGlassAdmin);

    expect(grants.isAdmin).toBe(true);
    expect(grants.permissions.has("users:write")).toBe(true);
  });
});

describe("getGrants — when the database is unreachable", () => {
  /**
   * The regression. Before the fix these threw, and the throw reached the site
   * header and 500'd the page. A dependency being down is never worth taking the
   * page down with it — see the mirror of this in features/ads/queries.ts.
   */
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    profileRoleFindMany.mockRejectedValue(new Error("Can't reach database server"));
    // The failure is logged; silence it here so the suite output stays clean,
    // and assert below that it happened.
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("does not throw", async () => {
    await expect(getGrants(student)).resolves.toBeDefined();
  });

  it("grants a normal user nothing — authorization fails closed", async () => {
    const grants = await getGrants(student);

    expect(grants.isAdmin).toBe(false);
    expect(grants.permissions.size).toBe(0);
  });

  it("keeps break-glass admin, which is independent of these tables", async () => {
    const grants = await getGrants(breakGlassAdmin);

    expect(grants.isAdmin).toBe(true);
  });

  it("logs the failure rather than swallowing it silently", async () => {
    await getGrants(student);

    expect(consoleError).toHaveBeenCalled();
  });
});
