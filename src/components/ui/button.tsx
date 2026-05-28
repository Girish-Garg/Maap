import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Button (design.md §6.1). Three variants, no others. One primary per screen.
 * Heights: 48px on mobile, 40px on desktop. Touch target stays >= 44px even for
 * ghost via min-height, satisfying §10.1.
 */
type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded font-medium text-sm md:text-base " +
  "transition-colors duration-150 ease-entrance disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover h-12 md:h-10 px-5",
  secondary:
    "bg-surface border border-border-strong text-text hover:bg-surface-2 h-12 md:h-10 px-5",
  ghost: "bg-transparent text-text-2 hover:bg-surface-2 min-h-11 h-10 px-3",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={clsx(base, variants[variant], fullWidth && "w-full", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
