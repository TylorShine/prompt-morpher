export type ProviderKind = "gemini_api" | "vertex_ai" | "openai";

export interface ProviderInfo {
  kind: ProviderKind;
  model: string;
}

interface ProviderResolutionSuccess {
  ok: true;
  provider: UnifiedAiProvider;
  warning?: string;
}

interface ProviderResolutionFailure {
  ok: false;
  warning: string;
}

export type ProviderResolutionResult = ProviderResolutionSuccess | ProviderResolutionFailure;

interface GenerateTextOptions {
  prompt: string;
  temperature?: number;
  responseMimeType?: string;
  responseJsonSchema?: unknown;
  cachedContent?: string;
}

export class UnifiedAiProvider {
  readonly info: ProviderInfo;
  public readonly client: BaseLLMProvider;

  constructor(info: ProviderInfo, client: BaseLLMProvider) {
    this.info = info;
    this.client = client;
  }

  async generateText(options: GenerateTextOptions): Promise<string | null> {
    return this.client.generateText(options);
  }
}


import { BaseLLMProvider } from "../llm/base";
import { resolveLLMProvider } from "../llm";

import { AppSettings } from "@/lib/client/settings";

export function resolveProvider(settings?: AppSettings): ProviderResolutionResult {
  try {
    const provider = resolveLLMProvider(settings);
    return {
      ok: true,
      provider: new UnifiedAiProvider(
        {
          kind: (settings?.aiProvider ?? "gemini_api") as ProviderKind,
          model: settings?.model ?? "gemini-1.5-flash",
        },
        provider,
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      warning: `Failed to resolve AI provider: ${message}`,
    };
  }
}
