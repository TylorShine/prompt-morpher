import { GoogleGenAI } from "@google/genai";

export type ProviderKind = "gemini_api" | "vertex_ai";

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

interface CreateContextCacheOptions {
  cacheKey: string;
  staticContext: string;
  ttlSeconds: number;
}

export interface CreatedContextCache {
  cacheName: string;
  expireAtMs: number;
}

export class UnifiedAiProvider {
  readonly info: ProviderInfo;
  private readonly client: GoogleGenAI;

  constructor(info: ProviderInfo, client: GoogleGenAI) {
    this.info = info;
    this.client = client;
  }

  async generateText(options: GenerateTextOptions): Promise<string | null> {
    const response = await this.client.models.generateContent({
      model: this.info.model,
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
      model: this.info.model,
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

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function getPreferredProvider(): string {
  return (process.env.AI_PROVIDER?.trim().toLowerCase() || "auto").replace("-", "_");
}

function getVertexProjectId(): string | undefined {
  return (
    process.env.VERTEX_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim()
  );
}

function getVertexLocation(): string {
  return process.env.VERTEX_LOCATION?.trim() || "us-central1";
}

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim();
}

function isLikelyVertexExpressApiKey(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return value.trim().startsWith("AQ.");
}

function getVertexExpressApiKey(): string | undefined {
  const explicit = process.env.VERTEX_EXPRESS_API_KEY?.trim();
  if (explicit) {
    return explicit;
  }

  const shared = getGeminiApiKey();
  if (isLikelyVertexExpressApiKey(shared)) {
    return shared;
  }

  return undefined;
}

function buildGeminiProvider(model: string): ProviderResolutionResult {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      warning: "GEMINI_API_KEY が未設定です。Gemini API direct mode を利用できません。",
    };
  }

  if (isLikelyVertexExpressApiKey(apiKey)) {
    return {
      ok: false,
      warning:
        "GEMINI_API_KEY が Vertex Express mode 用のキー形式に見えます。AI_PROVIDER=vertex_ai を使用するか、Gemini API key (AIza...) を設定してください。",
    };
  }

  const client = new GoogleGenAI({ apiKey });
  return {
    ok: true,
    provider: new UnifiedAiProvider(
      { kind: "gemini_api", model },
      client,
    ),
  };
}

function buildVertexProvider(model: string): ProviderResolutionResult {
  const project = getVertexProjectId();
  if (project) {
    const location = getVertexLocation();
    const client = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });

    return {
      ok: true,
      provider: new UnifiedAiProvider(
        { kind: "vertex_ai", model },
        client,
      ),
    };
  }

  const expressApiKey = getVertexExpressApiKey();
  if (!expressApiKey) {
    return {
      ok: false,
      warning:
        "VERTEX_PROJECT_ID (または GOOGLE_CLOUD_PROJECT) が未設定です。Vertex standard mode には project/location + ADC が必要です。Express mode を使う場合は VERTEX_EXPRESS_API_KEY（または AQ. 形式の GEMINI_API_KEY）を設定してください。",
    };
  }

  const client = new GoogleGenAI({
    vertexai: true,
    apiKey: expressApiKey,
  });

  return {
    ok: true,
    provider: new UnifiedAiProvider(
      { kind: "vertex_ai", model },
      client,
    ),
  };
}

export function resolveProvider(): ProviderResolutionResult {
  const model = getModelName();
  const preferred = getPreferredProvider();

  if (preferred === "vertex_ai" || preferred === "vertex") {
    return buildVertexProvider(model);
  }

  if (preferred === "gemini_api" || preferred === "gemini") {
    return buildGeminiProvider(model);
  }

  const vertex = buildVertexProvider(model);
  if (vertex.ok) {
    return vertex;
  }

  const gemini = buildGeminiProvider(model);
  if (gemini.ok) {
    return gemini;
  }

  return {
    ok: false,
    warning:
      "利用可能なAI providerが見つかりません。GEMINI_API_KEY または VERTEX_PROJECT_ID を設定してください。",
  };
}
