"use client";

import { GridCell } from "./grid-cell";

interface PanelProps {
  rows: number[];
  cols: number[];
  rowLabel: (v: number) => string;
  colLabel: (v: number) => string;
  valueAt: (row: number, col: number) => number;
  isActive: (row: number, col: number) => boolean;
  onTap: (row: number, col: number) => void;
}

/** One self-contained grid: a header row of column labels, then data rows. */
function GridPanel({
  rows,
  cols,
  rowLabel,
  colLabel,
  valueAt,
  isActive,
  onTap,
}: PanelProps) {
  return (
    <div
      className="grid w-full gap-1.5"
      style={{
        gridTemplateColumns: `2.5rem repeat(${cols.length}, minmax(0, 1fr))`,
      }}
    >
      <div />
      {cols.map((c) => (
        <div key={c} className="pb-1 text-center font-mono text-xs text-text-2">
          {colLabel(c)}
        </div>
      ))}

      {rows.map((r) => (
        <div key={r} className="contents">
          <div className="flex items-center justify-end pr-1 font-mono text-xs text-text-2">
            {rowLabel(r)}
          </div>
          {cols.map((c) => (
            <GridCell
              key={c}
              value={valueAt(r, c)}
              active={isActive(r, c)}
              onClick={() => onTap(r, c)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Quantity grid shared by Patia (Width x Thickness) and Pawa (Length x Size).
 *
 * Mobile: one continuous grid of all rows (vertical scroll).
 * Desktop (lg+): the rows are split into two halves shown side by side, so the
 * spare horizontal width replaces vertical scrolling - e.g. widths 3"-10" on
 * the left, 11"-18" on the right.
 */
export function QtyGrid(props: PanelProps) {
  const { rows } = props;
  const mid = Math.ceil(rows.length / 2);
  const firstHalf = rows.slice(0, mid);
  const secondHalf = rows.slice(mid);

  return (
    <>
      <div className="lg:hidden">
        <GridPanel {...props} rows={rows} />
      </div>
      <div className="hidden gap-8 lg:grid lg:grid-cols-2">
        <GridPanel {...props} rows={firstHalf} />
        {secondHalf.length > 0 && <GridPanel {...props} rows={secondHalf} />}
      </div>
    </>
  );
}
