"use client";

import { KeyboardEvent } from "react";

type IntentInputMode = "simple" | "detailed";

interface IntentPaneProps {
  mode: IntentInputMode;
  intent: string;
  keywords: string[];
  keywordInput: string;
  simpleIntentPreview: string;
  presets: readonly string[];
  isFormLoading: boolean;
  onModeChange: (mode: IntentInputMode) => void;
  onIntentChange: (value: string) => void;
  onKeywordInputChange: (value: string) => void;
  onKeywordAdd: (keyword: string) => void;
  onKeywordRemove: (keyword: string) => void;
  onKeywordClear: () => void;
  onGenerate: () => void;
  onPreset: (preset: string) => void;
}

const keywordSuggestions = [
  "Instagram投稿",
  "営業メール",
  "初心者向け",
  "丁寧トーン",
  "箇条書き中心",
  "200文字以内",
] as const;

export function IntentPane({
  mode,
  intent,
  keywords,
  keywordInput,
  simpleIntentPreview,
  presets,
  isFormLoading,
  onModeChange,
  onIntentChange,
  onKeywordInputChange,
  onKeywordAdd,
  onKeywordRemove,
  onKeywordClear,
  onGenerate,
  onPreset,
}: IntentPaneProps) {
  const handleKeywordInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    onKeywordAdd(keywordInput);
  };

  return (
    <>
      <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-r from-sky-50/85 to-cyan-50/75 p-3 dark:border-sky-800/70 dark:from-[#0b0d10] dark:to-[#171c23]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
          Start Here
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">1. テーマ入力</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          キーワードを積み上げるシンプル入力か、詳細テキスト入力を選べます。
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-[#171c23]/88">
        <button
          type="button"
          onClick={() => onModeChange("simple")}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            mode === "simple"
              ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
              : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          シンプル
        </button>
        <button
          type="button"
          onClick={() => onModeChange("detailed")}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            mode === "detailed"
              ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
              : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          詳細テキスト
        </button>
      </div>

      {mode === "simple" ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(event) => onKeywordInputChange(event.target.value)}
              onKeyDown={handleKeywordInputKeyDown}
              placeholder="キーワードを追加（Enterで確定）"
              className="w-full rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
            />
            <button
              type="button"
              onClick={() => onKeywordAdd(keywordInput)}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-[#171c23]"
            >
              追加
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {keywords.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">キーワードを追加してください。</p>
            )}
            {keywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => onKeywordRemove(keyword)}
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 dark:border-sky-700/70 dark:bg-[#171c23] dark:text-sky-300 dark:hover:border-sky-500 dark:hover:bg-[#212832]"
                title="タップで削除"
              >
                {keyword}
                <span className="text-[10px]">x</span>
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">ヒント: 用途 + 対象 + トーン + 制約</p>
            {keywords.length > 0 && (
              <button
                type="button"
                onClick={onKeywordClear}
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                クリア
              </button>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#111419]/92">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Theme Preview
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              {simpleIntentPreview || "キーワードを追加するとテーマ文がここに表示されます。"}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Keyword Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {keywordSuggestions.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => onKeywordAdd(keyword)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-[#0b0d10] dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-[#171c23]"
                >
                  + {keyword}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={intent}
            onChange={(event) => onIntentChange(event.target.value)}
            className="mt-3 min-h-40 w-full resize-y rounded-2xl border border-slate-200/90 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-md shadow-slate-900/5 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-[#0b0d10] dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/50"
          />

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">ヒント: ユースケース + 対象 + トーン</p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-[#171c23] dark:text-slate-300">
              {intent.trim().length} chars
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Quick Presets
            </p>
            <div className="flex gap-2 overflow-auto pb-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPreset(preset)}
                  className="min-w-56 shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-[#0b0d10] dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-[#171c23]"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={isFormLoading}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 transition hover:brightness-105 active:brightness-95 disabled:opacity-70 dark:shadow-black/35"
      >
        {isFormLoading
          ? "フォーム生成中..."
          : mode === "simple"
            ? "キーワードからフォームを生成"
            : "フォームを生成"}
      </button>
    </>
  );
}

