"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { AlertCircle, Languages, Plus, Save, Trash2 } from "lucide-react";
import { saveProductAction } from "@/app/actions/admin";
import { useI18n } from "@/i18n/provider";
import { PRODUCT_CONDITIONS, PRODUCT_STATUSES, type Category, type Product, type VehicleMake } from "@/lib/types";
import type { FormState } from "@/lib/validation";
import { localized } from "@/lib/utils";
import { Field, fieldAria } from "@/components/ui/field";
import { buttonStyles, cardStyles, inputStyles, labelStyles, textareaStyles } from "@/components/ui/styles";
import { useToast } from "@/components/ui/toast";
import { PhotoPicker } from "./photo-picker";

type FitRow = { key: number; generationId: string; yearFrom: number; yearTo: number };

export function ProductForm({
  product,
  categories,
  vehicles,
  photoSlots,
}: {
  product: Product | null;
  categories: Category[];
  vehicles: VehicleMake[];
  photoSlots: number;
}) {
  const { locale, dict } = useI18n();
  const toast = useToast();
  const t = dict.admin.productForm;
  const [state, dispatch, pending] = useActionState<FormState, FormData>(saveProductAction, { ok: false });

  const generations = vehicles.flatMap((make) =>
    make.models.flatMap((model) => model.generations.map((g) => ({ ...g, label: `${make.name} ${g.name} (${g.yearFrom}–${g.yearTo ?? ""})` }))),
  );
  const thisYear = new Date().getFullYear();
  const defaultGen = generations.find((g) => g.slug === "camry-xv70") ?? generations[0];
  const [rows, setRows] = useState<FitRow[]>(() =>
    product?.compatibility.length
      ? product.compatibility.map((c, i) => ({ key: i, generationId: c.generationId, yearFrom: c.yearFrom, yearTo: c.yearTo }))
      : defaultGen
        ? [{ key: 0, generationId: defaultGen.id, yearFrom: defaultGen.yearFrom, yearTo: defaultGen.yearTo ?? thisYear }]
        : [],
  );
  const [showTranslations, setShowTranslations] = useState(Boolean(product?.title.en || product?.title.ru));

  useEffect(() => {
    if (state.ok && state.message === "saved") toast(t.saved);
    if (!state.ok && state.message === "error") toast(dict.admin.toast.error, "error");
  }, [state, toast, t.saved, dict.admin.toast.error]);

  const err = (k: string) => {
    const key = state.errors?.[k];
    return key ? ((dict.validation as Record<string, string>)[key] ?? dict.validation.required) : undefined;
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Dispatching manually (instead of <form action>) keeps the typed values on validation errors.
    startTransition(() => dispatch(fd));
  }

  const updateRow = (key: number, patch: Partial<FitRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate encType="multipart/form-data">
      <input type="hidden" name="locale" value={locale} />
      {product && <input type="hidden" name="id" value={product.id} />}
      <input
        type="hidden"
        name="compatibility"
        value={JSON.stringify(rows.map(({ generationId, yearFrom, yearTo }) => ({ generationId, yearFrom, yearTo })))}
      />

      {state.message === "fixErrors" && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="size-4 shrink-0" aria-hidden /> {dict.validation.fixErrors}
        </p>
      )}

      {/* ── Photos ── */}
      <section className={`${cardStyles} p-5 sm:p-6`}>
        <h2 className="text-base font-semibold">{t.photos}</h2>
        <p className="mb-4 mt-1 text-xs text-muted">{t.photosHint}</p>
        <PhotoPicker key={state.data?.savedAt ?? "initial"} max={photoSlots} error={err("images")} />
      </section>

      {/* ── Basics ── */}
      <section className={`${cardStyles} space-y-5 p-5 sm:p-6`}>
        <h2 className="text-base font-semibold">{t.basics}</h2>
        <Field id="titleKa" label={t.titleKa} error={err("titleKa")} required>
          <input {...fieldAria("titleKa", err("titleKa"))} name="titleKa" defaultValue={product?.title.ka} maxLength={200} className={inputStyles} />
        </Field>
        <Field id="descriptionKa" label={t.descriptionKa} error={err("descriptionKa")}>
          <textarea {...fieldAria("descriptionKa", err("descriptionKa"))} name="descriptionKa" defaultValue={product?.description.ka} rows={4} maxLength={5000} className={textareaStyles} />
        </Field>

        <div className="rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setShowTranslations((v) => !v)}
            aria-expanded={showTranslations}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <Languages className="size-4 text-brand" aria-hidden />
            English / Русский
            <span className="ml-auto text-xs text-subtle">{showTranslations ? "−" : "+"}</span>
          </button>
          {/* Kept mounted (just hidden) so values are always submitted. */}
          <div className={showTranslations ? "space-y-5 border-t border-line p-4" : "hidden"}>
            <p className="text-xs text-muted">{t.translationsHint}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="titleEn" label={t.titleEn} error={err("titleEn")}>
                <input {...fieldAria("titleEn", err("titleEn"))} name="titleEn" defaultValue={product?.title.en} maxLength={200} className={inputStyles} />
              </Field>
              <Field id="titleRu" label={t.titleRu} error={err("titleRu")}>
                <input {...fieldAria("titleRu", err("titleRu"))} name="titleRu" defaultValue={product?.title.ru} maxLength={200} className={inputStyles} />
              </Field>
              <Field id="descriptionEn" label={t.descriptionEn} error={err("descriptionEn")}>
                <textarea {...fieldAria("descriptionEn", err("descriptionEn"))} name="descriptionEn" defaultValue={product?.description.en} rows={4} maxLength={5000} className={textareaStyles} />
              </Field>
              <Field id="descriptionRu" label={t.descriptionRu} error={err("descriptionRu")}>
                <textarea {...fieldAria("descriptionRu", err("descriptionRu"))} name="descriptionRu" defaultValue={product?.description.ru} rows={4} maxLength={5000} className={textareaStyles} />
              </Field>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field id="categoryId" label={t.category} error={err("categoryId")} required>
            <select {...fieldAria("categoryId", err("categoryId"))} name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputStyles}>
              <option value="" disabled>{t.selectCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{localized(c.name, locale)}</option>
              ))}
            </select>
          </Field>
          <Field id="condition" label={t.condition}>
            <select id="condition" name="condition" defaultValue={product?.condition ?? "used"} className={inputStyles}>
              {PRODUCT_CONDITIONS.map((c) => (
                <option key={c} value={c}>{dict.conditions[c]}</option>
              ))}
            </select>
          </Field>
          <Field id="status" label={t.status}>
            <select id="status" name="status" defaultValue={product?.status ?? "available"} className={inputStyles}>
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>{dict.productStatus[s]}</option>
              ))}
            </select>
          </Field>
          <Field id="price" label={t.price} error={err("price")} required>
            <input
              {...fieldAria("price", err("price"))}
              name="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={product?.price}
              className={`${inputStyles} text-lg font-semibold`}
            />
          </Field>
          <Field id="quantity" label={t.quantity} error={err("quantity")}>
            <input {...fieldAria("quantity", err("quantity"))} name="quantity" type="number" inputMode="numeric" min={0} defaultValue={product?.quantity ?? 1} className={inputStyles} />
          </Field>
          <Field id="oemNumber" label={t.oem} error={err("oemNumber")} optionalLabel={dict.common.optional}>
            <input
              {...fieldAria("oemNumber", err("oemNumber"))}
              name="oemNumber"
              defaultValue={product?.oemNumber ?? ""}
              maxLength={60}
              autoCapitalize="characters"
              className={`${inputStyles} font-mono uppercase`}
            />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="featured" defaultChecked={product?.featured} className="size-5 rounded accent-[var(--brand)]" />
          {t.featured}
        </label>
      </section>

      {/* ── Fitment ── */}
      <section className={`${cardStyles} space-y-4 p-5 sm:p-6`}>
        <div>
          <h2 className="text-base font-semibold">{t.fitment}</h2>
          <p className="mt-1 text-xs text-muted">{t.fitmentHint}</p>
          {err("compatibility") && <p role="alert" className="mt-1.5 text-xs text-red-400">{err("compatibility")}</p>}
        </div>
        {rows.map((row) => {
          const g = generations.find((x) => x.id === row.generationId);
          return (
            <div key={row.key} className="grid gap-3 rounded-xl border border-line bg-surface-2/40 p-3 sm:grid-cols-[1fr_110px_110px_auto] sm:items-end">
              <label>
                <span className={labelStyles}>{t.generation}</span>
                <select
                  className={inputStyles}
                  value={row.generationId}
                  onChange={(e) => {
                    const ng = generations.find((x) => x.id === e.target.value);
                    updateRow(row.key, { generationId: e.target.value, yearFrom: ng?.yearFrom ?? row.yearFrom, yearTo: ng?.yearTo ?? thisYear });
                  }}
                >
                  {generations.map((x) => (
                    <option key={x.id} value={x.id}>{x.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelStyles}>{t.yearFrom}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputStyles}
                  value={row.yearFrom}
                  min={g?.yearFrom ?? 1950}
                  max={thisYear + 1}
                  onChange={(e) => updateRow(row.key, { yearFrom: Number(e.target.value) })}
                />
              </label>
              <label>
                <span className={labelStyles}>{t.yearTo}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputStyles}
                  value={row.yearTo}
                  min={row.yearFrom}
                  max={thisYear + 1}
                  onChange={(e) => updateRow(row.key, { yearTo: Number(e.target.value) })}
                />
              </label>
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                className={buttonStyles("ghost", "md", "text-red-400 hover:text-red-300")}
                aria-label={t.removeFitment}
              >
                <Trash2 className="size-4" aria-hidden />
                <span className="sm:hidden">{t.removeFitment}</span>
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className={buttonStyles("outline", "sm")}
          onClick={() => {
            const used = new Set(rows.map((r) => r.generationId));
            const next = generations.find((g) => !used.has(g.id)) ?? generations[0];
            if (!next) return;
            setRows((rs) => [
              ...rs,
              { key: Date.now(), generationId: next.id, yearFrom: next.yearFrom, yearTo: next.yearTo ?? thisYear },
            ]);
          }}
        >
          <Plus className="size-4" aria-hidden /> {t.addFitment}
        </button>
      </section>

      <div className="sticky bottom-20 z-30 flex justify-end lg:bottom-4">
        <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "w-full shadow-2xl sm:w-auto")}>
          <Save className="size-5" aria-hidden />
          {pending ? dict.common.loading : dict.common.save}
        </button>
      </div>
    </form>
  );
}
