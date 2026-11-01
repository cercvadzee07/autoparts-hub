"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { fmt } from "@/i18n";
import { useI18n } from "@/i18n/provider";

const MAX_EDGE = 1600;
const QUALITY = 0.85;

/** Downscale a phone photo in the browser before upload (keeps uploads small on mobile data). */
async function resize(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * File input for new product photos with previews. Selected files are resized
 * and written back into the real <input name="images"> so the form submits them.
 */
export function PhotoPicker({ max, error }: { max: number; error?: string }) {
  const { dict } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function sync(next: File[]) {
    setFiles(next);
    if (inputRef.current) {
      const dt = new DataTransfer();
      next.forEach((f) => dt.items.add(f));
      inputRef.current.files = dt.files;
    }
  }

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const picked = Array.from(list).slice(0, Math.max(0, max - files.length));
    const resized = await Promise.all(picked.map(resize));
    setBusy(false);
    sync([...files, ...resized]);
  }

  return (
    <div>
      {/* Hidden real input the form submits */}
      <input ref={inputRef} type="file" name="images" multiple accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} aria-hidden />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {previews.map((src, i) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview */}
            <img src={src} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => sync(files.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
              aria-label={dict.admin.productForm.removePhoto}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-surface-2 text-xs text-muted transition-colors hover:border-brand hover:text-text">
            {busy ? <Loader2 className="size-6 animate-spin" aria-hidden /> : <ImagePlus className="size-6 text-brand" aria-hidden />}
            <span className="px-2 text-center">{dict.admin.productForm.addPhotos}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                void onPick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {files.length > 0 && <p className="mt-2 text-xs text-muted">{fmt(dict.admin.productForm.newPhotos, { count: files.length })}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
