import { NextRequest, NextResponse } from "next/server";
import { FormGenerateRequest } from "@/lib/contracts/morph-api";
import { generateFormWithGemini } from "@/lib/server/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Partial<FormGenerateRequest>;

  try {
    body = (await request.json()) as Partial<FormGenerateRequest>;
  } catch {
    return NextResponse.json(
      { error: "JSON body の解析に失敗しました。" },
      { status: 400 },
    );
  }

  const intent = typeof body.intent === "string" ? body.intent.trim() : "";

  if (!intent) {
    return NextResponse.json(
      { error: "intent は必須です。" },
      { status: 400 },
    );
  }

  const result = await generateFormWithGemini(intent);

  return NextResponse.json({
    form: result.form,
    provider: result.provider,
    model: result.model,
    warning: result.warning,
    cache: result.cache,
  });
}
