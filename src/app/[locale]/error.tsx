"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { buttonStyles } from "@/components/ui/styles";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { locale, dict } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <AlertTriangle className="size-12 text-brand" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">{dict.common.somethingWrong}</h1>
      <p className="mt-2 max-w-md text-muted">{dict.common.somethingWrongText}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-subtle">#{error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={buttonStyles("primary")}>{dict.common.tryAgain}</button>
        <a href={`/${locale}`} className={buttonStyles("outline")}>{dict.common.goHome}</a>
      </div>
    </main>
  );
}
