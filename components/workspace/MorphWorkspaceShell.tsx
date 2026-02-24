"use client";

import { ReactNode, useState } from "react";
import { SettingsPane } from "@/components/settings/SettingsPane";
import {
  getUiPhaseLabel,
  getUiPhaseProgress,
  getUiPhaseRailIndex,
  UIPhase,
  UI_PHASE_RAIL,
} from "@/lib/ui-phase";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type MobileStep = 0 | 1 | 2;

interface MorphWorkspaceShellProps {
  phase: UIPhase;
  mobileStep: MobileStep;
  onMobileStepChange: (step: MobileStep) => void;
  leftPane: ReactNode;
  centerPane: ReactNode;
  rightPane: ReactNode;
}

export function MorphWorkspaceShell({
  phase,
  mobileStep,
  onMobileStepChange,
  leftPane,
  centerPane,
  rightPane,
}: MorphWorkspaceShellProps) {
  const progress = getUiPhaseProgress(phase);
  const railIndex = getUiPhaseRailIndex(phase);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 lg:px-8">
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <SettingsPane />
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[1360px] space-y-5">
        <header className="hidden rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-700/70 dark:bg-[#0b0d10]/90 dark:shadow-black/45 lg:block">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                Prompt Morpher Mobile Flow
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Prompt Morpher
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                スマホアプリ想定の3ステップ体験で、入力から最終プロンプトまでを生成します。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700/70 dark:bg-[#171c23] dark:text-slate-300 dark:hover:bg-[#1d242c]"
              >
                Settings
              </button>
              <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 dark:border-sky-700/70 dark:bg-[#171c23] dark:text-sky-300">
                Phase: {getUiPhaseLabel(phase)}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2 rounded-full bg-slate-200/90 dark:bg-slate-700/80">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-medium md:grid-cols-6">
              {UI_PHASE_RAIL.map((item, index) => {
                const isReached = railIndex >= index;
                return (
                  <span
                    key={item}
                    className={`rounded-full px-2 py-1 text-center transition ${
                      isReached
                        ? "bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950"
                        : "bg-slate-100/90 text-slate-500 dark:bg-[#171c23]/90 dark:text-slate-300"
                    }`}
                  >
                    {getUiPhaseLabel(item)}
                  </span>
                );
              })}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[430px] lg:hidden">
          <div className="relative overflow-hidden rounded-[34px] border border-slate-200/70 bg-white/85 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-slate-700/70 dark:bg-[#08090d]/95 dark:shadow-black/50">
            <div className="pointer-events-none absolute -left-10 top-8 h-24 w-24 rounded-full bg-cyan-300/35 blur-2xl" />
            <div className="pointer-events-none absolute -right-8 top-20 h-24 w-24 rounded-full bg-indigo-300/35 blur-2xl" />
            <div className="pointer-events-none absolute bottom-12 left-12 h-20 w-20 rounded-full bg-sky-300/30 blur-2xl" />

            <div className="relative flex h-[min(860px,92vh)] flex-col">
              <header className="space-y-3 border-b border-slate-200/70 px-4 pb-3 pt-4 dark:border-slate-700/70">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                    Prompt Morpher
                  </p>
                  <div className="flex items-center gap-2">
                    <ThemeToggle compact />
                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:border-sky-700/70 dark:bg-[#171c23] dark:text-sky-300">
                      {getUiPhaseLabel(phase)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200/90 dark:bg-slate-700/80">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </header>

              <main className="flex-1 overflow-hidden p-3">
                <section className="h-full overflow-auto rounded-3xl border border-white/70 bg-white/80 p-4 shadow-inner shadow-slate-900/5 dark:border-slate-700/80 dark:bg-[#111419]/95 dark:shadow-black/45">
                  {mobileStep === 0 && leftPane}
                  {mobileStep === 1 && centerPane}
                  {mobileStep === 2 && rightPane}
                </section>
              </main>

              <nav className="border-t border-slate-200/70 px-3 pb-3 pt-2 dark:border-slate-700/70">
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100/85 p-1.5 dark:bg-[#171c23]/90">
                  <button
                    type="button"
                    onClick={() => onMobileStepChange(0)}
                    className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                      mobileStep === 0
                        ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    テーマ
                  </button>
                  <button
                    type="button"
                    onClick={() => onMobileStepChange(1)}
                    className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                      mobileStep === 1
                        ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    フォーム
                  </button>
                  <button
                    type="button"
                    onClick={() => onMobileStepChange(2)}
                    className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
                      mobileStep === 2
                        ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    生成
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>

        <div className="hidden gap-5 lg:grid lg:grid-cols-[0.95fr_1.45fr] xl:grid-cols-[0.9fr_1.6fr]">
          <section className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-700/70 dark:bg-[#0b0d10]/90 dark:shadow-black/45">
            {leftPane}
          </section>
          <section className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-700/70 dark:bg-[#0b0d10]/90 dark:shadow-black/45">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-slate-700/80 dark:bg-[#171c23]/88">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                Workbench
              </p>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 dark:bg-[#08090d]">
                <button
                  type="button"
                  onClick={() => onMobileStepChange(1)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mobileStep !== 2
                      ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Form Editor
                </button>
                <button
                  type="button"
                  onClick={() => onMobileStepChange(2)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    mobileStep === 2
                      ? "bg-slate-900 text-white shadow dark:bg-sky-500 dark:text-slate-950"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Prompt Forge
                </button>
              </div>
            </div>

            <div className="mt-3">{mobileStep === 2 ? rightPane : centerPane}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

