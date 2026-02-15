import fs from "node:fs";
import path from "node:path";

interface FormGenerationPolicy {
  name: string;
  title: string;
  goal: string[];
  principles: string[];
  uiTypeRules: string[];
  fieldBlueprint: string[];
  constraints: string[];
}

const defaultPolicy: FormGenerationPolicy = {
  name: "system-prompt-form-default",
  title: "System Prompt Builder Form Policy",
  goal: [
    "ユーザーのテーマに対して、System Prompt を作るための入力フォームJSONを生成する。",
    "コンテンツ成果物そのもの（例: 小説プロット）を直接作るフォームにはしない。",
  ],
  principles: [
    "フォームは System Prompt 設計パラメータを収集する。",
    "Role / Goal / Constraints / Variables / Output Format を中心に項目を作る。",
    "未確定項目は aiHelper=true を活用する。",
  ],
  uiTypeRules: [
    "text_input: 単語〜短文",
    "text_area: 要件・背景・制約",
    "radio: 少数選択",
    "select: 複数候補から選択",
    "slider: 厳密さや長さなど連続量",
    "switch: ON/OFF",
    "tags_input: 必須語句・禁止語句",
  ],
  fieldBlueprint: [
    "system_role (text_input)",
    "primary_goal (text_area)",
    "target_user (text_input)",
    "must_include (tags_input)",
    "must_avoid (tags_input)",
    "tone_style (radio/select)",
    "output_format (select)",
    "strictness (slider)",
  ],
  constraints: [
    "fields[].id は snake_case 英字",
    "fields は 5〜9 項目",
    "formTitle と formDescription は必須",
    "JSONのみ出力",
  ],
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function parsePolicy(value: unknown): FormGenerationPolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const goal = normalizeStringList(record.goal);
  const principles = normalizeStringList(record.principles);
  const uiTypeRules = normalizeStringList(record.uiTypeRules);
  const fieldBlueprint = normalizeStringList(record.fieldBlueprint);
  const constraints = normalizeStringList(record.constraints);

  if (
    !name ||
    !title ||
    goal.length === 0 ||
    principles.length === 0 ||
    uiTypeRules.length === 0 ||
    fieldBlueprint.length === 0 ||
    constraints.length === 0
  ) {
    return null;
  }

  return {
    name,
    title,
    goal,
    principles,
    uiTypeRules,
    fieldBlueprint,
    constraints,
  };
}

let cachedPolicy: FormGenerationPolicy | null = null;

function resolvePolicyPath(): string {
  const configured = process.env.FORM_GENERATION_POLICY_PATH?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }

  return path.resolve(process.cwd(), "config/form-generation-policy.json");
}

export function loadFormGenerationPolicy(): FormGenerationPolicy {
  if (cachedPolicy) {
    return cachedPolicy;
  }

  try {
    const policyPath = resolvePolicyPath();
    const raw = fs.readFileSync(policyPath, "utf8");
    const parsed = JSON.parse(raw);
    const normalized = parsePolicy(parsed);
    if (normalized) {
      cachedPolicy = normalized;
      return normalized;
    }
  } catch {
    // fallback below
  }

  cachedPolicy = defaultPolicy;
  return defaultPolicy;
}
