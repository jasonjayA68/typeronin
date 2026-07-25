"use client";

import {
  GaugeIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SwordIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { signOut } from "@/features/auth/actions";
import type { Student } from "@/lib/supabase/server";
import { Container } from "@/shared/components/layout/container";
import { Logo } from "@/shared/components/logo";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

/** Initials for the avatar, from the chosen name. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function StudentMenu({ student }: { student: Student }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label="Your account">
          <span className="grid size-6 place-items-center rounded-full border border-sakura/40 bg-sakura/10 font-heading text-[0.6rem] text-sakura">
            {initials(student.name)}
          </span>
          <span className="hidden max-w-28 truncate sm:inline">{student.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center justify-between gap-2">
            <p className="font-heading tracking-wide">{student.name}</p>
            {student.role === "admin" ? (
              <span className="rounded-full border border-sakura/40 bg-sakura/10 px-1.5 py-0.5 font-heading text-[0.6rem] tracking-[0.1em] text-sakura uppercase">
                Admin
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{student.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <GaugeIcon aria-hidden="true" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dojo">
            <SwordIcon aria-hidden="true" />
            The Dojo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/leaderboard">
            <TrophyIcon aria-hidden="true" />
            Leaderboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contact">
            <LifeBuoyIcon aria-hidden="true" />
            Help &amp; Contact
          </Link>
        </DropdownMenuItem>
        {student.role === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheckIcon aria-hidden="true" />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            // Keep the menu mounted while the action runs.
            event.preventDefault();
            startTransition(() => {
              void signOut();
            });
          }}
        >
          <LogOutIcon aria-hidden="true" />
          {pending ? "Leaving…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The primary navigation — five destinations, nothing more.
 *
 * Deliberately fixed and plain-English. Every item is a top-level place a new
 * visitor needs: what the product is (Home), where you play (The Dojo), how you
 * progress (Train), what you can read (Blog), and how to reach us (Contact). No
 * jump-links, no database-driven categories, no Japanese labels — a first-time
 * user from any country can read the whole bar and know where to go.
 */
const NAVIGATION = [
  { href: "/", label: "Home" },
  { href: "/dojo", label: "The Dojo" },
  { href: "/train", label: "Train" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeaderNav({ student }: { student: Student | null }) {
  const [open, setOpen] = useState(false);
  const navigation = NAVIGATION;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {student ? (
              <StudentMenu student={student} />
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="dojo" size="sm">
                  <Link href="/register">Enter the Dojo</Link>
                </Button>
              </>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <MenuIcon aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile" className="mt-2 flex flex-col gap-1 px-4">
                  {navigation.map((item) => (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setOpen(false)}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </Button>
                  ))}
                  {student ? (
                    <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                  ) : null}
                  {student ? null : (
                    <Button asChild variant="ghost" className="justify-start sm:hidden">
                      <Link href="/login">Sign in</Link>
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </Container>
    </header>
  );
}
