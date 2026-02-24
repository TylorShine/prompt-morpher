import { GoogleGenAI } from "@google/genai";
import { BaseLLMProvider, GenerateTextOptions } from "./base";

export interface CreateContextCacheOptions {
  cacheKey: string;
  staticContext: string;
  ttlSeconds: number;
}

export interface CreatedContextCache {
  cacheName: string;
  expireAtMs: number;
}

export class GeminiProvider extends BaseLLMProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(client: GoogleGenAI, model: string) {
    super();
    this.client = client;
    this.model = model;
  }

  async generateText(options: GenerateTextOptions): Promise<string | null> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: options.prompt,
      config: {
        temperature: options.temperature,
        responseMimeType: options.responseMimeType,
        responseJsonSchema: options.responseJsonSchema,
        cachedContent: options.cachedContent,
      },
    });

    const text = response.text?.trim();
    return text && text.length > 0 ? text : null;
  }

  async createContextCache(options: CreateContextCacheOptions): Promise<CreatedContextCache> {
    const created = await this.client.caches.create({
      model: this.model,
      config: {
        displayName: options.cacheKey,
        ttl: `${options.ttlSeconds}s`,
        contents: options.staticContext,
      },
    });

    if (!created.name) {
      throw new Error("Context cache name is missing.");
    }

    const expireAtMs = created.expireTime
      ? Date.parse(created.expireTime)
      : Date.now() + options.ttlSeconds * 1000;

    return {
      cacheName: created.name,
      expireAtMs: Number.isFinite(expireAtMs)
        ? expireAtMs
        : Date.now() + options.ttlSeconds * 1000,
    };
  }
}
