"use client";

import { clsx } from "@/lib/clsx";

/**
 * Patia length selector (design.md §6.4). A horizontally-scrollable row of
 * pills. The active chip carries the accent; a small dot marks lengths that
 * already have data so the user can see what they've filled.
 */
export function LengthChips({
  lengths,
  active,
  hasData,
  onSelect,
}: {
  lengths: number[];
  active: number | null;
  hasData: (lengthFt: number) => boolean;
  onSelect: (lengthFt: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-2">Length</span>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {lengths.map((len) => {
          const isActive = len === active;
          return (
            <button
              key={len}
              type="button"
              onClick={() => onSelect(len)}
              className={clsx(
                "relative flex h-9 shrink-0 items-center rounded-full border px-3.5 font-mono text-sm transition-colors",
                isActive
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-text hover:bg-surface-2",
              )}
            >
              {len}&apos;
              {hasData(len) && !isActive && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
