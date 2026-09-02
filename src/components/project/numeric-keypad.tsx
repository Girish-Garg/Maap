"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

/** How far the sheet must be pulled down before letting go dismisses it. */
const DISMISS_AFTER_PX = 90;
/** Movement below this counts as a tap, not a drag. */
const TAP_SLOP_PX = 4;

/** One of the optional jump buttons under the primary action. */
export interface KeypadJump {
  label: string;
  onJump: (value: number) => void;
}

/**
 * Custom numeric keypad (design.md §10.2). A bottom sheet on mobile, centred
 * card on desktop. Quantities are whole counts, so this is integer-only.
 *
 * Entry is continuous: the value is committed as it is typed, so there is no
 * Done button to press and the grid behind updates immediately. Committing also
 * happens on every way out - Next, a jump, or closing - so nothing is left
 * sitting in a pending debounce.
 *
 * Typing on a cell that already holds a value replaces it rather than appending
 * to it: opening a cell showing 4 and pressing 1 gives 1, not 41. Editing keys
 * (backspace, C) count as having started, so digits after them append normally.
 *
 * We ship our own instead of the OS keypad because input[type=number] renders
 * inconsistently across PWAs (architecture §Mobile / numeric input).
 */
export function NumericKeypad({
  title,
  subtitle,
  initial,
  onChange,
  onClose,
  onNext,
  jumps = [],
}: {
  title: string;
  subtitle?: string;
  initial: number;
  /** Called as the value is typed. Debounced by the caller if it writes. */
  onChange: (value: number) => void;
  /** Close the keypad. The current value has already been committed. */
  onClose: (value: number) => void;
  /** Commit and move to the next cell. Omit at the very end of the grid. */
  onNext?: (value: number) => void;
  /** Extra jumps (next thickness, next length). Shown when non-empty. */
  jumps?: KeypadJump[];
}) {
  // Empty string represents "no value" (commits as 0 -> deletes the cell).
  const [draft, setDraft] = useState(initial > 0 ? String(initial) : "");
  // Whether anything has been typed since this cell opened. The first digit
  // replaces what was there; after that, digits append.
  const started = useRef(false);

  // Reset whenever a different cell opens / advances the keypad.
  useEffect(() => {
    setDraft(initial > 0 ? String(initial) : "");
    started.current = false;
  }, [initial, title, subtitle]);

  const toValue = (d: string) => (d === "" ? 0 : Number(d));
  const value = useCallback(() => toValue(draft), [draft]);

  // One place for every edit, so committing and the "first keystroke replaces"
  // rule can't drift apart between the on-screen keys and the physical ones.
  const edit = useCallback(
    (next: (current: string) => string) => {
      setDraft((current) => {
        const base = started.current ? current : "";
        started.current = true;
        const updated = next(base);
        onChange(toValue(updated));
        return updated;
      });
    },
    [onChange],
  );

  const append = useCallback(
    (digit: string) => edit((d) => (d === "0" ? digit : (d + digit).slice(0, 6))),
    [edit],
  );
  // Backspace and clear act on what is displayed, not on an empty string, so
  // they behave as editing rather than as the first replacing keystroke.
  const backspace = useCallback(() => {
    started.current = true;
    edit((d) => d.slice(0, -1));
  }, [edit]);
  const clear = useCallback(() => {
    started.current = true;
    edit(() => "");
  }, [edit]);

  // Physical-keyboard support. Enter advances when possible, else closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        append(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose(value());
      } else if (e.key === "Enter") {
        e.preventDefault();
        (onNext ?? onClose)(value());
      } else if (e.key === "Tab" && jumps.length > 0) {
        e.preventDefault();
        jumps[jumps.length - 1].onJump(value());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onNext, onClose, append, backspace, jumps]);

  // Drag-to-dismiss, mobile only: on desktop the keypad is a centred card, not
  // a sheet, so there is nothing to pull down to.
  const [drag, setDrag] = useState({ active: false, offset: 0 });
  const dragFrom = useRef<number | null>(null);
  const lastOffset = useRef(0);
  const ignoreNextTap = useRef(false);
  /** Set once the sheet has been touched, to stop the entrance animation replaying. */
  const dragged = useRef(false);
  /** Pointer id currently captured, or null while this is still just a tap. */
  const captured = useRef<number | null>(null);

  const onDragStart = (event: React.PointerEvent) => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    dragFrom.current = event.clientY;
    lastOffset.current = 0;
    captured.current = null;
    dragged.current = true;
    // A new gesture always starts clean: a suppression left over from a
    // previous drag whose click never arrived would otherwise eat this tap.
    ignoreNextTap.current = false;
    setDrag({ active: true, offset: 0 });
  };

  const onDragMove = (event: React.PointerEvent) => {
    if (dragFrom.current === null) return;
    const dy = event.clientY - dragFrom.current;

    // Capture only once this is unmistakably a drag, never on a tap. While an
    // element holds pointer capture the resulting click is dispatched to *it*
    // rather than to whatever was pressed, so capturing on pointerdown stopped
    // the pill's onClick from ever firing. Drags still want it: without
    // capture, releasing outside the handle would strand the sheet mid-pull.
    if (captured.current === null && Math.abs(dy) >= TAP_SLOP_PX) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
        captured.current = event.pointerId;
      } catch {
        captured.current = null; // Capture unsupported; the drag still works.
      }
    }

    // Upward drags resist rather than lift the sheet off the bottom edge.
    lastOffset.current = dy > 0 ? dy : dy / 4;
    setDrag({ active: true, offset: lastOffset.current });
  };

  const onDragEnd = () => {
    if (dragFrom.current === null) return;
    dragFrom.current = null;
    if (lastOffset.current > DISMISS_AFTER_PX) {
      onClose(value());
      return;
    }
    // A real drag is followed by a click on the handle; swallow that one so
    // pulling the sheet and letting go doesn't also count as a tap.
    if (Math.abs(lastOffset.current) >= TAP_SLOP_PX) ignoreNextTap.current = true;
    // Not far enough: settle back, letting the transition animate it.
    setDrag({ active: false, offset: 0 });
  };

  /**
   * A tap on the grabber closes. Driven by click rather than the pointer
   * handlers so that focusing the handle and pressing Enter works too, which
   * is why a snapped-back drag has to be suppressed explicitly rather than by
   * measuring how far the last gesture moved.
   */
  const onGrabberTap = () => {
    if (ignoreNextTap.current) {
      ignoreNextTap.current = false;
      return;
    }
    onClose(value());
  };

  // Fades from fully opaque to clear over roughly the height of the sheet.
  const backdropOpacity =
    drag.offset > 0 ? Math.max(0, 1 - drag.offset / 320) : 1;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
      {/* Backdrop: warm black at 50% (design.md §6.6). It thins out as the
          sheet is dragged away, so the gesture feels attached to the screen. */}
      <button
        aria-label="Close keypad"
        onClick={() => onClose(value())}
        className="absolute inset-0 bg-[rgba(28,25,23,0.5)]"
        style={{ opacity: backdropOpacity, transition: drag.active ? "none" : "opacity 180ms ease-out" }}
      />
      <div
        role="dialog"
        aria-label="Enter quantity"
        className={clsx(
          "relative w-full max-w-sm bg-surface p-4 shadow-xl",
          "rounded-t-lg md:rounded-lg",
          // Entrance animation on arrival only. It would fight the drag
          // transform, and re-adding the class when a drag settles back would
          // replay the whole slide-in every time the sheet is released.
          !dragged.current && "animate-[keypad-in_180ms_ease-out]",
        )}
        style={{
          transform: drag.offset ? `translateY(${drag.offset}px)` : undefined,
          transition: drag.active ? "none" : "transform 180ms ease-out",
        }}
      >
        {/* Grabber and title: the drag surface. The keys below are deliberately
            excluded - a downward smudge while tapping a digit must never
            dismiss the sheet mid-entry. */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="touch-none"
        >
          <button
            type="button"
            aria-label="Close keypad"
            onClick={onGrabberTap}
            className="-mt-2 mb-1 flex w-full justify-center py-2 md:hidden"
          >
            <span className="h-1 w-9 rounded-full bg-border-strong" />
          </button>
          <div className="mb-3 text-center">
            <p className="text-sm text-text-2">{title}</p>
            {subtitle && <p className="text-xs text-text-3">{subtitle}</p>}
            <p className="mt-2 font-mono text-2xl text-text">{draft || "0"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <KeypadButton key={k} onClick={() => append(k)}>
              {k}
            </KeypadButton>
          ))}
          <KeypadButton onClick={clear} variant="muted">
            C
          </KeypadButton>
          <KeypadButton onClick={() => append("0")}>0</KeypadButton>
          <KeypadButton onClick={backspace} variant="muted">
            ⌫
          </KeypadButton>
        </div>

        {/* Next is the repeated action, so it gets the width and the accent.
            The jumps below skip ahead an axis at a time. */}
        <div className="mt-3 flex flex-col gap-2">
          {onNext && (
            <button
              type="button"
              onClick={() => onNext(value())}
              className="h-12 w-full rounded bg-accent font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Next
            </button>
          )}
          {jumps.length > 0 && (
            <div className="flex gap-2">
              {jumps.map((jump) => (
                <button
                  key={jump.label}
                  type="button"
                  onClick={() => jump.onJump(value())}
                  className="h-11 flex-1 rounded border border-border-strong bg-surface text-sm font-medium text-text-2 transition-colors hover:bg-surface-2"
                >
                  {jump.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Keyboard hint, desktop only. */}
        <p className="mt-2 hidden text-center text-xs text-text-3 md:block">
          Enter = next · {jumps.length > 0 ? "Tab = next length · " : ""}Esc =
          close
        </p>
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "muted";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-14 items-center justify-center rounded font-mono text-xl transition-colors",
        variant === "muted"
          ? "bg-surface-2 text-text-2 hover:bg-border"
          : "bg-surface-2 text-text hover:bg-border",
      )}
    >
      {children}
    </button>
  );
}
