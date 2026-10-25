import type { ComponentProps, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cx } from "@/lib/cx";

const control =
  "w-full rounded-xs border border-border-input bg-raised px-3 text-ui text-text placeholder:text-text-muted " +
  "focus:border-accent disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-text-muted " +
  "aria-invalid:border-danger";

export function Field({ id, label, hint, error, children, className }: { id: string; label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-ui-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-caption text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string | null, hint?: unknown) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(control, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "py-2.5", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx(control, "h-10", className)} {...rest} />;
}
