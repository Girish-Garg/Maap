"use client";

import { clsx } from "@/lib/clsx";

/**
 * A single grid cell (design.md §6.3). 56px on mobile, 64px on desktop.
 * Empty cells show nothing (not "0"). Three visual states: empty, filled, and
 * active (the cell the keypad is currently editing - the only place the accent
 * appears inside the grid).
 */
export function GridCell({
  value,
  active,
  onClick,
}: {
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const filled = value > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={filled ? `Quantity ${value}` : "Empty cell"}
      className={clsx(
        "flex h-16 w-full min-w-0 items-center justify-center rounded-sm border font-mono text-lg transition-colors md:h-14",
        active
          ? "border-2 border-accent bg-accent-soft text-accent-text"
          : filled
            ? "border-border-strong bg-surface text-text"
            : "border-border bg-surface text-transparent",
      )}
    >
      {filled ? value : ""}
    </button>
  );
}
