"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "theme-mode";

type ThemeMode = "light" | "dark";

interface ThemeToggleProps {
  compact?: boolean;
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setMode(isDark ? "dark" : "light");
    }, 0);

    return () => {
      window.clearTimeout(initTimer);
    };
  }, []);

  const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
  const modeLabel = mode === "dark" ? "Dark" : "Light";
  const nextModeLabel = nextMode === "dark" ? "Dark" : "Light";

  const handleToggle = () => {
    applyTheme(nextMode);
    setMode(nextMode);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-[#171c23] ${
        compact ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs"
      }`}
      aria-label={`Switch to ${nextModeLabel} mode`}
      title={`Switch to ${nextModeLabel} mode`}
    >
      {modeLabel}
    </button>
  );
}

