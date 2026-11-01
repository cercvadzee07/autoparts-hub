import type { Locale } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import ka from "./dictionaries/ka";
import ru from "./dictionaries/ru";

const dictionaries: Record<Locale, Dictionary> = { ka, en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.ka;
}

/** Replaces `{name}` placeholders: fmt("Page {page}", { page: 2 }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export type { Dictionary };
