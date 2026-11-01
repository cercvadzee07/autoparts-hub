import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getAdminSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage({ params }: PageProps<"/[locale]/admin/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (await getAdminSession()) redirect(`/${locale}/admin`);
  const t = getDictionary(locale);
  return (
    <main id="main" className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="hero-glow absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
          <h1 className="mb-6 text-xl font-semibold">{t.admin.login.title}</h1>
          <LoginForm />
          {!isSupabaseConfigured() && <p className="mt-6 text-xs leading-relaxed text-subtle">{t.admin.login.demoHint}</p>}
        </div>
      </div>
    </main>
  );
}
