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
    <nav aria-label={dict.nav.language} className={cn("flex items-center rounded-lg border border-line p-0.5", className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          title={localeNames[l]}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
            l === locale ? "bg-surface-3 text-text" : "text-subtle hover:text-text",
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
