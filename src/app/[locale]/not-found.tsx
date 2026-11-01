"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { buttonStyles } from "@/components/ui/styles";

export default function NotFound() {
  const { locale, dict } = useI18n();
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-display text-7xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{dict.common.notFound}</h1>
      <p className="mt-2 max-w-md text-muted">{dict.common.notFoundText}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}`} className={buttonStyles("primary")}>{dict.common.goHome}</Link>
        <Link href={`/${locale}/catalog`} className={buttonStyles("outline")}>{dict.nav.catalog}</Link>
      </div>
    </main>
  );
}
