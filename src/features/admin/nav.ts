/**
 * The admin pages.
 *
 * Every page the product intends to have is listed, including the ones not built
 * yet — `status` is honest about which. A sidebar of links that 404 is worse than
 * one that says "not yet": the first wastes your time, the second tells you where
 * the work is.
 *
 * `label` is what an admin reads and can be reworded freely. `slug`, `href` and
 * `permission` are used in code and routing — changing one breaks the page or its
 * access check, so a label that no longer matches its slug is expected.
 */

export type AdminModule = {
  slug: string;
  label: string;
  href: string;
  /** Required permission. Admins hold all of them. */
  permission: string;
  status: "built" | "planned";
  /** Shown on the planned ones, so the gap is legible. */
  note?: string;
};

export type AdminSection = {
  title: string;
  modules: AdminModule[];
};

export const ADMIN_NAV: AdminSection[] = [
  {
    title: "Overview",
    modules: [
      {
        slug: "dashboard",
        label: "Overview",
        href: "/admin",
        permission: "analytics:read",
        status: "built",
      },
      {
        slug: "analytics",
        label: "Analytics",
        href: "/admin/analytics",
        permission: "analytics:read",
        status: "built",
      },
      {
        slug: "audit",
        label: "Activity log",
        href: "/admin/audit",
        permission: "audit:read",
        status: "built",
      },
    ],
  },
  {
    title: "People",
    modules: [
      {
        slug: "users",
        label: "Users",
        href: "/admin/users",
        permission: "users:read",
        status: "built",
      },
      {
        slug: "roles",
        label: "Roles",
        href: "/admin/roles",
        permission: "users:write",
        status: "built",
      },
      {
        slug: "devices",
        label: "Devices",
        href: "/admin/devices",
        permission: "users:write",
        status: "built",
      },
      {
        slug: "abuse",
        label: "Suspicious accounts",
        href: "/admin/abuse",
        permission: "users:write",
        status: "built",
      },
    ],
  },
  {
    title: "Money",
    modules: [
      {
        slug: "economy",
        label: "Honor value",
        href: "/admin/economy",
        permission: "settings:write",
        status: "built",
      },
      {
        slug: "withdrawals",
        label: "Withdrawals",
        href: "/admin/withdrawals",
        permission: "payouts:write",
        status: "built",
      },
      {
        slug: "advertisements",
        label: "Ads",
        href: "/admin/advertisements",
        permission: "ads:write",
        status: "built",
      },
    ],
  },
  {
    title: "Game",
    modules: [
      {
        slug: "words",
        label: "Words",
        href: "/admin/words",
        permission: "words:write",
        status: "built",
      },
      {
        slug: "passages",
        label: "Typing phrases",
        href: "/admin/passages",
        permission: "words:write",
        status: "built",
      },
      {
        slug: "modes",
        label: "Game modes",
        href: "/admin/modes",
        permission: "modes:write",
        status: "built",
      },
      {
        slug: "play-limits",
        label: "Daily limits",
        href: "/admin/play-limits",
        permission: "settings:write",
        status: "built",
      },
      {
        slug: "leaderboards",
        label: "Leaderboards",
        href: "/admin/leaderboards",
        permission: "settings:write",
        status: "built",
      },
    ],
  },
  {
    title: "Content",
    modules: [
      {
        slug: "posts",
        label: "Blog posts",
        href: "/admin/posts",
        permission: "blog:write",
        status: "built",
      },
      {
        slug: "blog-categories",
        label: "Blog categories",
        href: "/admin/blog-categories",
        permission: "blog:write",
        status: "built",
      },
      {
        slug: "media",
        label: "Media library",
        href: "/admin/media",
        permission: "media:write",
        status: "built",
      },
      {
        slug: "comments",
        label: "Comments",
        href: "/admin/comments",
        permission: "comments:moderate",
        status: "built",
      },
      {
        slug: "newsletter",
        label: "Newsletter",
        href: "/admin/newsletter",
        permission: "blog:write",
        status: "built",
      },
    ],
  },
  {
    title: "General",
    modules: [
      {
        slug: "social",
        label: "Social media",
        href: "/admin/social",
        permission: "settings:write",
        status: "built",
      },
      {
        slug: "settings",
        label: "Settings",
        href: "/admin/settings",
        permission: "settings:write",
        status: "built",
      },
    ],
  },
];

export const ADMIN_MODULES: AdminModule[] = ADMIN_NAV.flatMap((s) => s.modules);

export function moduleFor(href: string): AdminModule | undefined {
  return ADMIN_MODULES.find((m) => m.href === href);
}
