"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Send } from "lucide-react";
import { submitVinRequestAction } from "@/app/actions/shop";
import { useI18n } from "@/i18n/provider";
import type { FormState } from "@/lib/validation";
import { messageFor } from "@/components/cart/checkout-form";
import { Field, fieldAria } from "@/components/ui/field";
import { buttonStyles, cardStyles, inputStyles, textareaStyles } from "@/components/ui/styles";

export function VinForm() {
  const [round, setRound] = useState(0);
  return <VinFormInner key={round} onReset={() => setRound((r) => r + 1)} />;
}

function VinFormInner({ onReset }: { onReset: () => void }) {
  const { dict } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(submitVinRequestAction, { ok: false });
  const [fileName, setFileName] = useState<string | null>(null);
  const err = (name: string) => (state.errors?.[name] ? messageFor(dict, state.errors[name]) : undefined);
  const t = dict.vin;

  if (state.ok) {
    return (
      <div className={`${cardStyles} p-8 text-center sm:p-10`} role="status">
        <CheckCircle2 className="mx-auto mb-5 size-12 text-success" aria-hidden />
        <h2 className="text-xl font-semibold">{t.successTitle}</h2>
        <p className="mt-3 text-muted">{t.successText}</p>
        <button
          type="button"
          className={buttonStyles("outline", "md", "mt-6")}
          onClick={() => {
            onReset();
          }}
        >
          {t.another}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className={`${cardStyles} space-y-5 p-5 sm:p-7`} noValidate>
      {state.message && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {messageFor(dict, state.message)}
        </p>
      )}
      <div className="hidden" aria-hidden>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field id="vin" label={t.vin} hint={t.vinHint} error={err("vin")} required>
        <input
          {...fieldAria("vin", err("vin"), t.vinHint)}
          name="vin"
          defaultValue={state.data?.vin}
          required
          maxLength={20}
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="4T1B11HK5KU000000"
          className={`${inputStyles} font-mono uppercase tracking-wider`}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="vehicleModel" label={t.vehicleModel} error={err("vehicleModel")} required>
          <input
            {...fieldAria("vehicleModel", err("vehicleModel"))}
            name="vehicleModel"
            defaultValue={state.data?.vehicleModel}
            required
            maxLength={120}
            placeholder={t.vehicleModelPlaceholder}
            className={inputStyles}
          />
        </Field>
        <Field id="phone" label={t.phone} error={err("phone")} required>
          <input
            {...fieldAria("phone", err("phone"))}
            name="phone"
            defaultValue={state.data?.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            placeholder="+995 5XX XX XX XX"
            className={inputStyles}
          />
        </Field>
      </div>
      <Field id="partDescription" label={t.part} error={err("partDescription")} required>
        <textarea
          {...fieldAria("partDescription", err("partDescription"))}
          name="partDescription"
          defaultValue={state.data?.partDescription}
          required
          rows={3}
          maxLength={1000}
          placeholder={t.partPlaceholder}
          className={textareaStyles}
        />
      </Field>
      <Field id="customerName" label={t.name} error={err("customerName")} optionalLabel={dict.common.optional}>
        <input
          {...fieldAria("customerName", err("customerName"))}
          name="customerName"
          defaultValue={state.data?.customerName}
          autoComplete="name"
          maxLength={100}
          className={inputStyles}
        />
      </Field>
      <Field id="image" label={t.image} hint={t.imageHint} error={err("image")} optionalLabel={dict.common.optional}>
        <label
          htmlFor="image"
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-4 text-sm text-muted transition-colors hover:border-brand/60 hover:text-text"
        >
          <ImagePlus className="size-5 shrink-0 text-brand" aria-hidden />
          <span className="truncate">{fileName ?? t.image}</span>
        </label>
        <input
          {...fieldAria("image", err("image"), t.imageHint)}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
