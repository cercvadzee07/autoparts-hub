import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Phone } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { fmt, getDictionary } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { TERMINAL_ORDER_STATUSES } from "@/lib/data/shared";
import { formatDate, formatPrice, telHref } from "@/lib/utils";
import { OrderNoteForm, OrderStatusForm } from "@/components/admin/order-forms";
import { Badge, orderStatusTone } from "@/components/ui/badge";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

export default async function AdminOrderPage({ params }: PageProps<"/[locale]/admin/orders/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const session = await requireAdmin(locale);
  const t = getDictionary(locale);
  const order = /^[0-9a-f-]{36}$/i.test(id) ? await getRepository().getOrder(id) : null;
  if (!order || (order.storeId !== session.storeId && session.role !== "platform_admin")) notFound();
  const D = t.admin.orderDetail;
  const terminal = TERMINAL_ORDER_STATUSES.includes(order.status);
  const whatsapp = order.phone.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/admin/orders`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden /> {t.admin.orders}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{fmt(D.title, { number: order.orderNumber })}</h1>
          <Badge tone={orderStatusTone[order.status]}>{t.orderStatus[order.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {D.placed}: {formatDate(order.createdAt, locale, true)} · {order.locale.toUpperCase()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className={`${cardStyles} p-5`}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-subtle">{D.customer}</h2>
            <p className="text-lg font-semibold">{order.customerName}</p>
            <p className="mt-1 font-mono text-muted">{order.phone}</p>
            <p className="mt-3 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {order.address}
            </p>
            {order.customerNotes && (
              <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-subtle">{D.customerNotes}</p>
                <p className="whitespace-pre-line">{order.customerNotes}</p>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
              <a href={telHref(order.phone)} className={buttonStyles("primary", "md")}>
                <Phone className="size-4" aria-hidden /> {D.call}
              </a>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={buttonStyles("outline", "md")}>
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </div>
          </section>

          <section className={`${cardStyles} overflow-hidden`}>
            <h2 className="border-b border-line px-5 py-4 text-sm font-semibold uppercase tracking-wider text-subtle">{D.items}</h2>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    {i.productId ? (
                      <Link href={`/${locale}/admin/products/${i.productId}`} className="line-clamp-2 text-sm font-medium hover:text-brand">
                        {i.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{i.title}</p>
                    )}
                    <p className="font-mono text-xs text-subtle">{i.inventoryCode} · × {i.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(i.unitPrice * i.quantity, locale)}</p>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-line px-5 py-4 font-semibold">
              <span>{t.cart.total}</span>
              <span className="font-display text-lg">{formatPrice(order.total, locale)}</span>
            </div>
          </section>

          <section className={`${cardStyles} p-5`}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-subtle">{D.internalNotes}</h2>
            {order.notes.length === 0 ? (
              <p className="mb-4 text-sm text-muted">{D.noNotes}</p>
            ) : (
              <ul className="mb-4 space-y-3">
                {order.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="mt-1.5 text-xs text-subtle">
                      {n.author} · {formatDate(n.createdAt, locale, true)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <OrderNoteForm orderId={order.id} />
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${cardStyles} p-5`}>
            {terminal ? <p className="text-sm text-muted">{D.terminal}</p> : <OrderStatusForm orderId={order.id} status={order.status} />}
          </section>
          <section className={`${cardStyles} p-5`}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-subtle">{D.history}</h2>
            <ol className="relative space-y-4 border-l border-line pl-5">
              {order.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-bg bg-brand" aria-hidden />
                  <p className="text-sm font-medium">{t.orderStatus[h.toStatus]}</p>
                  {h.note && <p className="text-sm text-muted">{h.note}</p>}
                  <p className="text-xs text-subtle">
                    {formatDate(h.createdAt, locale, true)}{h.author ? ` · ${h.author}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
