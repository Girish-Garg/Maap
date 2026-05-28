"use client";

import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Optional action shown on the right of the toast (e.g. Undo, Settings). */
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

/**
 * Toast store (design.md §6.7). Errors stay until dismissed; success / info
 * auto-dismiss after 3s, managed by the Toaster component.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience: `toast.success("Saved")`, `toast.error(...)`, `toast.info(...)`. */
export const toast = {
  success: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().show({ kind: "success", message, action }),
  error: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().show({ kind: "error", message, action }),
  info: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().show({ kind: "info", message, action }),
};
