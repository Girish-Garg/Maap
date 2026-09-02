"use client";

import { useUiStore } from "@/lib/store";
import { useDebouncedAction } from "@/lib/use-debounced-action";
import { useSetPawaCell, type PawaEntry } from "@/lib/db/entries";
import { pawaCFT } from "@/lib/calc";
import { formatCFT } from "@/lib/format";
import type { Dimensions } from "@/lib/db/dimensions";
import { QtyGrid } from "./qty-grid";
import { NumericKeypad } from "./numeric-keypad";

type Dims = Omit<Dimensions, "user_id">;

const cellKey = (l: number, s: number) => `${l}|${s}`;

/**
 * Pawa tab (design.md §7.3 analogue). A single grid: Length (rows, inches) x
 * Size (columns, square side). Same cell + keypad mechanics as Patia.
 */
export function PawaGrid({
  projectId,
  dimensions,
  entries,
}: {
  projectId: string;
  dimensions: Dims;
  entries: PawaEntry[];
}) {
  const { editing, openEditor, closeEditor } = useUiStore();
  const setCell = useSetPawaCell(projectId);
  const commitLater = useDebouncedAction();

  const lengths = dimensions.pawa_lengths_in;
  const sizes = dimensions.pawa_sizes;

  const qtyByCell = new Map<string, number>();
  for (const e of entries) {
    qtyByCell.set(cellKey(e.length_in, e.size_side), e.quantity);
  }

  const totalCFT = entries.reduce((sum, e) => sum + pawaCFT(e), 0);

  return (
    <div className="flex flex-col gap-4">
      <QtyGrid
        rows={lengths}
        cols={sizes}
        rowLabel={(l) => `${l}″`}
        colLabel={(s) => `${s}×${s}`}
        valueAt={(l, s) => qtyByCell.get(cellKey(l, s)) ?? 0}
        isActive={(l, s) =>
          editing?.kind === "pawa" &&
          editing.coords.length_in === l &&
          editing.coords.size_side === s
        }
        onTap={(l, s) =>
          openEditor({
            kind: "pawa",
            coords: { length_in: l, size_side: s },
            initial: qtyByCell.get(cellKey(l, s)) ?? 0,
          })
        }
      />

      <div className="flex items-center justify-between rounded-md bg-accent-soft px-4 py-3">
        <span className="text-sm text-accent-text">Pawa total</span>
        <span className="font-mono text-sm text-accent-text">
          {formatCFT(totalCFT)} CFT
        </span>
      </div>

      {editing?.kind === "pawa" &&
        (() => {
          const coords = editing.coords;
          const li = lengths.indexOf(coords.length_in);
          const si = sizes.indexOf(coords.size_side);

          // Scheduled while typing; the closure keeps this cell's coordinates,
          // so advancing flushes the write for the cell being left behind.
          const scheduleCommit = (quantity: number) =>
            commitLater.schedule(() => setCell.mutate({ coords, quantity }));

          const openCell = (l: number, s: number) =>
            openEditor({
              kind: "pawa",
              coords: { length_in: l, size_side: s },
              initial: qtyByCell.get(cellKey(l, s)) ?? 0,
            });

          // Every exit writes immediately rather than leaving the last edit
          // waiting on the debounce.
          const leaveCell = (quantity: number, then: () => void) => {
            scheduleCommit(quantity);
            commitLater.flush();
            then();
          };

          // Advance down the length column, then move to the next size.
          const goNext = (quantity: number) =>
            leaveCell(quantity, () => {
              if (li < lengths.length - 1) {
                openCell(lengths[li + 1], coords.size_side);
              } else if (si < sizes.length - 1) {
                openCell(lengths[0], sizes[si + 1]);
              } else {
                closeEditor();
              }
            });

          // Pawa has no thickness axis, so size is its only jump.
          const goNextSize = (quantity: number) =>
            leaveCell(quantity, () =>
              openCell(coords.length_in, sizes[si + 1]),
            );

          const isLastCell =
            li === lengths.length - 1 && si === sizes.length - 1;

          const jumps =
            si < sizes.length - 1
              ? [
                  {
                    label: `Next size (${sizes[si + 1]}″)`,
                    onJump: goNextSize,
                  },
                ]
              : [];

          return (
            <NumericKeypad
              title={`Length ${coords.length_in}″`}
              subtitle={`Size ${coords.size_side}×${coords.size_side}`}
              initial={editing.initial}
              onChange={scheduleCommit}
              onClose={(quantity) => leaveCell(quantity, closeEditor)}
              onNext={isLastCell ? undefined : goNext}
              jumps={jumps}
            />
          );
        })()}
    </div>
  );
}
