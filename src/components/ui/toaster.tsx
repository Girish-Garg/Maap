"use client";

import { useEffect } from "react";
import { useToastStore, type ToastKind } from "@/lib/toast";
import { clsx } from "@/lib/clsx";

const AUTO_DISMISS_MS = 3000;

/**
 * Renders the toast stack. Bottom-center on mobile, bottom-right on desktop
 * (design.md §6.7). Success / info auto-dismiss after 3s; errors stay until
 * the user dismisses them manually.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end md:px-0">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          kind={t.kind}
          message={t.message}
          action={t.action}
          onDismiss={() => dismiss(t.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  id,
  kind,
  message,
  action,
  onDismiss,
}: {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (kind === "error") return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [id, kind, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md border bg-surface px-4 py-3 text-sm shadow-xl",
        "animate-[keypad-in_180ms_ease-out]",
        kind === "error"
          ? "border-l-4 border-l-error border-border"
          : "border-border",
      )}
    >
      <span aria-hidden className={clsx("text-base leading-none", iconColor(kind))}>
        {kind === "success" ? "✓" : kind === "error" ? "!" : "·"}
      </span>
      <span className="flex-1 text-text">{message}</span>
      {action ? (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
        >
          {action.label}
        </button>
      ) : kind === "error" ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 text-text-3 hover:text-text"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function iconColor(kind: ToastKind): string {
  if (kind === "success") return "text-success";
  if (kind === "error") return "text-error";
  return "text-text-2";
}
