"use client";

import {
  type RefObject,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type AccessibleDialogProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  panelClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
};

/**
 * Diálogo modal basado en el elemento nativo `dialog`.
 * `showModal()` vuelve inerte el resto de la aplicación; aquí también se
 * controla el foco, Escape, Tab, el scroll del fondo y la restauración del foco.
 */
export function AccessibleDialog({
  open,
  onClose,
  labelledBy,
  children,
  panelClassName = "",
  initialFocusRef,
  closeOnBackdrop = true,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();

    const focusTimer = window.requestAnimationFrame(() => {
      const requested = initialFocusRef?.current;
      const fallback = panelRef.current?.querySelector<HTMLElement>(
        FOCUSABLE_SELECTOR,
      );
      (requested ?? fallback ?? dialog).focus();
    });

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  function trapFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    ).filter((element) => element.offsetParent !== null);

    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-inherit backdrop:bg-[#0b2824]/65 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      onKeyDown={trapFocus}
    >
      <div
        ref={panelRef}
        className={panelClassName}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </dialog>
  );
}
