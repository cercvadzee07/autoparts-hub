"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { placeOrderAction } from "@/app/actions/shop";
import { useI18n } from "@/i18n/provider";
import type { Dictionary } from "@/i18n";
import type { FormState } from "@/lib/validation";
import { formatPrice, localized } from "@/lib/utils";
import { Field, fieldAria } from "@/components/ui/field";
import { buttonStyles, cardStyles, inputStyles, textareaStyles } from "@/components/ui/styles";
import { PartImage } from "@/components/shop/part-image";
import { cart, useCart } from "./cart-store";
import { useCartStatus } from "./use-cart-status";

export function messageFor(dict: Dictionary, key?: string): string | undefined {
  if (!key) return undefined;
  return (
    (dict.errors as Record<string, string>)[key] ??
    (dict.validation as Record<string, string>)[key] ??
    dict.errors.generic
  );
}

export function CheckoutForm() {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const { items } = useCart();
  const { unavailable } = useCartStatus(items);
  const [state, action, pending] = useActionState<FormState, FormData>(placeOrderAction, { ok: false });
  const orderable = items.filter((i) => !unavailable.includes(i.productId));
  const total = orderable.reduce((s, i) => s + i.price * i.quantity, 0);
  const err = (name: string) => (state.errors?.[name] ? messageFor(dict, state.errors[name]) : undefined);

  useEffect(() => {
    if (state.ok && state.data?.orderNumber) {
      cart.clear();
      router.replace(`/${locale}/checkout/success?n=${encodeURIComponent(state.data.orderNumber)}`);
    }
  }, [state, locale, router]);

  if (items.length === 0 && !state.ok) {
    return (
      <div className={`${cardStyles} px-6 py-16 text-center`}>
        <p className="text-muted">{dict.checkout.emptyCart}</p>
        <Link href={`/${locale}/catalog`} className={buttonStyles("primary", "md", "mt-6")}>
          {dict.cart.browse}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_380px]" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(orderable.map((i) => ({ productId: i.productId, quantity: i.quantity })))}
      />
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={`${cardStyles} space-y-5 p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold">{dict.checkout.contactDetails}</h2>
        {state.message && !state.ok && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {messageFor(dict, state.message)}
          </p>
        )}
        <Field id="customerName" label={dict.checkout.name} error={err("customerName")} required>
          <input
            {...fieldAria("customerName", err("customerName"))}
            name="customerName"
            defaultValue={state.data?.customerName}
            autoComplete="name"
            required
            maxLength={100}
            className={inputStyles}
          />
        </Field>
        <Field id="phone" label={dict.checkout.phone} hint={dict.checkout.phoneHint} error={err("phone")} required>
          <input
            {...fieldAria("phone", err("phone"), dict.checkout.phoneHint)}
            name="phone"
            defaultValue={state.data?.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+995 5XX XX XX XX"
            required
            maxLength={20}
            className={inputStyles}
          />
        </Field>
        <Field id="address" label={dict.checkout.address} hint={dict.checkout.addressHint} error={err("address")} required>
          <input
            {...fieldAria("address", err("address"), dict.checkout.addressHint)}
            name="address"
            defaultValue={state.data?.address}
            autoComplete="street-address"
            required
            maxLength={300}
            className={inputStyles}
          />
        </Field>
        <Field id="notes" label={dict.checkout.notes} hint={dict.checkout.notesHint} error={err("notes")} optionalLabel={dict.common.optional}>
          <textarea {...fieldAria("notes", err("notes"), dict.checkout.notesHint)} name="notes" defaultValue={state.data?.notes} rows={3} maxLength={1000} className={textareaStyles} />
        </Field>
      </div>

      <aside className={`${cardStyles} h-fit p-5 lg:sticky lg:top-24`}>
        <h2 className="mb-4 text-lg font-semibold">{dict.checkout.summary}</h2>
        <ul className="divide-y divide-line">
          {orderable.map((i) => (
            <li key={i.productId} className="flex gap-3 py-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                <PartImage src={i.image} alt="" sizes="56px" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{localized(i.title, locale)}</p>
                <p className="text-xs text-subtle">
                  {i.inventoryCode} · × {i.quantity}
                </p>
              </div>
              <p className="text-sm font-medium">{formatPrice(i.price * i.quantity, locale)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-4 text-base font-semibold">
          <span>{dict.cart.total}</span>
          <span className="font-display text-xl">{formatPrice(total, locale)}</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-subtle">{dict.checkout.paymentNote}</p>
        <button type="submit" disabled={pending || orderable.length === 0} className={buttonStyles("primary", "lg", "mt-5 w-full")}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
          {pending ? dict.checkout.submitting : dict.checkout.submit}
        </button>
      </aside>
    </form>
  );
}
