import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Noto_Sans_Georgian } from "next/font/google";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { isLocale, localeTags, locales, siteUrl } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { I18nProvider } from "@/i18n/provider";
import { ToastProvider } from "@/components/ui/toast";
import { alternates } from "@/lib/seo";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin", "cyrillic"], variable: "--font-display-latin", display: "swap" });
const georgian = Noto_Sans_Georgian({ subsets: ["georgian"], variable: "--font-georgian", display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${t.meta.title} | ${brand.name}`, template: `%s | ${brand.name}` },
    description: t.meta.description,
    applicationName: brand.name,
    alternates: alternates(locale, ""),
    openGraph: {
      type: "website",
      siteName: brand.name,
      locale: localeTags[locale].replace("-", "_"),
      title: t.meta.title,
      description: t.meta.description,
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${interTight.variable} ${georgian.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <I18nProvider locale={locale} dict={dict}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
