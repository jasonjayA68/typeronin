/**
 * The admin modules.
 *
 * Every module the product intends to have is listed, including the ones not
 * built yet — but `status` is honest about which. A sidebar of links that 404 is
 * worse than a sidebar that says "not yet": the first wastes your time, the
 * second tells you where the work is.
 *
 * `permission` gates the link and the route. The two must agree, so both read
 * from here.
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
        label: "Castle",
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
        label: "Audit log",
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
        label: "Students",
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
    ],
  },
  {
    title: "Revenue",
    modules: [
      {
        slug: "economy",
        label: "Honor economy",
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
        label: "Advertisements",
        href: "/admin/advertisements",
        permission: "ads:write",
        status: "built",
      },
    ],
  },
  {
    title: "Play",
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
        label: "Passages",
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
    title: "House",
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
