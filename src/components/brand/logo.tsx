import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Brand mark. Replace the SVG to change the logo everywhere. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="10" fill="var(--brand)" />
        <path d="M6 31h28" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <text
          x="20"
          y="25.5"
          textAnchor="middle"
          fontSize="15"
          fontWeight="800"
          fill="#fff"
          fontFamily="var(--font-display-latin), Inter, sans-serif"
          letterSpacing="-0.5"
        >
          {brand.monogram}
        </text>
      </svg>
      {!compact && (
        <span className="font-display text-[17px] font-semibold tracking-tight leading-none">
          {brand.shortName}
          <span className="text-brand">.</span>
          <span className="text-muted font-medium">{brand.name.replace(brand.shortName, "").trim()}</span>
        </span>
      )}
    </span>
  );
}
