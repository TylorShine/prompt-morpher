import { DynamicForm, FormField, FormValues, PrimitiveFieldValue } from "@/lib/form-schema";
import { I2P_FRAMEWORK_PROMPT } from "@/lib/i2p-framework";

interface CompilePromptInput {
  intent: string;
  form: DynamicForm;
  values: FormValues;
  includeSample?: boolean;
}

export const PROMPT_TEMPLATE_VERSION = "i2p-2026-02-15-v5-system-prompt-sample";

function hasValue(value: PrimitiveFieldValue | undefined): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function formatFieldValue(
  field: FormField,
  value: PrimitiveFieldValue | undefined,
): string {
  if (!hasValue(value)) {
    return "";
  }

  if (typeof value === "boolean") {
    if (field.uiType === "switch") {
      if (value && field.activeLabel) {
        return field.activeLabel;
      }
      if (!value && field.inactiveLabel) {
        return field.inactiveLabel;
      }
    }

    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    if (field.uiType === "slider" && field.unit) {
      return `${value}${field.unit}`;
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (field.uiType === "select" || field.uiType === "radio") {
    if (typeof value !== "string") {
      return String(value);
    }

    const option = field.options.find((item) => item.value === value);
    return option?.label ?? value;
  }

  return String(value);
}

function compileUserInputs(form: DynamicForm, values: FormValues): string[] {
  const rows: string[] = [];

  for (const field of form.fields) {
    const value = formatFieldValue(field, values[field.id]);

    if (!value) {
      continue;
    }

    rows.push(`- ${field.label}: ${value}`);
  }

  if (rows.length === 0) {
    rows.push("- 入力情報なし。目的に沿って妥当な仮定を置いてください。");
  }

  return rows;
}

export function buildPromptStaticSection(includeSample = false): string {
  const outputSpec = includeSample
    ? '- JSONのみを返す: {"systemPrompt":"...","sampleOutput":"..."}'
    : '- JSONのみを返す: {"systemPrompt":"..."}';

  return [
    I2P_FRAMEWORK_PROMPT,
    "",
    "## タスク",
    "与えられた情報から、そのまま System Prompt として使える文面を1つ生成してください。",
    "",
    "## 出力仕様（厳守）",
    outputSpec,
    "- code fence を使わない。",
    "- 補足説明や前置き文章を出力しない。",
    ...(includeSample
      ? [
        "- sampleOutput は上記 systemPrompt を実行したときの短いサンプル結果にする。",
      ]
      : []),
    "",
    "## systemPrompt の必須構成",
    "- # Role",
    "- # Goal",
    "- # Constraints",
    "- # Variables",
    "- # Output Format",
    "",
    "## 品質要件",
    "- 実行可能で具体的なルールにする。",
    "- 日本語で簡潔かつ不足なく記述する。",
    "- Variables には入力済み情報を必ず反映する。",
  ].join("\n");
}

export function buildPromptRuntimeSection({
  intent,
  form,
  values,
  includeSample = false,
}: CompilePromptInput): string {
  const goal = intent.trim() || form.formTitle;
  const userInputs = compileUserInputs(form, values);

  return [
    "## 実行コンテキスト",
    `- 依頼テーマ: ${goal}`,
    "",
    "## 入力済み変数",
    ...userInputs,
    "",
    "## 補助情報",
    `- フォームタイトル: ${form.formTitle}`,
    `- フォーム説明: ${form.formDescription}`,
    "",
    "## 追加指示",
    "- 上記情報を統合して systemPrompt を作成する。",
    "- 省略せず、各セクションを必ず埋める。",
    ...(includeSample
      ? ["- sampleOutput を1つだけ作成する（冗長な説明は不要）。"]
      : []),
  ].join("\n");
}

export function buildSystemPromptFallback({
  intent,
  form,
  values,
}: CompilePromptInput): string {
  const goal = intent.trim() || form.formTitle;
  const userInputs = compileUserInputs(form, values);

  return [
    "# Role",
    "あなたはユーザー意図を高精度で実行可能な成果物へ変換するAIアシスタントです。",
    "",
    "# Goal",
    `依頼テーマ「${goal}」を達成するために、最適な出力を生成する。`,
    "",
    "# Constraints",
    "- 回答は日本語で行う。",
    "- 与えられた Variables を最優先で反映する。",
    "- 不明点は文脈に沿って妥当な仮定を置き、必要に応じて仮定を明示する。",
    "- 実行可能で具体的な内容を優先する。",
    "",
    "# Variables",
    ...userInputs,
    "",
    "# Output Format",
    "1. 要点整理",
    "2. 本文",
    "3. 次アクション（必要時のみ）",
  ].join("\n");
}

export function buildSampleOutputFallback({
  intent,
  form,
  values,
}: CompilePromptInput): string {
  const goal = intent.trim() || form.formTitle;
  const userInputs = compileUserInputs(form, values).slice(0, 3);

  return [
    `【サンプル出力】${goal}`,
    "",
    "要点:",
    ...userInputs,
    "",
    "本文:",
    "この内容は system prompt の実行結果サンプルです。必要に応じて文体や制約を調整して利用してください。",
  ].join("\n");
}

export function compilePrompt({
  intent,
  form,
  values,
  includeSample = false,
}: CompilePromptInput): string {
  const staticSection = buildPromptStaticSection(includeSample);
  const runtimeSection = buildPromptRuntimeSection({ intent, form, values, includeSample });

  return [
    staticSection,
    "",
    runtimeSection,
  ].join("\n");
}
