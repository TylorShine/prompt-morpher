import { NextRequest, NextResponse } from "next/server";
import { FormAutoFillRequest } from "@/lib/contracts/morph-api";
import { normalizeDynamicForm, normalizeFormValues } from "@/lib/form-normalizer";
import { generateAutoFillWithGemini } from "@/lib/server/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Partial<FormAutoFillRequest>;

  try {
    body = (await request.json()) as Partial<FormAutoFillRequest>;
  } catch {
    return NextResponse.json(
      { error: "JSON body の解析に失敗しました。" },
      { status: 400 },
    );
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  const form = normalizeDynamicForm(body.form);
  const targetFieldId =
    typeof body.targetFieldId === "string" && body.targetFieldId.trim().length > 0
      ? body.targetFieldId.trim()
      : undefined;

  if (!intent) {
    return NextResponse.json(
      { error: "intent は必須です。" },
      { status: 400 },
    );
  }

  if (!form) {
    return NextResponse.json(
      { error: "form の形式が不正です。" },
      { status: 400 },
    );
  }

  if (targetFieldId && !form.fields.some((field) => field.id === targetFieldId)) {
    return NextResponse.json(
      { error: "targetFieldId が form に存在しません。" },
      { status: 400 },
    );
  }

  const values = normalizeFormValues(body.values, form);
  const result = await generateAutoFillWithGemini({
    intent,
    form,
    values,
    targetFieldId,
    onlyEmpty: body.onlyEmpty === true,
  });

  return NextResponse.json({
    suggestions: result.suggestions,
    filledFieldIds: result.filledFieldIds,
    provider: result.provider,
    model: result.model,
    warning: result.warning,
    cache: result.cache,
  });
}
