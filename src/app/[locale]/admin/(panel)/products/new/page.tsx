import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/files";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage({ params }: PageProps<"/[locale]/admin/products/new">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireAdmin(locale);
  const t = getDictionary(locale);
  const repo = getRepository();
  const [categories, vehicles] = await Promise.all([repo.getCategories(), repo.getVehicleTree()]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/${locale}/admin/products`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {t.admin.products}
      </Link>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.admin.productForm.newTitle}</h1>
      <ProductForm product={null} categories={categories} vehicles={vehicles} photoSlots={MAX_IMAGES_PER_PRODUCT} />
    </div>
  );
}
