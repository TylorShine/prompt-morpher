import { NextRequest, NextResponse } from "next/server";
import { PromptGenerateRequest } from "@/lib/contracts/morph-api";
import { normalizeDynamicForm, normalizeFormValues } from "@/lib/form-normalizer";
import { generatePrompt } from "@/lib/server/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Partial<PromptGenerateRequest>;

  try {
    body = (await request.json()) as Partial<PromptGenerateRequest>;
  } catch {
    return NextResponse.json(
      { error: "JSON body の解析に失敗しました。" },
      { status: 400 },
    );
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  const form = normalizeDynamicForm(body.form);

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

  const includeSample = body.includeSample === true;
  const values = normalizeFormValues(body.values, form);
  const result = await generatePrompt({
    intent,
    form,
    values,
    includeSample,
    settings: body.settings,
  });

  return NextResponse.json({
    systemPrompt: result.result,
    sampleOutput: result.sampleOutput,
    result: result.result,
    compiledPrompt: result.compiledPrompt,
    provider: result.provider,
    model: result.model,
    warning: result.warning,
    cache: result.cache,
  });
}
