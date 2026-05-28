import { clsx } from "@/lib/clsx";

/** Loading placeholder: a muted surface block with a subtle pulse. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-surface-2",
        className,
      )}
      aria-hidden
    />
  );
}
