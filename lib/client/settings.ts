export interface AppSettings {
  aiProvider: "gemini_api" | "vertex_ai" | "openai" | "openai_compatible";
  apiKey: string;
  model: string;
  apiEndpoint?: string;
}

export function getAppSettings(): AppSettings {
  const defaults: AppSettings = {
    aiProvider: "gemini_api",
    apiKey: "",
    model: "",
    apiEndpoint: "",
  };

  if (typeof window === "undefined") {
    return defaults;
  }

  const settingsString = localStorage.getItem("app-settings");
  if (settingsString) {
    try {
      const storedSettings = JSON.parse(settingsString);
      return { ...defaults, ...storedSettings };
    } catch (e) {
      console.error("Failed to parse app-settings from localStorage", e);
    }
  }

  return defaults;
}

export function saveAppSettings(settings: AppSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem("app-settings", JSON.stringify(settings));
  }
}
