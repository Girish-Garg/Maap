import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Button (design.md §6.1). Three variants, no others. One primary per screen.
 * Heights: 48px on mobile, 40px on desktop. Touch target stays >= 44px even for
 * ghost via min-height, satisfying §10.1. A `loading` prop swaps the content
 * for a spinner so async actions read clearly.
 */
type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded font-medium text-sm md:text-base " +
  // Snappier feel: short transitions + slight press scale on active.
  "transition-[background-color,color,transform,box-shadow] duration-150 ease-entrance " +
  "active:scale-[0.98] " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover h-12 md:h-10 px-5",
  secondary:
    "bg-surface border border-border-strong text-text hover:bg-surface-2 h-12 md:h-10 px-5",
  ghost: "bg-transparent text-text-2 hover:bg-surface-2 min-h-11 h-10 px-3",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  /** Replace the icon area with a spinner and disable the button. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      fullWidth,
      loading,
      disabled,
      className,
      type = "button",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], fullWidth && "w-full", className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
