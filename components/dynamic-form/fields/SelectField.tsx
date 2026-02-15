"use client";

import { FieldWrapper } from "@/components/dynamic-form/FieldWrapper";
import { FormField, PrimitiveFieldValue } from "@/lib/form-schema";

interface SelectFieldProps {
  field: FormField;
  value: PrimitiveFieldValue | undefined;
  error?: string;
  onChange: (value: PrimitiveFieldValue) => void;
  onAiFill?: () => void;
  isAiBusy?: boolean;
  isAiFilling?: boolean;
}

export function SelectField({
  field,
  value,
  error,
  onChange,
  onAiFill,
  isAiBusy,
  isAiFilling,
}: SelectFieldProps) {
  if (field.uiType !== "select" && field.uiType !== "radio") {
    return null;
  }

  const selectedValue = typeof value === "string" ? value : "";

  if (field.uiType === "radio") {
    return (
      <FieldWrapper
        field={field}
        error={error}
        onAiFill={onAiFill}
        isAiBusy={isAiBusy}
        isAiFilling={isAiFilling}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options.map((option) => (
            <label key={option.value} className="block cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={selectedValue === option.value}
                onChange={(event) => onChange(event.target.value)}
                className="peer sr-only"
              />
              <span className="block rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition peer-checked:border-sky-500 peer-checked:bg-sky-50 peer-checked:text-sky-800 hover:border-slate-300 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-200 dark:peer-checked:border-sky-500 dark:peer-checked:bg-[#171c23] dark:peer-checked:text-sky-300 dark:hover:border-slate-500">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper
      field={field}
      error={error}
      onAiFill={onAiFill}
      isAiBusy={isAiBusy}
      isAiFilling={isAiFilling}
    >
      <select
        id={field.id}
        value={selectedValue}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/45"
      >
        <option value="">選択してください</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

