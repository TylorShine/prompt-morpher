import { getAppSettings as getClientAppSettings } from "@/lib/client/settings";

function getEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function getSettings() {
  if (typeof window !== "undefined") {
    return getClientAppSettings();
  }

  return {
    aiProvider: getEnv("AI_PROVIDER", "gemini_api"),
    apiKey: getEnv("GEMINI_API_KEY", "") || getEnv("OPENAI_API_KEY", ""),
    model: getEnv("GEMINI_MODEL", "") || getEnv("OPENAI_MODEL", ""),
    apiEndpoint: getEnv("OPENAI_COMPATIBLE_API_ENDPOINT", ""),
  };
}

const settings = getSettings();

export const AI_PROVIDER = settings.aiProvider;
export const GEMINI_API_KEY = settings.apiKey;
export const GEMINI_MODEL = settings.model;
export const VERTEX_PROJECT_ID = getEnv("VERTEX_PROJECT_ID", "");
export const VERTEX_LOCATION = getEnv("VERTEX_LOCATION", "us-central1");
export const OPENAI_API_KEY = settings.apiKey;
export const OPENAI_MODEL = settings.model;
export const OPENAI_COMPATIBLE_API_ENDPOINT = settings.apiEndpoint;
