import { DynamicForm, FormField, FormValues, PrimitiveFieldValue } from "@/lib/form-schema";

const systemPromptTemplate: DynamicForm = {
  formTitle: "System Prompt 作成フォーム",
  formDescription:
    "このフォームは最終成果物を直接作るのではなく、System Promptを設計するための条件を集めます。",
  fields: [
    {
      id: "system_role",
      uiType: "text_input",
      label: "AIの役割 (Role)",
      placeholder: "例: プロの編集者 / カスタマーサポート担当",
      required: true,
      aiHelper: true,
    },
    {
      id: "primary_goal",
      uiType: "text_area",
      label: "達成したい目的 (Goal)",
      placeholder: "例: 初心者にも理解しやすい説明文を作る",
      required: true,
      aiHelper: true,
      validation: {
        maxLength: 600,
      },
    },
    {
      id: "target_user",
      uiType: "text_input",
      label: "想定読者・利用者",
      placeholder: "例: 一般ユーザー、20代女性、B2B営業担当",
      required: true,
      aiHelper: true,
    },
    {
      id: "must_include",
      uiType: "tags_input",
      label: "必ず含める要素",
      description: "重要なキーワードや含める観点を追加",
      placeholder: "例: 箇条書き, 具体例, 行動提案",
      required: false,
      aiHelper: true,
      maxTags: 8,
    },
    {
      id: "must_avoid",
      uiType: "tags_input",
      label: "避ける要素",
      description: "避けたい表現や禁止事項",
      placeholder: "例: 断定表現, 専門用語の多用",
      required: false,
      aiHelper: true,
      maxTags: 8,
    },
    {
      id: "tone_style",
      uiType: "radio",
      label: "トーン",
      options: [
        { label: "丁寧で分かりやすい", value: "clear_polite" },
        { label: "簡潔で実務的", value: "concise_business" },
        { label: "親しみやすい", value: "friendly" },
      ],
      required: true,
      aiHelper: false,
    },
    {
      id: "output_format",
      uiType: "select",
      label: "出力形式",
      options: [
        { label: "見出し+本文（Markdown）", value: "markdown_sections" },
        { label: "箇条書き中心", value: "bullet_first" },
        { label: "JSON構造", value: "json" },
      ],
      required: true,
      aiHelper: false,
    },
    {
      id: "strictness",
      uiType: "slider",
      label: "厳密さ",
      description: "高いほど制約を厳格に適用",
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 3,
      unit: "段階",
      required: true,
      aiHelper: false,
    },
  ],
};

function cloneField(field: FormField): FormField {
  if (field.uiType === "select" || field.uiType === "radio") {
    return {
      ...field,
      options: field.options.map((option) => ({ ...option })),
    };
  }

  return { ...field };
}

function cloneForm(template: DynamicForm): DynamicForm {
  return {
    ...template,
    fields: template.fields.map(cloneField),
  };
}

export function buildFormFromIntent(intent: string): DynamicForm {
  void intent;
  return cloneForm(systemPromptTemplate);
}

export function buildInitialValues(form: DynamicForm): FormValues {
  const values: FormValues = {};

  for (const field of form.fields) {
    if (field.defaultValue !== undefined) {
      values[field.id] = field.defaultValue;
      continue;
    }

    switch (field.uiType) {
      case "switch":
        values[field.id] = false;
        break;
      case "slider":
        values[field.id] = field.min;
        break;
      case "tags_input":
        values[field.id] = [];
        break;
      default:
        values[field.id] = "";
        break;
    }
  }

  return values;
}

function midpoint(min: number, max: number, step = 1): number {
  const raw = min + (max - min) / 2;
  return Math.round(raw / step) * step;
}

export function suggestFieldValue(
  field: FormField,
  intent: string,
): PrimitiveFieldValue {
  const lowerId = field.id.toLowerCase();

  if (field.uiType === "select" || field.uiType === "radio") {
    return field.options[0]?.value ?? "";
  }

  if (field.uiType === "slider") {
    return midpoint(field.min, field.max, field.step ?? 1);
  }

  if (field.uiType === "switch") {
    return true;
  }

  if (field.uiType === "tags_input") {
    if (lowerId.includes("avoid")) {
      return ["曖昧表現", "冗長な説明"];
    }
    return ["具体例", "実行手順", "チェック項目"];
  }

  if (lowerId.includes("role")) {
    return "ユーザー意図を構造化して実行可能な出力を作る専門アシスタント";
  }

  if (lowerId.includes("goal")) {
    return `${intent || "この依頼"}に対して再利用可能な高品質System Promptを作る`;
  }

  if (lowerId.includes("target")) {
    return "一般ユーザー";
  }

  if (lowerId.includes("format")) {
    return "markdown_sections";
  }

  return `${intent || "このテーマ"}に最適化した条件を提案してください。`;
}
