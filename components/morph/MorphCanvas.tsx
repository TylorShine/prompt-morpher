"use client";

import { useEffect, useRef, useState } from "react";
import { DynamicFormRenderer } from "@/components/dynamic-form/DynamicFormRenderer";
import { DynamicForm, FormValues } from "@/lib/form-schema";
import { UIPhase } from "@/lib/ui-phase";

interface MorphCanvasProps {
  phase: UIPhase;
  formData: DynamicForm;
  intent: string;
  isSubmitting: boolean;
  onSubmit: (values: FormValues) => void | Promise<void>;
}

export function MorphCanvas({
  phase,
  formData,
  intent,
  isSubmitting,
  onSubmit,
}: MorphCanvasProps) {
  const [visibleFieldCount, setVisibleFieldCount] = useState(formData.fields.length);
  const timerRef = useRef<number | null>(null);
  const isGeneratingForm = phase === "analyzing_intent" || phase === "morphing_form";
  const isInitialEmptyState = phase === "idle" && intent.trim().length === 0;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    clearTimer();
    const resetTimer = window.setTimeout(() => {
      if (phase === "analyzing_intent" || phase === "morphing_form") {
        setVisibleFieldCount(0);
        return;
      }

      if (phase !== "form_ready") {
        setVisibleFieldCount(formData.fields.length);
        return;
      }

      setVisibleFieldCount(0);
      timerRef.current = window.setInterval(() => {
        setVisibleFieldCount((previous) => {
          const next = previous + 1;
          if (next >= formData.fields.length) {
            clearTimer();
            return formData.fields.length;
          }
          return next;
        });
      }, 70);
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
      clearTimer();
    };
  }, [formData, phase]);

  const effectiveVisibleFieldCount = visibleFieldCount;

  const statusText =
    phase === "analyzing_intent"
      ? "Intentを解析してUI構造を設計中..."
      : phase === "morphing_form"
        ? "フォームをモーフィング中..."
        : "フォーム編集";

  if (isInitialEmptyState) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-cyan-200/70 bg-gradient-to-r from-cyan-50/85 to-indigo-50/80 px-3 py-2 text-xs font-medium text-slate-700 dark:border-sky-700/70 dark:from-[#0b0d10] dark:to-[#171c23] dark:text-slate-200">
          <span>フォーム編集</span>
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[#171c23] dark:text-slate-300">
            standby
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-[#111419]/92 dark:text-slate-300">
          テーマを入力して「フォーム生成」を押すと、ここに System Prompt 作成フォームが表示されます。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-cyan-200/70 bg-gradient-to-r from-cyan-50/85 to-indigo-50/80 px-3 py-2 text-xs font-medium text-slate-700 dark:border-sky-700/70 dark:from-[#0b0d10] dark:to-[#171c23] dark:text-slate-200">
        <span className="inline-flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/80" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
          </span>
          {statusText}
        </span>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[#171c23] dark:text-slate-300">
          {effectiveVisibleFieldCount}/{formData.fields.length}
        </span>
      </div>
      <div
        className={`overflow-hidden transition-all duration-400 ease-out ${
          isGeneratingForm
            ? "max-h-0 -translate-y-1 opacity-0 pointer-events-none"
            : "max-h-[1800px] translate-y-0 opacity-100"
        }`}
      >
        <DynamicFormRenderer
          key={`${formData.formTitle}-${formData.fields.map((field) => field.id).join("-")}`}
          formData={formData}
          intent={intent}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          visibleFieldCount={effectiveVisibleFieldCount}
        />
      </div>

      {isGeneratingForm && (
        <div className="rounded-2xl border border-cyan-200/70 bg-white/85 p-4 text-xs text-slate-600 shadow-sm dark:border-sky-700/70 dark:bg-[#111419]/92 dark:text-slate-300">
          新しいフォームを生成中です...
        </div>
      )}
    </div>
  );
}

