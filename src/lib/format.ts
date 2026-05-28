/**
 * Display formatting. Numbers are rendered tabular in JetBrains Mono at the call
 * site; these helpers handle locale grouping and the rupee convention from
 * design.md §4.3: the ₹ sign precedes the number with a thin space.
 */

const THIN_SPACE = " ";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** "₹ 12,400" - Indian digit grouping, no paise, thin space after the sign. */
export function formatINR(amount: number): string {
  return `₹${THIN_SPACE}${inr.format(Math.round(amount))}`;
}

/** Cubic feet to four decimals, e.g. "1.4200". */
export function formatCFT(cft: number): string {
  return cft.toFixed(4);
}

/** "24 May 2026" from an ISO date (YYYY-MM-DD), locale-stable. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "24 May, 18:32" from a full ISO timestamp - for snapshot history rows. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
