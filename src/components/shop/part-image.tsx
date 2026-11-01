import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Product photo. Supabase Storage photos go through the Next.js image
 * optimizer; local placeholders (SVG) and demo uploads are served as-is.
 */
export function PartImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const unoptimized = src.endsWith(".svg") || src.startsWith("/api/uploads/");
  const placeholder = src.startsWith("/parts/");
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={cn(placeholder ? "object-contain p-[12%]" : "object-cover", className)}
    />
  );
}
