import "server-only";
import { DomainError, type UploadedFile } from "@/lib/types";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 12;

const SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/png",
    ext: "png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/**
 * Reads an uploaded File and verifies it is a real JPEG/PNG/WebP by its magic
 * bytes (the browser-supplied MIME type is not trusted). SVG is rejected on
 * purpose: it can carry scripts.
 */
export async function readImageFile(file: File): Promise<UploadedFile & { ext: string }> {
  if (file.size === 0) throw new DomainError("INVALID_FILE", "empty");
  if (file.size > MAX_IMAGE_BYTES) throw new DomainError("INVALID_FILE", "too_large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig) throw new DomainError("INVALID_FILE", "type");
  return { name: file.name, type: sig.type, ext: sig.ext, bytes };
}

export function extensionFor(type: string): string {
  return SIGNATURES.find((s) => s.type === type)?.ext ?? "bin";
}

/** Collects non-empty File entries from a FormData field. */
export function filesFrom(form: FormData, field: string): File[] {
  return form
    .getAll(field)
    .filter((v): v is File => typeof v === "object" && v !== null && "size" in v && (v as File).size > 0);
}
