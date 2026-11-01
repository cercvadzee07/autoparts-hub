import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pagination that keeps the current query string. */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
  labels,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
  labels: { previous: string; next: string; page: string };
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const pages = visiblePages(page, pageCount);
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm transition-colors";

  return (
    <nav aria-label={labels.page} className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "border-line hover:border-line-strong")} aria-label={labels.previous}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "border-line opacity-40")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pages.map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-1 text-subtle">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "border-brand bg-brand text-white" : "border-line hover:border-line-strong")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(item, "border-line hover:border-line-strong")} aria-label={labels.next}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "border-line opacity-40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

function visiblePages(page: number, count: number): (number | null)[] {
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}
