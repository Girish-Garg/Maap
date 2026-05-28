import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

/** Multi-line input matching the Input style (design.md §6.2). */
export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={textareaId} className="text-sm text-text-2">
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            "min-h-20 rounded border border-border-strong bg-surface px-3 py-2 text-base text-text",
            "placeholder:text-text-3 transition-colors duration-150",
            "focus:border-accent focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent",
            className,
          )}
          {...props}
        />
        {hint && <p className="text-xs text-text-3">{hint}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
