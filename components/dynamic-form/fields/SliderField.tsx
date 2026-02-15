"use client";

import { FieldWrapper } from "@/components/dynamic-form/FieldWrapper";
import { FormField, PrimitiveFieldValue } from "@/lib/form-schema";

interface SliderFieldProps {
  field: FormField;
  value: PrimitiveFieldValue | undefined;
  error?: string;
  onChange: (value: PrimitiveFieldValue) => void;
  onAiFill?: () => void;
  isAiBusy?: boolean;
  isAiFilling?: boolean;
}

export function SliderField({
  field,
  value,
  error,
  onChange,
  onAiFill,
  isAiBusy,
  isAiFilling,
}: SliderFieldProps) {
  if (field.uiType !== "slider") {
    return null;
  }

  const sliderValue =
    typeof value === "number"
      ? value
      : typeof field.defaultValue === "number"
        ? field.defaultValue
        : field.min;

  return (
    <FieldWrapper
      field={field}
      error={error}
      onAiFill={onAiFill}
      isAiBusy={isAiBusy}
      isAiFilling={isAiFilling}
    >
      <div className="flex items-center gap-3">
        <input
          id={field.id}
          type="range"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={sliderValue}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer rounded-lg accent-sky-600"
        />
        <span className="min-w-14 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-[#171c23] dark:text-slate-200">
          {sliderValue}
          {field.unit ?? ""}
        </span>
      </div>
    </FieldWrapper>
  );
}

