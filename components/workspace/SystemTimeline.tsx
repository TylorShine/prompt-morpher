"use client";

import { useState } from "react";

export interface TimelineEntry {
  id: string;
  atLabel: string;
  title: string;
  detail?: string;
  level: "info" | "success" | "warning" | "error";
}

interface SystemTimelineProps {
  entries: TimelineEntry[];
}

function levelStyles(level: TimelineEntry["level"]): string {
  switch (level) {
    case "success":
      return "border-emerald-300/80 bg-emerald-50/85 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/35 dark:text-emerald-300";
    case "warning":
      return "border-amber-300/80 bg-amber-50/85 text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/35 dark:text-amber-300";
    case "error":
      return "border-rose-300/80 bg-rose-50/85 text-rose-700 dark:border-rose-700/70 dark:bg-rose-950/35 dark:text-rose-300";
    case "info":
    default:
      return "border-slate-300/80 bg-slate-50/85 text-slate-700 dark:border-slate-700/80 dark:bg-[#111419]/90 dark:text-slate-200";
  }
}

export function SystemTimeline({ entries }: SystemTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm dark:border-slate-700/80 dark:bg-[#111419]/92">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isOpen}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            SYSTEM LOG
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-[#171c23] dark:text-slate-300">
            {isOpen ? "Hide" : `Show (${entries.length})`}
          </span>
        </button>
      </div>
      {isOpen && (
        <div className="mt-2 max-h-44 space-y-2 overflow-auto pr-1">
          {entries.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-[#171c23] dark:text-slate-300">
              まだイベントはありません。
            </p>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border px-2.5 py-2 text-xs shadow-sm ${levelStyles(entry.level)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{entry.title}</span>
                <span className="font-mono opacity-75">{entry.atLabel}</span>
              </div>
              {entry.detail && <p className="mt-1 leading-relaxed">{entry.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

