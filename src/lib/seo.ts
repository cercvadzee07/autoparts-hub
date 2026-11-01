import type { Metadata } from "next";
import { localeTags, locales, siteUrl, type Locale } from "@/i18n/config";

/** Canonical + hreflang alternates for a path that exists in every locale. */
export function alternates(locale: Locale, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeTags[l]] = `${siteUrl()}/${l}${path}`;
  languages["x-default"] = `${siteUrl()}/ka${path}`;
  return { canonical: `${siteUrl()}/${locale}${path}`, languages };
}

/** Serializes JSON-LD safely for a <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
