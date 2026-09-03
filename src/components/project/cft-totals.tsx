"use client";

import { formatCFT } from "@/lib/format";

export interface CftRow {
  /** Short label for the column this row totals, e.g. `1.5″` or `2.5×2.5`. */
  label: string;
  cft: number;
}

/**
 * The totals block at the foot of a grid tab: one line per column of the grid,
 * then the tab's own total.
 *
 * The per-column rows are built from the union of the configured dimensions and
 * whatever the entries actually use, so they always add up to the total shown
 * beneath them. Listing only the configured values would quietly drop entries
 * whose dimension was later removed in Settings, and the block would stop
 * summing to its own total.
 */
export function CftTotals({
  rows,
  totalLabel,
  total,
}: {
  rows: CftRow[];
  totalLabel: string;
  total: number;
}) {
  return (
    <div className="flex flex-col rounded-md bg-accent-soft px-4 py-3">
      {/* Desktop only. On mobile the same figures sit under their own grid
          columns, where they read better; the desktop grid is split in half so
          it cannot carry them. */}
      <div className="hidden lg:flex lg:flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-0.5 text-accent-text/80"
          >
            <span className="text-xs">{row.label}</span>
            <span className="font-mono text-xs">{formatCFT(row.cft)} CFT</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between lg:mt-1.5 lg:border-t lg:border-accent-text/20 lg:pt-2">
        <span className="text-sm text-accent-text">{totalLabel}</span>
        <span className="font-mono text-sm text-accent-text">
          {formatCFT(total)} CFT
        </span>
      </div>
    </div>
  );
}
