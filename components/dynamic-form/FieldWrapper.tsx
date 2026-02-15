"use client";

import { ReactNode } from "react";
import { FormField } from "@/lib/form-schema";

interface FieldWrapperProps {
  field: FormField;
  error?: string;
  onAiFill?: () => void;
  isAiBusy?: boolean;
  isAiFilling?: boolean;
  children: ReactNode;
}

export function FieldWrapper({
  field,
  error,
  onAiFill,
  isAiBusy = false,
  isAiFilling = false,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-[#111419]/92 dark:shadow-black/35">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={field.id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {field.label}
          {(field.required ?? true) && (
            <span className="ml-1 text-xs font-bold text-amber-600">*</span>
          )}
        </label>

        {field.aiHelper && onAiFill && (
          <button
            type="button"
            onClick={onAiFill}
            disabled={isAiBusy}
            className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-65 dark:border-sky-700/70 dark:bg-[#171c23] dark:text-sky-300 dark:hover:bg-[#212832]"
          >
            {isAiFilling ? "AI補完中..." : "AI Auto-fill"}
          </button>
        )}
      </div>

      {field.description && (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{field.description}</p>
      )}

      {children}

      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

