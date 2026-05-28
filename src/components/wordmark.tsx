import { clsx } from "@/lib/clsx";

/**
 * The Maap wordmark (design.md §2.2): lowercase "maap" in Satoshi Bold.
 * The "double a" is the visual signature - tracked ~-2% so the two a's read
 * almost as a ligature. No icon; the wordmark is the mark for v1.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "select-none font-sans font-bold lowercase text-text",
        className,
      )}
      style={{ letterSpacing: "-0.02em" }}
    >
      maap
    </span>
  );
}
