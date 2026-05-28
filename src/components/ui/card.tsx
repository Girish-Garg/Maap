import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Card (design.md §6.5). White surface, 1px subtle border, 12px radius, no
 * shadow by default (shadows are reserved for modals and toasts). Padding
 * defaults to 16px; pass `padding="lg"` for the 24px variant.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "md" | "lg";
}

export function Card({ padding = "md", className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-md border border-border bg-surface",
        padding === "lg" ? "p-6" : "p-4",
        className,
      )}
      {...props}
    />
  );
}
