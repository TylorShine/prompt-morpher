"use client";

import { useEffect, useRef, useState } from "react";
import { FormValues } from "@/lib/form-schema";
import { SystemTimeline, TimelineEntry } from "@/components/workspace/SystemTimeline";

interface PromptForgePanelProps {
  finalPrompt: string;
  sampleOutput: string;
  includeSample: boolean;
  onIncludeSampleChange: (next: boolean) => void;
  isPromptLoading: boolean;
  formProvider: string;
  promptProvider: string;
  modelName: string | null;
  formCacheStatus: string;
  promptCacheStatus: string;
  warningMessage: string | null;
  errorMessage: string | null;
  lastValues: FormValues | null;
  timeline: TimelineEntry[];
}

interface StreamedPromptTextProps {
  finalPrompt: string;
}

function StreamedPromptText({ finalPrompt }: StreamedPromptTextProps) {
  const [visibleLineCount, setVisibleLineCount] = useState(0);
  const timerRef = useRef<number | null>(null);
  const lines = finalPrompt ? finalPrompt.split("\n") : [];

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!finalPrompt) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setVisibleLineCount((previous) => {
        const next = previous + 1;
        if (next >= lines.length) {
          clearTimer();
          return lines.length;
        }
        return next;
      });
    }, 28);

    return () => {
      clearTimer();
    };
  }, [finalPrompt, lines.length]);

  if (!finalPrompt) {
    return (
      <>{"まだ system prompt は生成されていません。中央のフォームを入力して「Generate System Prompt」を押してください。"}</>
    );
  }

  return <>{lines.slice(0, visibleLineCount).join("\n")}</>;
}

export function PromptForgePanel({
  finalPrompt,
  sampleOutput,
  includeSample,
  onIncludeSampleChange,
  isPromptLoading,
  formProvider,
  promptProvider,
  modelName,
  formCacheStatus,
  promptCacheStatus,
  warningMessage,
  errorMessage,
  lastValues,
  timeline,
}: PromptForgePanelProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isSubmittedValuesOpen, setIsSubmittedValuesOpen] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  const clearCopyTimer = () => {
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    };
  }, []);

  const showCopyMessage = (message: string) => {
    clearCopyTimer();
    setCopyMessage(message);
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyMessage(null);
      copyResetTimerRef.current = null;
    }, 1800);
  };

  const handleCopySystemPrompt = async () => {
    if (!finalPrompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(finalPrompt);
      showCopyMessage("system prompt をコピーしました");
    } catch {
      showCopyMessage("コピーに失敗しました");
    }
  };

  const handleDownloadSystemPrompt = () => {
    if (!finalPrompt) {
      return;
    }

    const blob = new Blob([finalPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "morphprompt-system-prompt.md";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/85 to-sky-50/70 p-3 dark:border-indigo-800/70 dark:from-[#0b0d10] dark:to-[#171c23]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
          Final Stage
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">3. System Prompt Forge</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          生成過程を可視化しながら system prompt を構築します。
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-slate-900 px-2 py-1 font-semibold text-white shadow-sm">
          form: {formProvider}
        </span>
        <span className="rounded-full bg-slate-600 px-2 py-1 font-semibold text-white shadow-sm">
          {formCacheStatus}
        </span>
        <span className="rounded-full bg-sky-700 px-2 py-1 font-semibold text-white shadow-sm">
          prompt: {promptProvider}
        </span>
        <span className="rounded-full bg-indigo-900 px-2 py-1 font-semibold text-white shadow-sm">
          {promptCacheStatus}
        </span>
        {modelName && (
          <span className="rounded-full bg-amber-500 px-2 py-1 font-semibold text-white shadow-sm">
            model: {modelName}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#111419]/92">
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">結果サンプル生成</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">必要なときだけON（追加トークン消費）</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={includeSample}
          onClick={() => onIncludeSampleChange(!includeSample)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
            includeSample
              ? "border-sky-600 bg-sky-600"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-[#202730]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              includeSample ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {warningMessage && (
        <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/35 dark:text-amber-300">
          {warningMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/70 dark:bg-rose-950/35 dark:text-rose-300">
          {errorMessage}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopySystemPrompt}
          disabled={!finalPrompt || isPromptLoading}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-[#171c23]"
        >
          Copy System Prompt
        </button>
        <button
          type="button"
          onClick={handleDownloadSystemPrompt}
          disabled={!finalPrompt || isPromptLoading}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-[#171c23]"
        >
          Download .md
        </button>
        {copyMessage && (
          <span className="text-xs font-medium text-sky-700">{copyMessage}</span>
        )}
      </div>

      <pre className="mt-3 min-h-80 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-cyan-100 shadow-inner shadow-slate-950/60">
        {isPromptLoading
          ? "Forging system prompt...\n・構造を最適化中\n・制約条件を抽出中\n・出力フォーマットを整形中\n・文体を補正中"
          : (
            <StreamedPromptText
              key={finalPrompt || "empty"}
              finalPrompt={finalPrompt}
            />
          )}
      </pre>

      {includeSample && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#111419]/92">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Sample Output
          </p>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
            {sampleOutput || "サンプルはまだ生成されていません。"}
          </pre>
        </div>
      )}

      <SystemTimeline entries={timeline} />

      {lastValues && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#111419]/92">
          <button
            type="button"
            onClick={() => setIsSubmittedValuesOpen((previous) => !previous)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={isSubmittedValuesOpen}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Submitted Values
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-[#171c23] dark:text-slate-300">
              {isSubmittedValuesOpen
                ? "Hide"
                : `Show (${Object.keys(lastValues).length})`}
            </span>
          </button>

          {isSubmittedValuesOpen ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              {JSON.stringify(lastValues, null, 2)}
            </pre>
          ) : null}
        </div>
      )}
    </>
  );
}

