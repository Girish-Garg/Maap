import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

/**
 * Input (design.md §6.2). Outlined, 48px mobile / 40px desktop, static label
 * above (never floating), optional hint or error below. Numeric inputs render
 * in JetBrains Mono via the `numeric` flag (§4.3).
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Render the value in tabular mono (for quantities, prices, dimensions). */
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, numeric, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedById = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm text-text-2">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={clsx(
            "h-12 md:h-10 rounded border bg-surface px-3 text-base text-text",
            "placeholder:text-text-3 transition-colors duration-150",
            "focus:border-accent focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent",
            error ? "border-error" : "border-border-strong",
            numeric && "font-mono",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-error">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-text-3">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
