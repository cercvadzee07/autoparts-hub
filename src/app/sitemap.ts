import type { MetadataRoute } from "next";
import { localeTags, locales, siteUrl } from "@/i18n/config";
import { getRepository } from "@/lib/data";

function entry(path: string, lastModified?: string, priority = 0.7): MetadataRoute.Sitemap[number][] {
  const languages = Object.fromEntries(locales.map((l) => [localeTags[l], `${siteUrl()}/${l}${path}`]));
  return locales.map((l) => ({
    url: `${siteUrl()}/${l}${path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    priority: l === "ka" ? priority : priority * 0.9,
    alternates: { languages },
  }));
}

/** Rebuilt hourly; new parts appear in the sitemap within an hour. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getRepository();
  const [products, categories] = await Promise.all([repo.getSitemapEntries(), repo.getCategories()]);
  return [
    ...entry("", undefined, 1),
    ...entry("/catalog", undefined, 0.9),
    ...entry("/vin-request", undefined, 0.6),
    ...entry("/about", undefined, 0.5),
    ...categories.flatMap((c) => entry(`/catalog?category=${c.slug}`, undefined, 0.8)),
    ...products.flatMap((p) => entry(`/parts/${p.slug}`, p.updatedAt, 0.7)),
  ];
}
