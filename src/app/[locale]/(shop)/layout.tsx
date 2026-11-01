import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { getRepository } from "@/lib/data";
import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";

export default async function ShopLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Inventory changes constantly (items get reserved/sold): always render with live data.
  await connection();
  const categories = await getRepository().getCategories();
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer locale={locale} categories={categories} />
    </>
  );
}
