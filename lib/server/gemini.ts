import { buildFormFromIntent, suggestFieldValue } from "@/lib/form-templates";
import { normalizeDynamicForm } from "@/lib/form-normalizer";
import { DynamicForm, FormField, FormValues, PrimitiveFieldValue } from "@/lib/form-schema";
import {
  buildSampleOutputFallback,
  buildSystemPromptFallback,
  buildPromptRuntimeSection,
  buildPromptStaticSection,
  compilePrompt,
  PROMPT_TEMPLATE_VERSION,
} from "@/lib/prompt-compiler";
import { getOrCreateContextCache } from "@/lib/server/ai/context-cache";
import { resolveProvider } from "@/lib/server/ai/provider";
import { loadFormGenerationPolicy } from "@/lib/server/form-generation-policy";
import {
  isSelfCacheAvailable,
  getCachedFormResult,
  getCachedPromptResult,
  setCachedFormResult,
  setCachedPromptResult,
} from "@/lib/server/cache/model-cache";
import { stableStringify } from "@/lib/server/cache/hash-utils";

const FORM_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: ["formTitle", "formDescription", "fields"],
  properties: {
    formTitle: { type: "string" },
    formDescription: { type: "string" },
    fields: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
} as const;

const PROMPT_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["systemPrompt"],
  properties: {
    systemPrompt: { type: "string" },
  },
} as const;

const PROMPT_WITH_SAMPLE_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["systemPrompt", "sampleOutput"],
  properties: {
    systemPrompt: { type: "string" },
    sampleOutput: { type: "string" },
  },
} as const;

const AUTOFILL_TEMPLATE_VERSION = "autofill-v1";

const AUTOFILL_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          {
            type: "array",
            items: { type: "string" },
          },
        ],
      },
    },
  },
} as const;

interface CacheDiagnostics {
  selfCache: "disabled" | "hit" | "miss";
  contextCache: "disabled" | "hit" | "created" | "unsupported" | "error" | "bypass";
}

interface CachedFormPayloadV1 {
  source: "model";
  form: DynamicForm;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractFirstCodeBlock(text: string): string | null {
  const match = text.match(/```(?:markdown|md|text)?\s*([\s\S]*?)```/i);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].trim();
}

interface PromptPayload {
  systemPrompt: string | null;
  sampleOutput?: string;
}

function extractPromptPayload(text: string): PromptPayload {
  const normalized = stripCodeFence(text);

  try {
    const parsed = JSON.parse(normalized) as {
      systemPrompt?: unknown;
      result?: unknown;
      prompt?: unknown;
      sampleOutput?: unknown;
      sample?: unknown;
      outputSample?: unknown;
    };

    const systemPrompt =
      typeof parsed.systemPrompt === "string" &&
      parsed.systemPrompt.trim().length > 0
        ? parsed.systemPrompt.trim()
        : typeof parsed.result === "string" && parsed.result.trim().length > 0
          ? parsed.result.trim()
          : typeof parsed.prompt === "string" && parsed.prompt.trim().length > 0
            ? parsed.prompt.trim()
            : null;

    const sampleOutput =
      typeof parsed.sampleOutput === "string" && parsed.sampleOutput.trim().length > 0
        ? parsed.sampleOutput.trim()
        : typeof parsed.sample === "string" && parsed.sample.trim().length > 0
          ? parsed.sample.trim()
          : typeof parsed.outputSample === "string" && parsed.outputSample.trim().length > 0
            ? parsed.outputSample.trim()
            : undefined;

    if (systemPrompt) {
      return {
        systemPrompt,
        sampleOutput,
      };
    }
  } catch {
    // ignore parse errors and continue fallback parsing
  }

  const codeBlock = extractFirstCodeBlock(text);
  if (codeBlock && codeBlock.length > 0) {
    return {
      systemPrompt: codeBlock,
    };
  }

  return {
    systemPrompt: normalized.length > 0 ? normalized : null,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseBooleanLike(value: unknown): boolean | undefined {
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

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(/[,、\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function clampSliderValue(field: FormField, rawValue: unknown): number | undefined {
  if (field.uiType !== "slider") {
    return undefined;
  }

  const parsed =
    typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string"
        ? Number(rawValue)
        : NaN;

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const step = field.step && field.step > 0 ? field.step : 1;
  const clamped = Math.min(field.max, Math.max(field.min, parsed));
  const snapped = field.min + Math.round((clamped - field.min) / step) * step;
  const bounded = Math.min(field.max, Math.max(field.min, snapped));
  return Number(bounded.toFixed(6));
}

function normalizeAutoFillValue(
  field: FormField,
  rawValue: unknown,
): PrimitiveFieldValue | undefined {
  if (field.uiType === "select" || field.uiType === "radio") {
    if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (trimmed.length === 0) {
        return undefined;
      }

      const exactOption = field.options.find((option) => option.value === trimmed);
      if (exactOption) {
        return exactOption.value;
      }

      const byLabel = field.options.find((option) => option.label === trimmed);
      if (byLabel) {
        return byLabel.value;
      }
    }

    return field.options[0]?.value;
  }

  if (field.uiType === "slider") {
    return clampSliderValue(field, rawValue);
  }

  if (field.uiType === "switch") {
    return parseBooleanLike(rawValue);
  }

  if (field.uiType === "tags_input") {
    const tags = toStringArray(rawValue);
    if (tags.length === 0) {
      return undefined;
    }
    if (field.maxTags && field.maxTags > 0) {
      return tags.slice(0, field.maxTags);
    }
    return tags;
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (rawValue === null || rawValue === undefined) {
    return undefined;
  }

  return String(rawValue);
}

function isFieldEmptyValue(field: FormField, value: PrimitiveFieldValue | undefined): boolean {
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

function buildLocalAutoFillSuggestions(
  intent: string,
  targetFields: FormField[],
): FormValues {
  const suggestions: FormValues = {};

  for (const field of targetFields) {
    const suggestion = suggestFieldValue(field, intent);
    const normalized = normalizeAutoFillValue(field, suggestion);
    if (normalized !== undefined) {
      suggestions[field.id] = normalized;
    }
  }

  return suggestions;
}

function extractAutoFillSuggestions(text: string): Record<string, unknown> {
  const normalized = stripCodeFence(text);

  try {
    const parsed = JSON.parse(normalized) as {
      suggestions?: unknown;
      values?: unknown;
      autoFill?: unknown;
    };

    if (isObjectRecord(parsed.suggestions)) {
      return parsed.suggestions;
    }

    if (isObjectRecord(parsed.values)) {
      return parsed.values;
    }

    if (isObjectRecord(parsed.autoFill)) {
      return parsed.autoFill;
    }

    if (isObjectRecord(parsed)) {
      return parsed;
    }
  } catch {
    // no-op
  }

  return {};
}

function buildAutoFillPrompt(
  intent: string,
  form: DynamicForm,
  values: FormValues,
  targetFields: FormField[],
  onlyEmpty: boolean,
): string {
  const targetFieldIds = targetFields.map((field) => field.id);

  return [
    "あなたはフォーム入力補完アシスタントです。",
    "System Prompt を作るための入力値を補完します。",
    "必ずJSONのみを返してください。",
    "",
    "# 出力仕様",
    '- 形式: {"suggestions": {"fieldId": value}}',
    "- suggestions には targetFieldIds に含まれるフィールドのみを含める。",
    "- select/radio は必ず options[].value を返す。",
    "- slider は min/max 内の数値を返す。",
    "- switch は true/false を返す。",
    "- tags_input は文字列配列を返す。",
    "- 不明な項目は無理に埋めず、キーを省略してよい。",
    "",
    "# 補完条件",
    `- onlyEmpty: ${onlyEmpty ? "true" : "false"}`,
    `- targetFieldIds: ${JSON.stringify(targetFieldIds)}`,
    "",
    "# ユーザー意図",
    intent,
    "",
    "# フォーム定義(JSON)",
    JSON.stringify(form),
    "",
    "# 現在の入力値(JSON)",
    JSON.stringify(values),
  ].join("\n");
}

function buildFormGenerationPrompt(intent: string): string {
  const policy = loadFormGenerationPolicy();

  return [
    "あなたは Dynamic Form Generator です。",
    "ユーザーの依頼意図に対して、System Prompt を設計するための入力フォームJSONのみを作成してください。",
    "",
    `# Policy: ${policy.title} (${policy.name})`,
    "",
    "# 目標",
    ...policy.goal.map((line) => `- ${line}`),
    "",
    "# 設計原則",
    ...policy.principles.map((line) => `- ${line}`),
    "",
    "# uiType 選択ルール",
    ...policy.uiTypeRules.map((line) => `- ${line}`),
    "",
    "# 推奨フィールド設計（参考）",
    ...policy.fieldBlueprint.map((line) => `- ${line}`),
    "",
    "# 制約",
    ...policy.constraints.map((line) => `- ${line}`),
    "- fields[].required は基本 true。任意のみ false。",
    "- 推測しづらい項目は aiHelper=true。",
    "- 日本語UIラベルで作成する。",
    "- JSON以外を出力しない。",
    "",
    "# ユーザー意図",
    intent,
  ].join("\n");
}

function mergeWarnings(...warnings: Array<string | undefined>): string | undefined {
  const active = warnings.filter((warning): warning is string => Boolean(warning));
  if (active.length === 0) {
    return undefined;
  }
  return active.join(" / ");
}

function isSchemaDepthLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("maximum allowed nesting depth");
}

function isFallbackForm(cached: DynamicForm, fallback: DynamicForm): boolean {
  return stableStringify(cached) === stableStringify(fallback);
}

function extractCachedForm(
  cached: unknown,
  fallback: DynamicForm,
): DynamicForm | null {
  if (!cached) {
    return null;
  }

  if (isObjectRecord(cached) && "source" in cached && "form" in cached) {
    const source = typeof cached.source === "string" ? cached.source : "";
    if (source !== "model") {
      return null;
    }

    const normalizedWrapped = normalizeDynamicForm(cached.form);
    if (!normalizedWrapped || isFallbackForm(normalizedWrapped, fallback)) {
      return null;
    }

    return normalizedWrapped;
  }

  const normalizedLegacy = normalizeDynamicForm(cached);
  if (!normalizedLegacy || isFallbackForm(normalizedLegacy, fallback)) {
    return null;
  }

  return normalizedLegacy;
}

export interface GenerateFormWithGeminiResult {
  form: DynamicForm;
  provider: string;
  model: string;
  warning?: string;
  cache: CacheDiagnostics;
}

export async function generateFormWithGemini(intent: string): Promise<GenerateFormWithGeminiResult> {
  const fallback = buildFormFromIntent(intent);
  const providerResult = resolveProvider();
  const formPolicy = loadFormGenerationPolicy();

  if (!providerResult.ok) {
    return {
      form: fallback,
      provider: "fallback",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      warning: providerResult.warning,
      cache: {
        selfCache: "disabled",
        contextCache: "bypass",
      },
    };
  }

  const provider = providerResult.provider;
  const selfCacheEnabled = isSelfCacheAvailable();
  const cacheLookupKey = {
    provider: provider.info.kind,
    model: provider.info.model,
    intent,
    templateVersion: `form-v3-${formPolicy.name}`,
  };

  const cachedRaw = await getCachedFormResult<unknown>(cacheLookupKey);
  const cached = extractCachedForm(cachedRaw, fallback);
  if (cached) {
    return {
      form: cached,
      provider: `${provider.info.kind}:self_cache`,
      model: provider.info.model,
      warning: providerResult.warning,
      cache: {
        selfCache: "hit",
        contextCache: "bypass",
      },
    };
  }

  try {
    let schemaFallbackWarning: string | undefined;
    let text: string | null;

    try {
      text = await provider.generateText({
        prompt: buildFormGenerationPrompt(intent),
        temperature: 0.35,
        responseMimeType: "application/json",
        responseJsonSchema: FORM_RESPONSE_JSON_SCHEMA,
      });
    } catch (error) {
      if (!isSchemaDepthLimitError(error)) {
        throw error;
      }

      schemaFallbackWarning =
        "フォームJSONスキーマが深すぎるため、JSON mode（schemaなし）で再試行しました。";
      text = await provider.generateText({
        prompt: buildFormGenerationPrompt(intent),
        temperature: 0.35,
        responseMimeType: "application/json",
      });
    }

    if (!text) {
      return {
        form: fallback,
        provider: "fallback",
        model: provider.info.model,
        warning: mergeWarnings(
          providerResult.warning,
          schemaFallbackWarning,
          "AIのフォーム生成結果が空だったためローカルテンプレートを使用しました。",
        ),
        cache: {
          selfCache: selfCacheEnabled ? "miss" : "disabled",
          contextCache: "bypass",
        },
      };
    }

    const parsed = JSON.parse(stripCodeFence(text));
    const normalized = normalizeDynamicForm(parsed);

    if (!normalized) {
      return {
        form: fallback,
        provider: "fallback",
        model: provider.info.model,
        warning: mergeWarnings(
          providerResult.warning,
          schemaFallbackWarning,
          "AIのフォームJSONが不正だったためローカルテンプレートを使用しました。",
        ),
        cache: {
          selfCache: selfCacheEnabled ? "miss" : "disabled",
          contextCache: "bypass",
        },
      };
    }

    const cachedPayload: CachedFormPayloadV1 = {
      source: "model",
      form: normalized,
    };
    await setCachedFormResult(cacheLookupKey, cachedPayload);

    return {
      form: normalized,
      provider: provider.info.kind,
      model: provider.info.model,
      warning: mergeWarnings(providerResult.warning, schemaFallbackWarning),
      cache: {
        selfCache: selfCacheEnabled ? "miss" : "disabled",
        contextCache: "bypass",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      form: fallback,
      provider: "fallback",
      model: provider.info.model,
      warning: `フォーム生成に失敗したためローカルテンプレートへフォールバックしました: ${message}`,
      cache: {
        selfCache: selfCacheEnabled ? "miss" : "disabled",
        contextCache: "bypass",
      },
    };
  }
}

export interface GenerateAutoFillWithGeminiInput {
  intent: string;
  form: DynamicForm;
  values: FormValues;
  targetFieldId?: string;
  onlyEmpty?: boolean;
}

export interface GenerateAutoFillWithGeminiResult {
  suggestions: FormValues;
  filledFieldIds: string[];
  provider: string;
  model: string;
  warning?: string;
  cache: CacheDiagnostics;
}

export async function generateAutoFillWithGemini({
  intent,
  form,
  values,
  targetFieldId,
  onlyEmpty = true,
}: GenerateAutoFillWithGeminiInput): Promise<GenerateAutoFillWithGeminiResult> {
  const initialTargets = targetFieldId
    ? form.fields.filter((field) => field.id === targetFieldId)
    : form.fields.filter((field) => field.aiHelper !== false);

  const targetFields = onlyEmpty
    ? initialTargets.filter((field) => isFieldEmptyValue(field, values[field.id]))
    : initialTargets;

  if (targetFields.length === 0) {
    return {
      suggestions: {},
      filledFieldIds: [],
      provider: "noop",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      cache: {
        selfCache: "disabled",
        contextCache: "bypass",
      },
    };
  }

  const fallbackSuggestions = buildLocalAutoFillSuggestions(intent, targetFields);
  const fallbackFieldIds = Object.keys(fallbackSuggestions);
  const providerResult = resolveProvider();

  if (!providerResult.ok) {
    return {
      suggestions: fallbackSuggestions,
      filledFieldIds: fallbackFieldIds,
      provider: "fallback",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      warning: providerResult.warning,
      cache: {
        selfCache: "disabled",
        contextCache: "bypass",
      },
    };
  }

  const provider = providerResult.provider;
  const selfCacheEnabled = isSelfCacheAvailable();
  const cacheKey = {
    provider: provider.info.kind,
    model: provider.info.model,
    intent,
    form,
    values,
    targetFieldIds: targetFields.map((field) => field.id),
    onlyEmpty,
    templateVersion: AUTOFILL_TEMPLATE_VERSION,
  };

  const cached = await getCachedPromptResult<FormValues>(cacheKey);
  if (cached) {
    const cachedIds = Object.keys(cached);
    return {
      suggestions: cached,
      filledFieldIds: cachedIds,
      provider: `${provider.info.kind}:self_cache`,
      model: provider.info.model,
      warning: providerResult.warning,
      cache: {
        selfCache: "hit",
        contextCache: "bypass",
      },
    };
  }

  try {
    let schemaFallbackWarning: string | undefined;
    let text: string | null;

    try {
      text = await provider.generateText({
        prompt: buildAutoFillPrompt(intent, form, values, targetFields, onlyEmpty),
        temperature: 0.35,
        responseMimeType: "application/json",
        responseJsonSchema: AUTOFILL_RESPONSE_JSON_SCHEMA,
      });
    } catch (error) {
      if (!isSchemaDepthLimitError(error)) {
        throw error;
      }

      schemaFallbackWarning =
        "Auto-fill JSONスキーマが深すぎるため、JSON mode（schemaなし）で再試行しました。";
      text = await provider.generateText({
        prompt: buildAutoFillPrompt(intent, form, values, targetFields, onlyEmpty),
        temperature: 0.35,
        responseMimeType: "application/json",
      });
    }

    if (!text) {
      return {
        suggestions: fallbackSuggestions,
        filledFieldIds: fallbackFieldIds,
        provider: "fallback",
        model: provider.info.model,
        warning: mergeWarnings(
          providerResult.warning,
          schemaFallbackWarning,
          "AIのAuto-fill結果が空だったためローカル候補で補完しました。",
        ),
        cache: {
          selfCache: selfCacheEnabled ? "miss" : "disabled",
          contextCache: "bypass",
        },
      };
    }

    const rawSuggestions = extractAutoFillSuggestions(text);
    const normalizedSuggestions: FormValues = {};

    for (const field of targetFields) {
      const rawValue = rawSuggestions[field.id];
      const normalized = normalizeAutoFillValue(field, rawValue);
      if (normalized !== undefined) {
        normalizedSuggestions[field.id] = normalized;
      }
    }

    if (Object.keys(normalizedSuggestions).length === 0) {
      return {
        suggestions: fallbackSuggestions,
        filledFieldIds: fallbackFieldIds,
        provider: "fallback",
        model: provider.info.model,
        warning: mergeWarnings(
          providerResult.warning,
          schemaFallbackWarning,
          "AIのAuto-fill結果を正規化できなかったためローカル候補で補完しました。",
        ),
        cache: {
          selfCache: selfCacheEnabled ? "miss" : "disabled",
          contextCache: "bypass",
        },
      };
    }

    await setCachedPromptResult(cacheKey, normalizedSuggestions);

    return {
      suggestions: normalizedSuggestions,
      filledFieldIds: Object.keys(normalizedSuggestions),
      provider: provider.info.kind,
      model: provider.info.model,
      warning: mergeWarnings(providerResult.warning, schemaFallbackWarning),
      cache: {
        selfCache: selfCacheEnabled ? "miss" : "disabled",
        contextCache: "bypass",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      suggestions: fallbackSuggestions,
      filledFieldIds: fallbackFieldIds,
      provider: "fallback",
      model: provider.info.model,
      warning: mergeWarnings(
        providerResult.warning,
        `AI Auto-fillに失敗したためローカル候補へフォールバックしました: ${message}`,
      ),
      cache: {
        selfCache: selfCacheEnabled ? "miss" : "disabled",
        contextCache: "bypass",
      },
    };
  }
}

export interface GeneratePromptWithGeminiInput {
  intent: string;
  form: DynamicForm;
  values: FormValues;
  includeSample?: boolean;
}

export interface GeneratePromptWithGeminiResult {
  result: string;
  sampleOutput?: string;
  compiledPrompt: string;
  provider: string;
  model: string;
  warning?: string;
  cache: CacheDiagnostics;
}

export async function generatePromptWithGemini({
  intent,
  form,
  values,
  includeSample = false,
}: GeneratePromptWithGeminiInput): Promise<GeneratePromptWithGeminiResult> {
  const compiledPrompt = compilePrompt({ intent, form, values, includeSample });
  const fallbackSystemPrompt = buildSystemPromptFallback({ intent, form, values });
  const fallbackSampleOutput = includeSample
    ? buildSampleOutputFallback({ intent, form, values })
    : undefined;
  const providerResult = resolveProvider();

  if (!providerResult.ok) {
    return {
      result: fallbackSystemPrompt,
      sampleOutput: fallbackSampleOutput,
      compiledPrompt,
      provider: "fallback",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      warning: providerResult.warning,
      cache: {
        selfCache: "disabled",
        contextCache: "bypass",
      },
    };
  }

  const provider = providerResult.provider;
  const selfCacheEnabled = isSelfCacheAvailable();
  const promptCacheKey = {
    provider: provider.info.kind,
    model: provider.info.model,
    intent,
    form,
    values,
    includeSample,
    templateVersion: PROMPT_TEMPLATE_VERSION,
  };

  const cachedPrompt = await getCachedPromptResult<
    string | { systemPrompt: string; sampleOutput?: string }
  >(promptCacheKey);
  if (cachedPrompt) {
    if (typeof cachedPrompt === "string") {
      return {
        result: cachedPrompt,
        sampleOutput: fallbackSampleOutput,
        compiledPrompt,
        provider: `${provider.info.kind}:self_cache`,
        model: provider.info.model,
        warning: providerResult.warning,
        cache: {
          selfCache: "hit",
          contextCache: "bypass",
        },
      };
    }

    return {
      result: cachedPrompt.systemPrompt,
      sampleOutput: cachedPrompt.sampleOutput,
      compiledPrompt,
      provider: `${provider.info.kind}:self_cache`,
      model: provider.info.model,
      warning: providerResult.warning,
      cache: {
        selfCache: "hit",
        contextCache: "bypass",
      },
    };
  }

  const staticSection = buildPromptStaticSection(includeSample);
  const runtimeSection = buildPromptRuntimeSection({ intent, form, values, includeSample });

  const contextCache = await getOrCreateContextCache(provider, staticSection);
  const cacheWarning = contextCache.warning;

  try {
    const text = await provider.generateText({
      prompt: contextCache.cacheName ? runtimeSection : compiledPrompt,
      cachedContent: contextCache.cacheName,
      temperature: 0.45,
      responseMimeType: "application/json",
      responseJsonSchema: includeSample
        ? PROMPT_WITH_SAMPLE_RESPONSE_JSON_SCHEMA
        : PROMPT_RESPONSE_JSON_SCHEMA,
    });

    if (!text) {
      return {
        result: fallbackSystemPrompt,
        sampleOutput: fallbackSampleOutput,
        compiledPrompt,
        provider: "fallback",
        model: provider.info.model,
        warning: mergeWarnings(
          providerResult.warning,
          cacheWarning,
          "AIの応答が空だったためローカル生成結果を返しました。",
        ),
        cache: {
          selfCache: selfCacheEnabled ? "miss" : "disabled",
          contextCache: contextCache.status,
        },
      };
    }

    const payload = extractPromptPayload(text);
    if (!payload.systemPrompt) {
      return {
        result: fallbackSystemPrompt,
        sampleOutput: fallbackSampleOutput,
        compiledPrompt,
        provider: "fallback",
        model: provider.info.model,
        warning: mergeWarnings(
          providerResult.warning,
          cacheWarning,
          "AI応答を system prompt 形式に変換できなかったためローカル生成結果を返しました。",
        ),
        cache: {
          selfCache: selfCacheEnabled ? "miss" : "disabled",
          contextCache: contextCache.status,
        },
      };
    }

    const sampleOutput = includeSample
      ? payload.sampleOutput ?? fallbackSampleOutput
      : undefined;

    await setCachedPromptResult(promptCacheKey, {
      systemPrompt: payload.systemPrompt,
      sampleOutput,
    });

    return {
      result: payload.systemPrompt,
      sampleOutput,
      compiledPrompt,
      provider: provider.info.kind,
      model: provider.info.model,
      warning: mergeWarnings(providerResult.warning, cacheWarning),
      cache: {
        selfCache: selfCacheEnabled ? "miss" : "disabled",
        contextCache: contextCache.status,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      result: fallbackSystemPrompt,
      sampleOutput: fallbackSampleOutput,
      compiledPrompt,
      provider: "fallback",
      model: provider.info.model,
      warning: mergeWarnings(
        providerResult.warning,
        cacheWarning,
        `AIプロンプト生成に失敗したためローカル生成結果へフォールバックしました: ${message}`,
      ),
      cache: {
        selfCache: selfCacheEnabled ? "miss" : "disabled",
        contextCache: contextCache.status,
      },
    };
  }
}
