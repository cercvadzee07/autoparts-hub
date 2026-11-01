"use client";

import { useActionState, useEffect } from "react";
import { addOrderNoteAction, updateOrderStatusAction, updateVinRequestAction } from "@/app/actions/admin";
import { useI18n } from "@/i18n/provider";
import { ORDER_STATUSES, VIN_STATUSES, type OrderStatus, type VinStatus } from "@/lib/types";
import type { FormState } from "@/lib/validation";
import { buttonStyles, inputStyles, labelStyles, textareaStyles } from "@/components/ui/styles";
import { useToast } from "@/components/ui/toast";

function useResultToast(state: FormState) {
  const { dict } = useI18n();
  const toast = useToast();
  useEffect(() => {
    if (state.ok) toast(dict.admin.toast.saved);
    else if (state.message === "error") toast(dict.admin.toast.error, "error");
  }, [state, toast, dict]);
}

export function OrderStatusForm({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { dict } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(updateOrderStatusAction, { ok: false });
  useResultToast(state);
  const D = dict.admin.orderDetail;
  const options = ORDER_STATUSES.filter((s) => s !== status);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block">
        <span className={labelStyles}>{D.changeStatus}</span>
        <select name="status" defaultValue={options[0]} className={inputStyles}>
          {options.map((s) => (
            <option key={s} value={s}>{dict.orderStatus[s]}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelStyles}>{D.statusNote}</span>
        <input name="note" maxLength={500} className={inputStyles} />
      </label>
      <p className="text-xs text-subtle">{D.cancelHint}</p>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "md", "w-full")}>
        {D.updateStatus}
      </button>
    </form>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const { dict } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(addOrderNoteAction, { ok: false });
  useResultToast(state);
  const D = dict.admin.orderDetail;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="sr-only" htmlFor="note-body">{D.internalNotes}</label>
      <textarea id="note-body" name="body" required rows={2} maxLength={2000} placeholder={D.notePlaceholder} className={textareaStyles} />
      <button type="submit" disabled={pending} className={buttonStyles("secondary", "sm")}>
        {D.addNote}
      </button>
    </form>
  );
}

export function VinUpdateForm({ id, status, adminNotes }: { id: string; status: VinStatus; adminNotes: string | null }) {
  const { dict } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(updateVinRequestAction, { ok: false });
  useResultToast(state);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className={labelStyles}>{dict.admin.vinList.status}</span>
        <select name="status" defaultValue={status} className={inputStyles}>
          {VIN_STATUSES.map((s) => (
            <option key={s} value={s}>{dict.vinStatus[s]}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={labelStyles}>{dict.admin.vinDetail.notes}</span>
        <textarea name="adminNotes" defaultValue={adminNotes ?? ""} rows={4} maxLength={2000} className={textareaStyles} />
      </label>
      <button type="submit" disabled={pending} className={buttonStyles("primary", "md", "w-full")}>
        {dict.admin.vinDetail.update}
      </button>
    </form>
  );
}
