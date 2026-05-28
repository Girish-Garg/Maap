"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/clsx";
import { Wordmark } from "@/components/wordmark";
import { ProjectsIcon, PlusIcon, SettingsIcon } from "@/components/icons";

/**
 * Responsive app shell (design.md §5.3). Mobile: 56px top bar + 64px 3-tab
 * bottom nav, the centre "+" as the amber primary. Desktop (>=768px): 240px
 * sidebar, content capped at 1024px and centred.
 */

interface NavItem {
  href: string;
  label: string;
  icon: (props: { width?: number; height?: number }) => React.ReactElement;
  accent?: boolean;
}

const NAV: NavItem[] = [
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/projects/new", label: "New", icon: PlusIcon, accent: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/projects") return pathname === "/projects";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:gap-1 md:border-r md:border-border md:px-3 md:py-5">
        <Link href="/projects" className="mb-4 px-3">
          <Wordmark className="text-xl" />
        </Link>
        {NAV.map(({ href, label, icon: Icon, accent }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                accent
                  ? "mt-1 bg-accent text-white hover:bg-accent-hover"
                  : active
                    ? "bg-surface-2 text-text"
                    : "text-text-2 hover:bg-surface-2",
              )}
            >
              <Icon width={18} height={18} />
              {label === "New" ? "New project" : label}
            </Link>
          );
        })}
      </aside>

      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
        <Wordmark className="text-lg" />
      </header>

      {/* Content. min-w-0 lets this flex child shrink to the space left by the
          sidebar instead of forcing full-viewport width (which overflowed). */}
      <main className="mx-auto min-w-0 max-w-7xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-border bg-surface md:hidden">
        {NAV.map(({ href, label, icon: Icon, accent }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label === "New" ? "New project" : label}
              className="flex flex-1 flex-col items-center justify-center gap-1"
            >
              <span
                className={clsx(
                  "flex items-center justify-center",
                  accent
                    ? "h-10 w-10 rounded-full bg-accent text-white"
                    : active
                      ? "text-text"
                      : "text-text-3",
                )}
              >
                <Icon width={accent ? 22 : 22} height={22} />
              </span>
              {!accent && (
                <span
                  className={clsx(
                    "text-xs",
                    active ? "text-text" : "text-text-3",
                  )}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
