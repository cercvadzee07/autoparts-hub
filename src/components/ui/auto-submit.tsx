"use client";

import { inputStyles } from "./styles";

/** <select> that submits its parent form on change (forms still work without JS). */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={props.className ?? inputStyles}
      onChange={(e) => {
        props.onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
