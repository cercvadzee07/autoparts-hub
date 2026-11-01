import { cn } from "@/lib/utils";
import type { OrderStatus, ProductCondition, ProductStatus, VinStatus } from "@/lib/types";

type Tone = "neutral" | "brand" | "success" | "warning" | "info" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted border-line-strong",
  brand: "bg-brand-soft text-red-300 border-brand/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  info: "bg-sky-500/10 text-sky-300 border-sky-500/25",
  danger: "bg-red-500/10 text-red-300 border-red-500/25",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const productStatusTone: Record<ProductStatus, Tone> = {
  draft: "neutral",
  available: "success",
  reserved: "warning",
  sold: "danger",
  archived: "neutral",
};

export const conditionTone: Record<ProductCondition, Tone> = {
  new: "info",
  like_new: "success",
  used: "neutral",
  damaged: "warning",
};

export const orderStatusTone: Record<OrderStatus, Tone> = {
  new: "brand",
  awaiting_confirmation: "warning",
  confirmed: "info",
  processing: "info",
  completed: "success",
  cancelled: "neutral",
};

export const vinStatusTone: Record<VinStatus, Tone> = {
  new: "brand",
  in_progress: "warning",
  answered: "success",
  closed: "neutral",
};
