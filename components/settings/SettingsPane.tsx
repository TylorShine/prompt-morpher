import React, { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getAppSettings, saveAppSettings, AppSettings } from "@/lib/client/settings";

export function SettingsPane() {
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());

  const handleSave = () => {
    saveAppSettings(settings);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setSettings((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Settings</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="aiProvider" className="block text-sm font-medium">
            AI Provider
          </label>
          <select
            id="aiProvider"
            value={settings.aiProvider}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          >
            <option value="gemini_api">Gemini API</option>
            <option value="vertex_ai">Vertex AI</option>
            <option value="openai">OpenAI</option>
            <option value="openai_compatible">OpenAI Compatible API</option>
          </select>
        </div>
        {settings.aiProvider === "openai_compatible" && (
          <div>
            <label htmlFor="apiEndpoint" className="block text-sm font-medium">
              API Endpoint
            </label>
            <input
              type="text"
              id="apiEndpoint"
              value={settings.apiEndpoint}
              onChange={handleChange}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        )}
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium">
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={settings.apiKey}
            onChange={handleChange}
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium">
            Model
          </label>
          <input
            type="text"
            id="model"
            value={settings.model}
            onChange={handleChange}
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          Save
        </button>
      </div>
    </div>
  );
}
