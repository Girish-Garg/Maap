"use client";

import { useEffect, useState } from "react";
import { clsx } from "@/lib/clsx";
import { Card } from "@/components/ui/card";

type Theme = "light" | "dark" | "system";
const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Resolves a theme choice to a dark/light boolean and applies the class. */
function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Appearance control (design.md §3.2 dark mode). Persists the choice and keeps
 * "System" in sync with the OS while selected. The no-flash init lives in the
 * root layout's head script.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // Hydrate from storage after mount (server can't read localStorage).
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(stored);
  }, []);

  // Follow the OS while on "System".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const choose = (value: Theme) => {
    setTheme(value);
    localStorage.setItem("theme", value);
    apply(value);
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium text-text">Appearance</h2>
      <div className="flex gap-1 rounded-md border border-border p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={clsx(
              "flex-1 rounded px-3 py-1.5 text-sm transition-colors",
              theme === o.value
                ? "bg-surface-2 font-medium text-text"
                : "text-text-2 hover:text-text",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
