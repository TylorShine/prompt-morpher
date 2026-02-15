import {
  FormAutoFillRequest,
  FormAutoFillResponse,
  FormGenerateRequest,
  FormGenerateResponse,
  PromptGenerateRequest,
  PromptGenerateResponse,
} from "@/lib/contracts/morph-api";

async function postJson<TRequest, TResponse>(
  url: string,
  body: TRequest,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as TResponse & { error?: string };

  if (!response.ok) {
    const message = payload?.error ?? "API request failed.";
    throw new Error(message);
  }

  return payload;
}

export async function generateFormApi(
  request: FormGenerateRequest,
): Promise<FormGenerateResponse> {
  return postJson<FormGenerateRequest, FormGenerateResponse>(
    "/api/form/generate",
    request,
  );
}

export async function generatePromptApi(
  request: PromptGenerateRequest,
): Promise<PromptGenerateResponse> {
  return postJson<PromptGenerateRequest, PromptGenerateResponse>(
    "/api/prompt/generate",
    request,
  );
}

export async function autoFillFormApi(
  request: FormAutoFillRequest,
): Promise<FormAutoFillResponse> {
  return postJson<FormAutoFillRequest, FormAutoFillResponse>(
    "/api/form/autofill",
    request,
  );
}
