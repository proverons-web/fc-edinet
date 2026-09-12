"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  children: ReactNode;
};

export default function ConfirmSubmitButton({
  confirmMessage,
  children,
  onClick,
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);

        if (event.defaultPrevented) return;

        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
