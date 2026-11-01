import { useId } from "react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Gear outline path with `teeth` square-ish teeth around (cx, cy). */
function gearPath(cx: number, cy: number, inner: number, outer: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners = [
      [inner, a - step * 0.5],
      [inner, a - step * 0.22],
      [outer, a - step * 0.16],
      [outer, a + step * 0.16],
      [inner, a + step * 0.22],
    ];
    for (const [r, ang] of corners) pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}

const GEAR = gearPath(30, 34, 22, 28, 12);

/** The mark alone: a silver gear with a red car-roof swoosh. */
export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a gradient defined inside a hidden (display:none) copy can't be referenced.
  const gradient = `logo-metal-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f5" />
          <stop offset=".55" stopColor="#a1a1aa" />
          <stop offset="1" stopColor="#52525b" />
        </linearGradient>
      </defs>
      <path d={GEAR} fill={`url(#${gradient})`} />
      <circle cx="30" cy="34" r="15" fill="var(--bg)" />
      {/* Car roof swoosh */}
      <path d="M8 30 C 18 14, 40 8, 62 20 C 44 15, 26 18, 14 30 Z" fill="var(--brand)" />
      <path d="M20 26 C 30 20, 44 18, 56 21" stroke="#e4e4e7" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".8" />
      <path d="M17 41 L23 41 M37 41 L43 41" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 38 C 22 33, 38 33, 44 38" stroke="#d4d4d8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full logo: mark + two-tone wordmark + tagline.
 * `compact` hides the tagline (mobile header); `markOnly` shows just the icon.
 */
export function Logo({ className, compact = false, markOnly = false }: { className?: string; compact?: boolean; markOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("shrink-0", compact || markOnly ? "size-10" : "size-14")} />
      {!markOnly && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display font-extrabold italic tracking-tight", compact ? "text-xl" : "text-[28px]")}>
            {brand.wordmark.main}
            <span className="text-brand"> {brand.wordmark.accent}</span>
          </span>
          {!compact && (
            <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted">{brand.tagline}</span>
          )}
        </span>
      )}
    </span>
  );
}
