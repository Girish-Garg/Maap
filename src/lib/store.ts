import { create } from "zustand";
import type { PatiaCoords, PawaCoords } from "@/lib/db/types";

/**
 * Transient UI state only (architecture.md §State management). Anything that
 * must survive a reload lives in TanStack Query / the database, never here.
 *
 * This store drives the grid editing session: which length chip is active on
 * the Patia tab, and which cell (if any) the numeric keypad is editing.
 */

// Re-exported for the grid components, which have always imported them here.
export type { PatiaCoords, PawaCoords };

/** The cell the numeric keypad is currently editing, plus its starting value. */
export type EditTarget =
  | { kind: "patia"; coords: PatiaCoords; initial: number }
  | { kind: "pawa"; coords: PawaCoords; initial: number };

interface UiState {
  /** Active Patia length chip (feet). Null until a grid sets it. */
  activeLengthFt: number | null;
  /** Cell being edited, or null when the keypad is closed. */
  editing: EditTarget | null;

  setActiveLength: (lengthFt: number) => void;
  openEditor: (target: EditTarget) => void;
  closeEditor: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeLengthFt: null,
  editing: null,

  setActiveLength: (lengthFt) => set({ activeLengthFt: lengthFt }),
  openEditor: (target) => set({ editing: target }),
  closeEditor: () => set({ editing: null }),
}));
