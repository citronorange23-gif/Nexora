"use client";

import { ReactNode } from "react";

type ModalActionVariant = "primary" | "secondary" | "danger";

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: ModalActionVariant;
  disabled?: boolean;
  loading?: boolean;
}

interface ConfirmationModalProps {
  title?: string;
  text: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  actions?: ModalAction[];
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ModalActionVariant, string> = {
  primary: "bg-white text-slate-950 hover:bg-slate-200",
  secondary:
    "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

export default function ConfirmationModal({
  title = "Confirmation",
  text,
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  loading = false,
  actions,
  children,
}: ConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>

        {children && <div className="mt-4">{children}</div>}

        {actions && actions.length > 0 ? (
          <div className="mt-6 space-y-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  VARIANT_CLASSES[action.variant ?? "primary"]
                }`}
              >
                {action.loading ? "Chargement..." : action.label}
              </button>
            ))}

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelText}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelText}
            </button>

            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Chargement..." : confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}