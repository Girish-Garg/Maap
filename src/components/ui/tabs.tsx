"use client";

import { clsx } from "@/lib/clsx";

/**
 * Underline tabs (design.md §7.3). The accent is reserved (§3.3), so the active
 * tab is marked by a text-colored underline and primary text weight, never amber.
 */
export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Extra classes on the tab button, e.g. `lg:hidden` to drop it on desktop. */
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex border-b border-border">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={clsx(
              "-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors",
              active
                ? "border-text font-medium text-text"
                : "border-transparent text-text-2 hover:text-text",
              item.className,
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
