"use client";

import { FormEvent, useMemo, useState } from "react";
import { autoFillFormApi } from "@/lib/client/morph-api-client";
import { SelectField } from "@/components/dynamic-form/fields/SelectField";
import { SliderField } from "@/components/dynamic-form/fields/SliderField";
import { SwitchField } from "@/components/dynamic-form/fields/SwitchField";
import { TextInputField } from "@/components/dynamic-form/fields/TextInputField";
import { buildInitialValues, suggestFieldValue } from "@/lib/form-templates";
import {
  DynamicForm,
  FormField,
  FormValues,
  PrimitiveFieldValue,
} from "@/lib/form-schema";

interface DynamicFormRendererProps {
  formData: DynamicForm;
  intent: string;
  onSubmit: (values: FormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  visibleFieldCount?: number;
}

function isEmptyString(value: PrimitiveFieldValue | undefined): boolean {
  return typeof value === "string" && value.trim().length === 0;
}

function isEmptyArray(value: PrimitiveFieldValue | undefined): boolean {
  return Array.isArray(value) && value.length === 0;
}

function isFieldEmpty(
  field: FormField,
  value: PrimitiveFieldValue | undefined,
): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (
    field.uiType === "text_input" ||
    field.uiType === "text_area" ||
    field.uiType === "select" ||
    field.uiType === "radio"
  ) {
    return typeof value !== "string" || value.trim().length === 0;
  }

  if (field.uiType === "tags_input") {
    return !Array.isArray(value) || value.length === 0;
  }

  return false;
}

function validateField(field: FormField, value: PrimitiveFieldValue | undefined): string | null {
  const isRequired = field.required ?? true;

  if (isRequired) {
    if (
      value === undefined ||
      value === null ||
      isEmptyString(value) ||
      isEmptyArray(value)
    ) {
      return "この項目は必須です。";
    }
  }

  if (
    (field.uiType === "text_input" || field.uiType === "text_area") &&
    typeof value === "string" &&
    field.validation
  ) {
    if (
      field.validation.minLength !== undefined &&
      value.length < field.validation.minLength
    ) {
      return `${field.validation.minLength}文字以上で入力してください。`;
    }

    if (
      field.validation.maxLength !== undefined &&
      value.length > field.validation.maxLength
    ) {
      return `${field.validation.maxLength}文字以内で入力してください。`;
    }
  }

  if (field.uiType === "tags_input" && Array.isArray(value) && field.maxTags) {
    if (value.length > field.maxTags) {
      return `タグは最大${field.maxTags}個までです。`;
    }
  }

  return null;
}

function countFilledFields(formData: DynamicForm, values: FormValues): number {
  return formData.fields.filter((field) => {
    const value = values[field.id];
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null;
  }).length;
}

export function DynamicFormRenderer({
  formData,
  intent,
  onSubmit,
  isSubmitting = false,
  visibleFieldCount,
}: DynamicFormRendererProps) {
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(formData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoFillFieldId, setAutoFillFieldId] = useState<string | null>(null);
  const [isBulkAutoFilling, setIsBulkAutoFilling] = useState(false);
  const [bulkFieldIds, setBulkFieldIds] = useState<string[]>([]);
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);

  const completion = useMemo(() => {
    const total = formData.fields.length;
    if (total === 0) {
      return 0;
    }

    const filled = countFilledFields(formData, values);
    return Math.round((filled / total) * 100);
  }, [formData, values]);

  const fieldById = useMemo(() => {
    return new Map(formData.fields.map((field) => [field.id, field]));
  }, [formData.fields]);

  const emptyAiFillFieldIds = useMemo(() => {
    return formData.fields
      .filter((field) => field.aiHelper !== false)
      .filter((field) => isFieldEmpty(field, values[field.id]))
      .map((field) => field.id);
  }, [formData.fields, values]);

  const bulkFieldIdSet = useMemo(() => {
    return new Set(bulkFieldIds);
  }, [bulkFieldIds]);

  const isAiBusy = isSubmitting || isBulkAutoFilling || autoFillFieldId !== null;

  const updateFieldValue = (fieldId: string, nextValue: PrimitiveFieldValue) => {
    setValues((previous) => ({
      ...previous,
      [fieldId]: nextValue,
    }));

    setErrors((previous) => {
      if (!previous[fieldId]) {
        return previous;
      }
      const next = { ...previous };
      delete next[fieldId];
      return next;
    });
  };

  const applySuggestions = (suggestions: FormValues) => {
    const fieldIds = Object.keys(suggestions).filter(
      (fieldId) => suggestions[fieldId] !== undefined,
    );

    if (fieldIds.length === 0) {
      return;
    }

    setValues((previous) => {
      const next = { ...previous };
      for (const fieldId of fieldIds) {
        const suggestion = suggestions[fieldId];
        if (suggestion !== undefined) {
          next[fieldId] = suggestion;
        }
      }
      return next;
    });

    setErrors((previous) => {
      let touched = false;
      const next = { ...previous };
      for (const fieldId of fieldIds) {
        if (next[fieldId]) {
          delete next[fieldId];
          touched = true;
        }
      }
      return touched ? next : previous;
    });
  };

  const buildLocalSuggestions = (targetFieldIds: string[]): FormValues => {
    const localSuggestions: FormValues = {};

    for (const fieldId of targetFieldIds) {
      const field = fieldById.get(fieldId);
      if (!field) {
        continue;
      }
      localSuggestions[fieldId] = suggestFieldValue(field, intent);
    }

    return localSuggestions;
  };

  const fillWithAiSuggestion = async (field: FormField) => {
    if (isAiBusy) {
      return;
    }

    setAutoFillMessage(null);
    setAutoFillFieldId(field.id);

    try {
      const payload = await autoFillFormApi({
        intent,
        form: formData,
        values,
        targetFieldId: field.id,
        onlyEmpty: false,
      });

      const suggestions: FormValues = {
        ...(payload.suggestions ?? {}),
      };

      if (suggestions[field.id] === undefined) {
        suggestions[field.id] = suggestFieldValue(field, intent);
      }

      applySuggestions(suggestions);

      if (payload.warning) {
        setAutoFillMessage(payload.warning);
      }
    } catch (error) {
      applySuggestions({
        [field.id]: suggestFieldValue(field, intent),
      });
      const message =
        error instanceof Error
          ? error.message
          : "AI Auto-fillに失敗したためローカル候補で補完しました。";
      setAutoFillMessage(message);
    } finally {
      setAutoFillFieldId(null);
    }
  };

  const fillEmptyFieldsWithAi = async () => {
    if (isAiBusy || emptyAiFillFieldIds.length === 0) {
      return;
    }

    const targetFieldIds = [...emptyAiFillFieldIds];
    setAutoFillMessage(null);
    setBulkFieldIds(targetFieldIds);
    setIsBulkAutoFilling(true);

    try {
      const payload = await autoFillFormApi({
        intent,
        form: formData,
        values,
        onlyEmpty: true,
      });

      const mergedSuggestions: FormValues = {};
      for (const fieldId of targetFieldIds) {
        const fromAi = payload.suggestions?.[fieldId];
        if (fromAi !== undefined) {
          mergedSuggestions[fieldId] = fromAi;
          continue;
        }

        const field = fieldById.get(fieldId);
        if (field) {
          mergedSuggestions[fieldId] = suggestFieldValue(field, intent);
        }
      }

      applySuggestions(mergedSuggestions);

      if (payload.warning) {
        setAutoFillMessage(payload.warning);
      }
    } catch (error) {
      applySuggestions(buildLocalSuggestions(targetFieldIds));
      const message =
        error instanceof Error
          ? error.message
          : "AI Auto-fillに失敗したためローカル候補で補完しました。";
      setAutoFillMessage(message);
    } finally {
      setIsBulkAutoFilling(false);
      setBulkFieldIds([]);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    for (const field of formData.fields) {
      const error = validateField(field, values[field.id]);
      if (error) {
        nextErrors[field.id] = error;
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-sky-50/35 p-4 shadow-sm dark:border-slate-700/80 dark:from-[#0b0d10] dark:to-[#171c23]">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          {formData.formTitle}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{formData.formDescription}</p>
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>入力進捗</span>
            <span>{completion}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200/90 dark:bg-slate-700/80">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            未入力項目をまとめてAI補完できます
          </p>
          <button
            type="button"
            onClick={() => {
              void fillEmptyFieldsWithAi();
            }}
            disabled={isAiBusy || emptyAiFillFieldIds.length === 0}
            className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700/80 dark:bg-[#171c23] dark:text-sky-300 dark:hover:bg-[#212832]"
          >
            {isBulkAutoFilling
              ? "AI補完中..."
              : `未入力をAI Auto-fill (${emptyAiFillFieldIds.length})`}
          </button>
        </div>
        {autoFillMessage && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{autoFillMessage}</p>
        )}
      </div>

      <div className="space-y-4">
        {formData.fields
          .slice(
            0,
            typeof visibleFieldCount === "number"
              ? Math.max(0, visibleFieldCount)
              : formData.fields.length,
          )
          .map((field) => {
            const isAiFillingField =
              autoFillFieldId === field.id || bulkFieldIdSet.has(field.id);

            const commonProps = {
              field,
              value: values[field.id],
              error: errors[field.id],
              onChange: (nextValue: PrimitiveFieldValue) =>
                updateFieldValue(field.id, nextValue),
              onAiFill: () => {
                void fillWithAiSuggestion(field);
              },
              isAiBusy,
              isAiFilling: isAiFillingField,
            };

            switch (field.uiType) {
              case "text_input":
              case "text_area":
              case "tags_input":
                return <TextInputField key={field.id} {...commonProps} />;
              case "select":
              case "radio":
                return <SelectField key={field.id} {...commonProps} />;
              case "slider":
                return <SliderField key={field.id} {...commonProps} />;
              case "switch":
                return <SwitchField key={field.id} {...commonProps} />;
              default:
                return null;
            }
          })}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isAiBusy}
        className="w-full rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 transition hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-black/35"
      >
        {isSubmitting ? "生成中..." : "システムプロンプトを生成"}
      </button>
    </form>
  );
}
