import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border bg-raised text-text hover:border-text",
  ghost: "text-accent hover:bg-surface-tint",
  danger: "bg-danger text-raised hover:opacity-90",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-ui-sm font-semibold",
  md: "h-10 px-5 text-ui font-semibold",
  lg: "h-12 px-6 text-ui font-semibold",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(
    "press inline-flex shrink-0 items-center justify-center gap-2 rounded-pill",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode };

export function Button({ variant, size, loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function iconButtonClass(className?: string) {
  return cx("press grid size-11 shrink-0 place-items-center rounded-full text-text hover:bg-surface-tint md:size-9", className);
}

export function IconButton({ label, className, children, ...rest }: ComponentProps<"button"> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={iconButtonClass(className)} {...rest}>
      {children}
    </button>
  );
}
