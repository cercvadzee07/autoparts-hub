/**
 * Optional storefront photos. Drop files into public/images and restart:
 *   public/images/hero.jpg                 → homepage hero background
 *   public/images/categories/<slug>.jpg    → category card (e.g. lighting.jpg, engine.webp)
 * Any of .jpg / .jpeg / .png / .webp / .avif works. Without a photo the site
 * falls back to the built-in illustrations.
 */
const available: string[] = (() => {
  try {
    return JSON.parse(process.env.SITE_IMAGES ?? "[]") as string[];
  } catch {
    return [];
  }
})();

function find(base: string): string | null {
  return available.find((p) => p.replace(/\.[a-z]+$/i, "").toLowerCase() === base.toLowerCase()) ?? null;
}

export function heroImage(): string | null {
  return find("/images/hero");
}

export function categoryImage(slug: string): string | null {
  return find(`/images/categories/${slug}`);
}
