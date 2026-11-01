import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, Search } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { formatDate, telHref } from "@/lib/utils";
import { VinUpdateForm } from "@/components/admin/order-forms";
import { Badge, vinStatusTone } from "@/components/ui/badge";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

export default async function AdminVinRequestPage({ params }: PageProps<"/[locale]/admin/vin-requests/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const vin = /^[0-9a-f-]{36}$/i.test(id) ? await getRepository().getVinRequest(id) : null;
  if (!vin || (vin.storeId !== session.storeId && session.role !== "platform_admin")) notFound();
  const D = t.admin.vinDetail;
  const L = t.admin.vinList;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/admin/vin-requests`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden /> {t.admin.vinRequests}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{D.title}</h1>
          <Badge tone={vinStatusTone[vin.status]}>{t.vinStatus[vin.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{formatDate(vin.createdAt, locale, true)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className={`${cardStyles} space-y-5 p-5`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">{L.vin}</p>
            <p className="mt-1 select-all break-all font-mono text-xl font-semibold tracking-widest">{vin.vin}</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-subtle">{L.vehicle}</dt>
              <dd className="mt-1">{vin.vehicleModel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-subtle">{L.phone}</dt>
              <dd className="mt-1 font-mono">{vin.phone}{vin.customerName ? ` · ${vin.customerName}` : ""}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-subtle">{L.part}</dt>
              <dd className="mt-1 whitespace-pre-line">{vin.partDescription}</dd>
            </div>
          </dl>
          {vin.imageUrl && vin.imageUrl !== "attached" && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">{D.photo}</p>
              <a href={vin.imageUrl} target="_blank" rel="noopener noreferrer" className="block w-fit overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL */}
                <img src={vin.imageUrl} alt={vin.partDescription} className="max-h-80 w-auto" />
              </a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-5 sm:flex">
            <a href={telHref(vin.phone)} className={buttonStyles("primary", "md")}>
              <Phone className="size-4" aria-hidden /> {D.call}
            </a>
            <a href={`https://wa.me/${vin.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={buttonStyles("outline", "md")}>
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </a>
            <Link href={`/${locale}/admin/products?q=${encodeURIComponent(vin.partDescription.split(/\s+/).slice(0, 2).join(" "))}`} className={buttonStyles("ghost", "md", "col-span-2")}>
              <Search className="size-4" aria-hidden /> {D.searchCatalog}
            </Link>
          </div>
        </section>
        <section className={`${cardStyles} h-fit p-5`}>
          <VinUpdateForm id={vin.id} status={vin.status} adminNotes={vin.adminNotes} />
        </section>
      </div>
    </div>
  );
}
