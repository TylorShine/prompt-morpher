"use client";

import { FieldWrapper } from "@/components/dynamic-form/FieldWrapper";
import { FormField, PrimitiveFieldValue } from "@/lib/form-schema";

interface SwitchFieldProps {
  field: FormField;
  value: PrimitiveFieldValue | undefined;
  error?: string;
  onChange: (value: PrimitiveFieldValue) => void;
  onAiFill?: () => void;
  isAiBusy?: boolean;
  isAiFilling?: boolean;
}

export function SwitchField({
  field,
  value,
  error,
  onChange,
  onAiFill,
  isAiBusy,
  isAiFilling,
}: SwitchFieldProps) {
  if (field.uiType !== "switch") {
    return null;
  }

  const enabled = typeof value === "boolean" ? value : Boolean(field.defaultValue);

  return (
    <FieldWrapper
      field={field}
      error={error}
      onAiFill={onAiFill}
      isAiBusy={isAiBusy}
      isAiFilling={isAiFilling}
    >
      <div className="flex items-center">
        <button
          id={field.id}
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
            enabled
              ? "border-sky-600 bg-sky-600"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-[#202730]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>

        <span className="ml-3 text-sm text-slate-600 dark:text-slate-300">
          {enabled ? field.activeLabel ?? "ON" : field.inactiveLabel ?? "OFF"}
        </span>
      </div>
    </FieldWrapper>
  );
}

