"use client";

import { useCallback, useEffect, useRef } from "react";

/** How long to wait after the last keystroke before writing. */
const DEFAULT_DELAY_MS = 300;

/**
 * Defers an action until the user stops typing, with a way to run it at once.
 *
 * The grids commit a cell as it is typed. Writing on every keystroke would send
 * three requests for a three-digit quantity, and each one's `onSettled` would
 * invalidate and refetch the whole entry list. Waiting for a pause collapses
 * that into one write.
 *
 * What is scheduled is a closure, not a value, so it carries the coordinates of
 * the cell that was open when it was scheduled. That is what makes advancing
 * safe: flushing before moving on commits the previous cell, not the new one.
 */
export function useDebouncedAction(delay: number = DEFAULT_DELAY_MS) {
  const pending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    const action = pending.current;
    pending.current = null;
    action?.();
  }, []);

  /** Run any pending action now. Safe to call when there is none. */
  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    run();
  }, [run]);

  /** Replace the pending action and restart the timer. */
  const schedule = useCallback(
    (action: () => void) => {
      if (timer.current) clearTimeout(timer.current);
      pending.current = action;
      timer.current = setTimeout(() => {
        timer.current = null;
        run();
      }, delay);
    },
    [delay, run],
  );

  // Leaving the screen mid-entry must not silently drop the last edit.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      pending.current?.();
    },
    [],
  );

  return { schedule, flush };
}
