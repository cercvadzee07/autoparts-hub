"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { localeNames, locales } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

function Switcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  const hrefFor = (l: string) => {
    const parts = pathname.split("/");
    parts[1] = l;
    return parts.join("/") + (search ? `?${search}` : "");
  };

  return (
    <nav aria-label={dict.nav.language} className={cn("flex items-center gap-1.5", className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          title={localeNames[l]}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
            l === locale
              ? "border-brand bg-brand text-white"
              : "border-line-strong bg-surface-2 text-muted hover:border-muted hover:text-text",
          )}
        >
          {l === "ka" ? "ქარ" : l === "ru" ? "Рус" : "Eng"}
        </Link>
      ))}
    </nav>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<div className={cn("h-8 w-[132px]", className)} />}>
      <Switcher className={className} />
    </Suspense>
  );
}
