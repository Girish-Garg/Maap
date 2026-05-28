/**
 * Minimal class-name joiner: drops falsy values and joins the rest.
 * Kept dependency-free for v1; swap for clsx + tailwind-merge if class
 * conflict resolution becomes necessary.
 */
export type ClassValue = string | number | false | null | undefined;

export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
