import { DynamicForm, FormField, FormValues, PrimitiveFieldValue } from "@/lib/form-schema";

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "on", "1"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "off", "0"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
    return normalized;
  }

  if (typeof value === "string") {
    return value
      .split(/[,、\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return undefined;
}

function asPrimitiveFieldValue(value: unknown): PrimitiveFieldValue | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const strings = asStringArray(value);
    return strings ?? [];
  }

  return undefined;
}

function normalizeUiType(raw: unknown): FormField["uiType"] | null {
  const normalized = asString(raw)?.toLowerCase().replace(/[\s-]/g, "_");

  if (!normalized) {
    return null;
  }

  const map: Record<string, FormField["uiType"]> = {
    text: "text_input",
    input: "text_input",
    short_text: "text_input",
    text_input: "text_input",

    textarea: "text_area",
    text_area: "text_area",
    long_text: "text_area",
    multiline: "text_area",

    select: "select",
    dropdown: "select",
    choice: "select",
    single_select: "select",

    radio: "radio",
    radio_group: "radio",

    slider: "slider",
    range: "slider",

    switch: "switch",
    toggle: "switch",
    boolean: "switch",

    tags: "tags_input",
    tag: "tags_input",
    tags_input: "tags_input",
    chips: "tags_input",
  };

  return map[normalized] ?? null;
}

function parseBaseField(raw: Record<string, unknown>) {
  const id = asString(raw.id) ?? asString(raw.key) ?? asString(raw.name);
  const label = asString(raw.label) ?? asString(raw.title) ?? id;

  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    description:
      asString(raw.description) ?? asString(raw.helpText) ?? asString(raw.help),
    placeholder: asString(raw.placeholder) ?? asString(raw.example),
    defaultValue: asPrimitiveFieldValue(
      raw.defaultValue ?? raw.default ?? raw.initialValue,
    ),
    required: asBoolean(raw.required) ?? true,
    aiHelper:
      asBoolean(raw.aiHelper ?? raw.autoFill ?? raw.aiAssist ?? raw.ai_assist) ?? true,
  };
}

function parseFormField(raw: unknown): FormField | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const base = parseBaseField(record);
  const uiType = normalizeUiType(record.uiType ?? record.type ?? record.component);

  if (!base || !uiType) {
    return null;
  }

  if (uiType === "text_input" || uiType === "text_area") {
    let validation: { minLength?: number; maxLength?: number } | undefined;
    const validationRecord = asRecord(record.validation ?? record.rules);
    if (validationRecord) {
      validation = {
        minLength: asNumber(validationRecord.minLength ?? validationRecord.min),
        maxLength: asNumber(validationRecord.maxLength ?? validationRecord.max),
      };
    }

    return {
      ...base,
      uiType,
      validation,
    };
  }

  if (uiType === "select" || uiType === "radio") {
    const rawOptions = Array.isArray(record.options)
      ? record.options
      : Array.isArray(record.choices)
        ? record.choices
        : Array.isArray(record.enum)
          ? record.enum
          : [];

    const options = rawOptions
      .map((option) => {
        if (typeof option === "string") {
          const trimmed = option.trim();
          if (trimmed.length === 0) {
            return null;
          }
          return { label: trimmed, value: trimmed };
        }

        const optionRecord = asRecord(option);
        if (!optionRecord) {
          return null;
        }

        const label = asString(optionRecord.label) ?? asString(optionRecord.name);
        const value = asString(optionRecord.value) ?? label;
        if (!label || !value) {
          return null;
        }
        return { label, value };
      })
      .filter((option): option is { label: string; value: string } => option !== null);

    if (options.length === 0) {
      return null;
    }

    return {
      ...base,
      uiType,
      options,
    };
  }

  if (uiType === "slider") {
    const min = asNumber(record.min) ?? 1;
    const max = asNumber(record.max) ?? 5;
    const step = asNumber(record.step);
    const unit = asString(record.unit);

    if (min > max) {
      return null;
    }

    return {
      ...base,
      uiType,
      min,
      max,
      step: step && step > 0 ? step : 1,
      unit,
    };
  }

  if (uiType === "switch") {
    return {
      ...base,
      uiType,
      defaultValue:
        asBoolean(record.defaultValue ?? record.default ?? record.initialValue) ?? false,
      activeLabel: asString(record.activeLabel),
      inactiveLabel: asString(record.inactiveLabel),
    };
  }

  if (uiType === "tags_input") {
    const maxTags = asNumber(record.maxTags ?? record.max_items);
    return {
      ...base,
      uiType,
      maxTags: maxTags && maxTags > 0 ? maxTags : undefined,
    };
  }

  return null;
}

export function normalizeDynamicForm(raw: unknown): DynamicForm | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const formTitle =
    asString(record.formTitle) ??
    asString(record.title) ??
    asString(record.name) ??
    "System Prompt 作成フォーム";

  const formDescription =
    asString(record.formDescription) ??
    asString(record.description) ??
    asString(record.summary) ??
    "System Prompt を設計するための条件を入力してください。";

  const rawFields = Array.isArray(record.fields)
    ? record.fields
    : Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.formFields)
        ? record.formFields
        : Array.isArray(record.components)
          ? record.components
          : [];

  const fields = rawFields
    .map((field) => parseFormField(field))
    .filter((field): field is FormField => field !== null);

  if (fields.length === 0) {
    return null;
  }

  return {
    formTitle,
    formDescription,
    fields,
  };
}

export function normalizeFormValues(rawValues: unknown, form: DynamicForm): FormValues {
  const values: FormValues = {};
  const rawRecord = asRecord(rawValues) ?? {};

  for (const field of form.fields) {
    const raw = rawRecord[field.id];

    switch (field.uiType) {
      case "switch": {
        const normalized = asBoolean(raw);
        values[field.id] =
          normalized !== undefined
            ? normalized
            : typeof field.defaultValue === "boolean"
              ? field.defaultValue
              : false;
        break;
      }
      case "slider": {
        const normalized = asNumber(raw);
        if (normalized !== undefined) {
          values[field.id] = Math.min(field.max, Math.max(field.min, normalized));
        } else if (typeof field.defaultValue === "number") {
          values[field.id] = field.defaultValue;
        } else {
          values[field.id] = field.min;
        }
        break;
      }
      case "tags_input":
        values[field.id] = asStringArray(raw) ?? [];
        break;
      default:
        if (typeof raw === "string") {
          values[field.id] = raw;
        } else if (raw === null || raw === undefined) {
          values[field.id] = "";
        } else {
          values[field.id] = String(raw);
        }
        break;
    }
  }

  return values;
}
