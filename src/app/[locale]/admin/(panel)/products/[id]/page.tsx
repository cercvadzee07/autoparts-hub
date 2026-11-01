import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Star, Trash2, X } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { deleteProductAction, removeProductImageAction, setCoverImageAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/files";
import { first } from "@/lib/search-params";
import { formatDate, localized } from "@/lib/utils";
import { ProductForm } from "@/components/admin/product-form";
import { FlashToast } from "@/components/admin/flash-toast";
import { Badge, productStatusTone } from "@/components/ui/badge";
import { buttonStyles, cardStyles } from "@/components/ui/styles";
import { SubmitButton } from "@/components/ui/submit-button";
import { PartImage } from "@/components/shop/part-image";

export default async function EditProductPage({ params, searchParams }: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const repo = getRepository();
  const product = /^[0-9a-f-]{36}$/i.test(id) ? await repo.getProductById(id) : null;
  if (!product || (product.storeId !== session.storeId && session.role !== "platform_admin")) notFound();
  const [categories, vehicles, history] = await Promise.all([
    repo.getCategories(),
    repo.getVehicleTree(),
    repo.getInventoryHistory(product.id),
  ]);
  const realImages = product.images.filter((i) => i.path);
  const F = t.admin.productForm;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <FlashToast show={first(await searchParams, "created") === "1"} message={F.created} />
      <div>
        <Link href={`/${locale}/admin/products`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden /> {t.admin.products}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{F.editTitle}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="font-mono">{F.inventoryId}: {product.inventoryCode}</span>
              <Badge tone={productStatusTone[product.status]}>{t.productStatus[product.status]}</Badge>
            </p>
          </div>
          {["available", "reserved", "sold"].includes(product.status) && (
            <Link href={`/${locale}/parts/${product.slug}`} target="_blank" className={buttonStyles("outline", "sm")}>
              <ExternalLink className="size-4" aria-hidden /> {F.viewOnSite}
            </Link>
          )}
        </div>
      </div>

      {product.images.length > 0 && (
        <section className={`${cardStyles} p-5 sm:p-6`} aria-label={F.photos}>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {product.images.map((img, i) => (
              <li key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-3">
                <PartImage src={img.url} alt={localized(product.title, locale)} sizes="160px" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{F.cover}</span>
                )}
                {img.path && (
                  <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
                    {i > 0 ? (
                      <form action={setCoverImageAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="imageId" value={img.id} />
                        <SubmitButton className="rounded-md bg-black/70 p-1.5 text-white hover:bg-black" aria-label={F.makeCover} title={F.makeCover}>
                          <Star className="size-3.5" />
                        </SubmitButton>
                      </form>
                    ) : (
                      <span />
                    )}
                    <form action={removeProductImageAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="imageId" value={img.id} />
                      <SubmitButton className="rounded-md bg-black/70 p-1.5 text-white hover:bg-red-600" aria-label={F.removePhoto} title={F.removePhoto}>
                        <X className="size-3.5" />
                      </SubmitButton>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductForm
        product={product}
        categories={categories}
        vehicles={vehicles}
        photoSlots={Math.max(0, MAX_IMAGES_PER_PRODUCT - realImages.length)}
      />

      <section className={`${cardStyles} overflow-hidden`}>
        <h2 className="border-b border-line px-5 py-4 text-base font-semibold">{F.history}</h2>
        {history.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">{F.noHistory}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{t.admin.activity[h.action] ?? h.action}</p>
                  {(h.note || h.author) && (
                    <p className="text-xs text-muted">{[h.note, h.author].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-subtle" dateTime={h.createdAt}>{formatDate(h.createdAt, locale, true)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={deleteProductAction} className="flex justify-end">
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="locale" value={locale} />
        <SubmitButton className={buttonStyles("danger", "md")} confirmMessage={t.admin.productList.confirmDelete}>
          <Trash2 className="size-4" aria-hidden /> {t.common.delete}
        </SubmitButton>
      </form>
    </div>
  );
}
