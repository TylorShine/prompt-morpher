export interface GenerateTextOptions {
  prompt: string;
  temperature?: number;
  responseMimeType?: string;
  responseJsonSchema?: unknown;
  cachedContent?: string;
}

export abstract class BaseLLMProvider {
  abstract generateText(options: GenerateTextOptions): Promise<string | null>;
}
