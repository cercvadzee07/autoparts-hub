import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover shadow-[0_8px_24px_-12px_var(--brand)]",
  secondary: "bg-surface-3 text-text hover:bg-line-strong",
  outline: "border border-line-strong text-text hover:border-muted hover:bg-surface-2",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-transparent border border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
  icon: "h-10 w-10",
};

/** Shared button classes — usable on <button> and <Link>. */
export function buttonStyles(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap select-none",
    "transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export const inputStyles = cn(
  "block w-full rounded-lg border border-line bg-surface-2 px-3.5 h-11 text-sm text-text",
  "placeholder:text-subtle transition-colors",
  "hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
  "aria-[invalid=true]:border-red-500/70",
);

export const textareaStyles = cn(inputStyles, "h-auto min-h-28 py-3 leading-relaxed");

export const labelStyles = "block text-sm font-medium text-text mb-1.5";

export const cardStyles = "rounded-2xl border border-line bg-surface";

export const sectionTitle = "font-display text-2xl sm:text-3xl font-semibold tracking-tight";
