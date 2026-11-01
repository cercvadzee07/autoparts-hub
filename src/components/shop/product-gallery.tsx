"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { fmt } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PartImage } from "./part-image";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const { dict } = useI18n();
  const list = images.length ? images : [{ id: "placeholder", url: "/parts/generic.svg", path: null, sortOrder: 0 }];
  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, list.length - 1)];
  const go = (d: number) => setIndex((i) => (i + d + list.length) % list.length);

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-[radial-gradient(circle_at_50%_40%,#222228,#111114_70%)]"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        <PartImage
          key={current.id}
          src={current.url}
          alt={`${title} — ${fmt(dict.product.photos, { index: index + 1, total: list.length })}`}
          sizes="(min-width: 1024px) 55vw, 100vw"
          priority={index === 0}
        />
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
              aria-label={dict.common.previous}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
              aria-label={dict.common.next}
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur" aria-live="polite">
              {index + 1} / {list.length}
            </span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {list.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={fmt(dict.product.photos, { index: i + 1, total: list.length })}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-lg border bg-surface-2 transition",
                  i === index ? "border-brand ring-1 ring-brand" : "border-line opacity-70 hover:opacity-100",
                )}
              >
                <PartImage src={img.url} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
