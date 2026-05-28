"use client";

import { useCallback, useEffect, useState } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Custom numeric keypad (design.md §10.2). A bottom sheet on mobile, centred
 * card on desktop. Quantities are whole counts, so this is integer-only.
 *
 * Built for fast continuous entry: besides Done, it can commit-and-advance to
 * the next cell (onNext) or jump to the next length grid (onNextLength), and it
 * binds the physical keyboard (digits, Backspace, Enter = next, Esc = close) so
 * a desktop user never leaves the home row.
 *
 * We ship our own instead of the OS keypad because input[type=number] renders
 * inconsistently across PWAs (architecture §Mobile / numeric input).
 */
export function NumericKeypad({
  title,
  subtitle,
  initial,
  onCommit,
  onClose,
  onNext,
  onNextLength,
  nextLengthLabel,
}: {
  title: string;
  subtitle?: string;
  initial: number;
  /** Commit and close (Done / Enter when there is nothing to advance to). */
  onCommit: (value: number) => void;
  onClose: () => void;
  /** Commit and move to the next cell. Omit at the very end of the grid. */
  onNext?: (value: number) => void;
  /** Commit and jump to the first cell of the next length. Patia only. */
  onNextLength?: (value: number) => void;
  nextLengthLabel?: string;
}) {
  // Empty string represents "no value" (commits as 0 -> deletes the cell).
  const [draft, setDraft] = useState(initial > 0 ? String(initial) : "");

  // Reset the draft whenever a different cell opens / advances the keypad.
  useEffect(() => {
    setDraft(initial > 0 ? String(initial) : "");
  }, [initial, title, subtitle]);

  const value = useCallback(() => (draft === "" ? 0 : Number(draft)), [draft]);
  const append = (digit: string) =>
    setDraft((d) => (d === "0" ? digit : (d + digit).slice(0, 6)));
  const backspace = () => setDraft((d) => d.slice(0, -1));
  const clear = () => setDraft("");

  // Physical-keyboard support. Enter advances when possible, else commits.
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
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        (onNext ?? onCommit)(value());
      } else if (e.key === "Tab" && onNextLength) {
        e.preventDefault();
        onNextLength(value());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onNext, onNextLength, onCommit, onClose]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center md:items-center">
      {/* Backdrop: warm black at 50% (design.md §6.6) */}
      <button
        aria-label="Close keypad"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(28,25,23,0.5)]"
      />
      <div
        role="dialog"
        aria-label="Enter quantity"
        className={clsx(
          "relative w-full max-w-sm bg-surface p-4 shadow-xl",
          "rounded-t-lg md:rounded-lg",
          "animate-[keypad-in_180ms_ease-out]",
        )}
      >
        <div className="mb-3 text-center">
          <p className="text-sm text-text-2">{title}</p>
          {subtitle && <p className="text-xs text-text-3">{subtitle}</p>}
          <p className="mt-2 font-mono text-2xl text-text">{draft || "0"}</p>
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

        {/* Primary actions. Next (accent) is the repeated action; Done closes. */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCommit(value())}
              className={clsx(
                "h-12 flex-1 rounded border border-border-strong bg-surface font-medium text-text transition-colors hover:bg-surface-2",
              )}
            >
              Done
            </button>
            {onNext && (
              <button
                type="button"
                onClick={() => onNext(value())}
                className="h-12 flex-1 rounded bg-accent font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Next
              </button>
            )}
          </div>
          {onNextLength && (
            <button
              type="button"
              onClick={() => onNextLength(value())}
              className="h-11 w-full rounded border border-border-strong bg-surface text-sm font-medium text-text-2 transition-colors hover:bg-surface-2"
            >
              {nextLengthLabel ?? "Next length"}
            </button>
          )}
        </div>

        {/* Keyboard hint, desktop only. */}
        <p className="mt-2 hidden text-center text-xs text-text-3 md:block">
          Enter = next · {onNextLength ? "Tab = next length · " : ""}Esc = close
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
