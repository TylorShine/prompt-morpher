import { GoogleGenAI } from "@google/genai";
import {
  AI_PROVIDER,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  VERTEX_PROJECT_ID,
  VERTEX_LOCATION,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OPENAI_COMPATIBLE_API_ENDPOINT,
} from "./config";
import { GeminiProvider } from "./llm/gemini";
import { OpenAIProvider } from "./llm/openai";
import { BaseLLMProvider } from "./llm/base";

import { AppSettings } from "@/lib/client/settings";

export function resolveLLMProvider(settings?: AppSettings): BaseLLMProvider {
  const provider = (settings?.aiProvider ?? AI_PROVIDER).toLowerCase();
  const apiKey = settings?.apiKey;
  const model = settings?.model;
  const apiEndpoint = settings?.apiEndpoint;

  if (provider === "openai") {
    const key = apiKey ?? OPENAI_API_KEY;
    if (!key) throw new Error("OpenAI API key is not set.");
    return new OpenAIProvider(key, model ?? OPENAI_MODEL);
  }

  if (provider === "openai_compatible") {
    const key = apiKey ?? OPENAI_API_KEY;
    if (!key) throw new Error("OpenAI-compatible API key is not set.");
    return new OpenAIProvider(
      key,
      model ?? OPENAI_MODEL,
      apiEndpoint ?? OPENAI_COMPATIBLE_API_ENDPOINT,
    );
  }

  if (provider === "vertex_ai") {
    const projectId = VERTEX_PROJECT_ID;
    if (!projectId) throw new Error("Vertex AI project ID is not set.");
    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: VERTEX_LOCATION,
    });
    return new GeminiProvider(client, model ?? GEMINI_MODEL);
  }

  const key = apiKey ?? GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key is not set.");
  const client = new GoogleGenAI({ apiKey: key });
  return new GeminiProvider(client, model ?? GEMINI_MODEL);
}
