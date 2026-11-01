import { promises as fs } from "node:fs";
import path from "node:path";
import { getAdminSession } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/data/demo-repository";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves demo-mode uploads from .data/uploads. VIN attachments are staff-only. */
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[...path]">) {
  const { path: parts } = await ctx.params;
  if (!parts.every((p) => /^[\w.-]+$/.test(p) && p !== ".." && p !== ".")) {
    return new Response("Not found", { status: 404 });
  }
  if (parts[0] === "vin" && !(await getAdminSession())) {
    return new Response("Forbidden", { status: 403 });
  }
  const abs = path.join(UPLOAD_DIR, ...parts);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(abs).slice(1).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(abs);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": parts[0] === "vin" ? "private, no-store" : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
