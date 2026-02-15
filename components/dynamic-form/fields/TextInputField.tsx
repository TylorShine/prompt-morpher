"use client";

import { FormField, PrimitiveFieldValue } from "@/lib/form-schema";
import { FieldWrapper } from "@/components/dynamic-form/FieldWrapper";

interface TextInputFieldProps {
  field: FormField;
  value: PrimitiveFieldValue | undefined;
  error?: string;
  onChange: (value: PrimitiveFieldValue) => void;
  onAiFill?: () => void;
  isAiBusy?: boolean;
  isAiFilling?: boolean;
}

export function TextInputField({
  field,
  value,
  error,
  onChange,
  onAiFill,
  isAiBusy,
  isAiFilling,
}: TextInputFieldProps) {
  if (
    field.uiType !== "text_input" &&
    field.uiType !== "text_area" &&
    field.uiType !== "tags_input"
  ) {
    return null;
  }

  const baseClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/45";

  if (field.uiType === "tags_input") {
    const textValue = Array.isArray(value) ? value.join(", ") : "";

    return (
      <FieldWrapper
        field={field}
        error={error}
        onAiFill={onAiFill}
        isAiBusy={isAiBusy}
        isAiFilling={isAiFilling}
      >
        <input
          id={field.id}
          type="text"
          value={textValue}
          placeholder={field.placeholder ?? "tag1, tag2, tag3"}
          className={baseClassName}
          onChange={(event) => {
            const tags = event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
            onChange(tags);
          }}
        />
      </FieldWrapper>
    );
  }

  const textValue = typeof value === "string" ? value : "";

  return (
    <FieldWrapper
      field={field}
      error={error}
      onAiFill={onAiFill}
      isAiBusy={isAiBusy}
      isAiFilling={isAiFilling}
    >
      {field.uiType === "text_area" ? (
        <textarea
          id={field.id}
          rows={4}
          value={textValue}
          placeholder={field.placeholder}
          className={`${baseClassName} min-h-28 resize-y`}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={field.id}
          type="text"
          value={textValue}
          placeholder={field.placeholder}
          className={baseClassName}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FieldWrapper>
  );
}

