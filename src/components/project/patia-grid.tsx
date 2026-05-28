"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/store";
import { useSetPatiaCell, type PatiaEntry } from "@/lib/db/entries";
import { patiaCFT } from "@/lib/calc";
import { formatCFT } from "@/lib/format";
import type { Dimensions } from "@/lib/db/dimensions";
import { LengthChips } from "./length-chips";
import { QtyGrid } from "./qty-grid";
import { NumericKeypad } from "./numeric-keypad";

type Dims = Omit<Dimensions, "user_id">;

const cellKey = (l: number, w: number, t: number) => `${l}|${w}|${t}`;

/**
 * Patia tab (design.md §7.3). Length chips pick the active plank length; the
 * grid below is Width (rows) x Thickness (columns) for that length. Tapping a
 * cell opens the numeric keypad; writes are optimistic.
 */
export function PatiaGrid({
  projectId,
  dimensions,
  entries,
}: {
  projectId: string;
  dimensions: Dims;
  entries: PatiaEntry[];
}) {
  const { activeLengthFt, setActiveLength, editing, openEditor, closeEditor } =
    useUiStore();
  const setCell = useSetPatiaCell(projectId);

  const lengths = dimensions.patia_lengths_ft;
  const widths = dimensions.patia_widths_in;
  const thicknesses = dimensions.patia_thicknesses_in;

  // Default to the first length once dimensions load.
  useEffect(() => {
    if (activeLengthFt === null && lengths.length > 0) {
      setActiveLength(lengths[0]);
    }
  }, [activeLengthFt, lengths, setActiveLength]);

  const active = activeLengthFt ?? lengths[0] ?? null;

  const qtyByCell = new Map<string, number>();
  for (const e of entries) {
    qtyByCell.set(cellKey(e.length_ft, e.width_in, e.thickness_in), e.quantity);
  }
  const lengthsWithData = new Set(
    entries.filter((e) => e.quantity > 0).map((e) => e.length_ft),
  );

  // Live CFT for the active length (the bottom strip, design.md §7.3).
  const lengthTotalCFT = entries
    .filter((e) => e.length_ft === active)
    .reduce((sum, e) => sum + patiaCFT(e), 0);

  if (active === null) return null;

  return (
    <div className="flex flex-col gap-4">
      <LengthChips
        lengths={lengths}
        active={active}
        hasData={(l) => lengthsWithData.has(l)}
        onSelect={setActiveLength}
      />

      <QtyGrid
        rows={widths}
        cols={thicknesses}
        rowLabel={(w) => `${w}″`}
        colLabel={(t) => `${t}″`}
        valueAt={(w, t) => qtyByCell.get(cellKey(active, w, t)) ?? 0}
        isActive={(w, t) =>
          editing?.kind === "patia" &&
          editing.coords.length_ft === active &&
          editing.coords.width_in === w &&
          editing.coords.thickness_in === t
        }
        onTap={(w, t) =>
          openEditor({
            kind: "patia",
            coords: { length_ft: active, width_in: w, thickness_in: t },
            initial: qtyByCell.get(cellKey(active, w, t)) ?? 0,
          })
        }
      />

      {/* Length-total strip - the only accent on this tab (design.md §7.3). */}
      <div className="flex items-center justify-between rounded-md bg-accent-soft px-4 py-3">
        <span className="text-sm text-accent-text">Length total</span>
        <span className="font-mono text-sm text-accent-text">
          {formatCFT(lengthTotalCFT)} CFT
        </span>
      </div>

      {editing?.kind === "patia" &&
        (() => {
          const coords = editing.coords;
          const wi = widths.indexOf(coords.width_in);
          const ti = thicknesses.indexOf(coords.thickness_in);
          const li = lengths.indexOf(coords.length_ft);

          const commit = (quantity: number) =>
            setCell.mutate({ coords, quantity });

          // Open another cell, switching the active length if it changed.
          const openCell = (l: number, w: number, t: number) => {
            if (l !== active) setActiveLength(l);
            openEditor({
              kind: "patia",
              coords: { length_ft: l, width_in: w, thickness_in: t },
              initial: qtyByCell.get(cellKey(l, w, t)) ?? 0,
            });
          };

          // Advance order: down the width column, then next thickness, then
          // wrap to the next length's first cell.
          const goNext = (quantity: number) => {
            commit(quantity);
            if (wi < widths.length - 1) {
              openCell(coords.length_ft, widths[wi + 1], coords.thickness_in);
            } else if (ti < thicknesses.length - 1) {
              openCell(coords.length_ft, widths[0], thicknesses[ti + 1]);
            } else if (li < lengths.length - 1) {
              openCell(lengths[li + 1], widths[0], thicknesses[0]);
            } else {
              closeEditor();
            }
          };

          const goNextLength = (quantity: number) => {
            commit(quantity);
            if (li < lengths.length - 1) {
              openCell(lengths[li + 1], widths[0], thicknesses[0]);
            } else {
              closeEditor();
            }
          };

          const isLastCell =
            wi === widths.length - 1 &&
            ti === thicknesses.length - 1 &&
            li === lengths.length - 1;
          const hasNextLength = li < lengths.length - 1;

          return (
            <NumericKeypad
              title={`Width ${coords.width_in}″ · ${coords.length_ft}′`}
              subtitle={`Thickness ${coords.thickness_in}″`}
              initial={editing.initial}
              onClose={closeEditor}
              onCommit={(quantity) => {
                commit(quantity);
                closeEditor();
              }}
              onNext={isLastCell ? undefined : goNext}
              onNextLength={hasNextLength ? goNextLength : undefined}
              nextLengthLabel={
                hasNextLength ? `Next length (${lengths[li + 1]}′)` : undefined
              }
            />
          );
        })()}
    </div>
  );
}
