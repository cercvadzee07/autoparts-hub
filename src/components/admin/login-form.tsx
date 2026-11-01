"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "@/app/actions/admin";
import { useI18n } from "@/i18n/provider";
import type { FormState } from "@/lib/validation";
import { Field, fieldAria } from "@/components/ui/field";
import { buttonStyles, inputStyles } from "@/components/ui/styles";

export function LoginForm() {
  const { locale, dict } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, { ok: false });
  const t = dict.admin.login;
  const err = (k: string) => (state.errors?.[k] ? (dict.validation as Record<string, string>)[state.errors[k]] : undefined);
  const message =
    state.message === "invalid" ? t.invalid : state.message === "notStaff" ? t.notStaff : state.message === "rateLimited" ? dict.errors.rateLimited : null;

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {message && (
        <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-200">
          {message}
        </p>
      )}
      <Field id="email" label={t.email} error={err("email")}>
        <input {...fieldAria("email", err("email"))} name="email" type="email" autoComplete="username" required className={inputStyles} />
      </Field>
      <Field id="password" label={t.password} error={err("password")}>
        <input
          {...fieldAria("password", err("password"))}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputStyles}
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "w-full")}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {t.submit}
      </button>
    </form>
  );
}
