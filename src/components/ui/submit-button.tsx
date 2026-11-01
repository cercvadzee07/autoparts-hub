"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** Submit button with a pending spinner and an optional confirm() prompt. */
export function SubmitButton({
  children,
  className,
  confirmMessage,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirmMessage?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      className={className}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      {...rest}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
