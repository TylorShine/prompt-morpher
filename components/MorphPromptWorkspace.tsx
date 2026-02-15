"use client";

import { useEffect, useRef, useState } from "react";
import { FormValues } from "@/lib/form-schema";
import {
  FormGenerateResponse,
  PromptGenerateResponse,
} from "@/lib/contracts/morph-api";
import { generateFormApi, generatePromptApi } from "@/lib/client/morph-api-client";
import { buildFormFromIntent } from "@/lib/form-templates";
import { MorphWorkspaceShell } from "@/components/workspace/MorphWorkspaceShell";
import { IntentPane } from "@/components/workspace/IntentPane";
import { UIPhase } from "@/lib/ui-phase";
import { MorphCanvas } from "@/components/morph/MorphCanvas";
import { PromptForgePanel } from "@/components/prompt/PromptForgePanel";
import { TimelineEntry } from "@/components/workspace/SystemTimeline";

type MobileStep = 0 | 1 | 2;
type IntentInputMode = "simple" | "detailed";

const starterIntent = "";
const starterKeywords: string[] = [];

const presets = [
  "Instagramの商品紹介投稿を作りたい",
  "取引先への返信メールを作りたい",
  "生成AI活用の解説記事を書きたい",
] as const;

const initialTimeline: TimelineEntry[] = [
  {
    id: "workspace-initialized",
    atLabel: "--:--:--",
    title: "Workspace Initialized",
    detail: "生成フローの準備ができました。",
    level: "info",
  },
];

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createTimelineEntry(
  title: string,
  detail: string | undefined,
  level: TimelineEntry["level"],
): TimelineEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    atLabel: nowTimeLabel(),
    title,
    detail,
    level,
  };
}

function normalizeKeyword(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function composeIntentFromKeywords(keywords: string[]): string {
  const active = keywords
    .map((item) => normalizeKeyword(item))
    .filter((item) => item.length > 0);

  if (active.length === 0) {
    return "";
  }

  return `次のキーワード条件を満たすコンテンツを作成したい: ${active.join(" / ")}`;
}

export function MorphPromptWorkspace() {
  const [intentInputMode, setIntentInputMode] = useState<IntentInputMode>("simple");
  const [intent, setIntent] = useState(starterIntent);
  const [resolvedIntent, setResolvedIntent] = useState(starterIntent);
  const [keywords, setKeywords] = useState<string[]>([...starterKeywords]);
  const [keywordInput, setKeywordInput] = useState("");
  const [formData, setFormData] = useState(() => buildFormFromIntent(starterIntent));
  const [uiPhase, setUiPhase] = useState<UIPhase>("idle");
  const [mobileStep, setMobileStep] = useState<MobileStep>(0);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");
  const [includeSample, setIncludeSample] = useState(false);
  const [lastValues, setLastValues] = useState<FormValues | null>(null);
  const [formProvider, setFormProvider] = useState("local-template");
  const [promptProvider, setPromptProvider] = useState("local");
  const [modelName, setModelName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [formCacheStatus, setFormCacheStatus] = useState("self:unknown / context:bypass");
  const [promptCacheStatus, setPromptCacheStatus] = useState("self:unknown / context:unknown");
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline);
  const morphingTimerRef = useRef<number | null>(null);

  const pushTimeline = (
    title: string,
    detail: string | undefined,
    level: TimelineEntry["level"],
  ) => {
    setTimeline((previous) => [
      createTimelineEntry(title, detail, level),
      ...previous.slice(0, 9),
    ]);
  };

  const clearMorphingTimer = () => {
    if (morphingTimerRef.current !== null) {
      window.clearTimeout(morphingTimerRef.current);
      morphingTimerRef.current = null;
    }
  };

  const scheduleFormReadyPhase = () => {
    clearMorphingTimer();
    morphingTimerRef.current = window.setTimeout(() => {
      setUiPhase("form_ready");
      pushTimeline("Form Ready", "フォームのモーフィングが完了しました。", "success");
      morphingTimerRef.current = null;
    }, 420);
  };

  useEffect(() => {
    return () => {
      clearMorphingTimer();
    };
  }, []);

  useEffect(() => {
    if (uiPhase === "analyzing_intent" || uiPhase === "idle") {
      setMobileStep(0);
      return;
    }

    if (uiPhase === "morphing_form" || uiPhase === "form_ready") {
      setMobileStep(1);
      return;
    }

    if (uiPhase === "forging_prompt" || uiPhase === "prompt_ready") {
      setMobileStep(2);
    }
  }, [uiPhase]);

  const clearMessages = () => {
    setErrorMessage(null);
    setWarningMessage(null);
  };

  const addKeyword = (raw: string) => {
    const next = normalizeKeyword(raw);
    if (!next) {
      return;
    }

    setKeywords((previous) => {
      if (previous.some((item) => item.toLowerCase() === next.toLowerCase())) {
        return previous;
      }
      return [...previous, next];
    });
    setKeywordInput("");
  };

  const removeKeyword = (keyword: string) => {
    setKeywords((previous) => previous.filter((item) => item !== keyword));
  };

  const clearKeywords = () => {
    setKeywords([]);
  };

  const generateForm = async (nextIntent: string) => {
    const trimmedIntent = nextIntent.trim();
    if (!trimmedIntent) {
      setErrorMessage("テーマを入力してからフォームを生成してください。");
      setUiPhase("error");
      pushTimeline("Intent Error", "テーマが空です。", "error");
      return;
    }

    setIsFormLoading(true);
    clearMessages();
    clearMorphingTimer();
    setResolvedIntent(trimmedIntent);
    setUiPhase("analyzing_intent");
    pushTimeline("Analyzing Intent", trimmedIntent, "info");

    let nextForm = buildFormFromIntent(trimmedIntent);
    let nextProvider = "local-template";
    let nextModel: string | null = null;
    let hasError = false;

    try {
      const payload: FormGenerateResponse = await generateFormApi({
        intent: trimmedIntent,
      });

      if (payload.form) {
        nextForm = payload.form;
      }

      nextProvider = payload.provider ?? nextProvider;
      nextModel = payload.model ?? null;
      setFormCacheStatus(
        `self:${payload.cache?.selfCache ?? "unknown"} / context:${payload.cache?.contextCache ?? "bypass"}`,
      );
      pushTimeline(
        "Form Generated",
        `${payload.provider ?? "unknown"} / ${payload.model ?? "-"}`,
        "success",
      );

      if (payload.warning) {
        setWarningMessage(payload.warning);
        pushTimeline("Form Warning", payload.warning, "warning");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "フォーム生成APIの呼び出しに失敗しました。";
      setErrorMessage(message);
      hasError = true;
      nextForm = buildFormFromIntent(trimmedIntent);
      nextProvider = "local-template";
      nextModel = null;
      setFormCacheStatus("self:miss / context:bypass");
      pushTimeline("Form Generation Failed", message, "error");
    }

    setFormData(nextForm);
    setFormProvider(nextProvider);
    setModelName(nextModel);
    setFinalPrompt("");
    setSampleOutput("");
    setLastValues(null);
    setPromptProvider("local");
    setPromptCacheStatus("self:unknown / context:unknown");
    setIsFormLoading(false);

    if (hasError) {
      setUiPhase("error");
      return;
    }

    setUiPhase("morphing_form");
    pushTimeline("Morphing Form", "フィールドを段階表示しています。", "info");
    scheduleFormReadyPhase();
  };

  const handleGenerateForm = () => {
    if (intentInputMode === "simple") {
      const pendingKeyword = normalizeKeyword(keywordInput);
      const effectiveKeywords = pendingKeyword
        ? [...keywords, pendingKeyword]
        : keywords;
      const keywordIntent = composeIntentFromKeywords(effectiveKeywords);
      if (pendingKeyword) {
        addKeyword(pendingKeyword);
      }
      void generateForm(keywordIntent);
      return;
    }

    void generateForm(intent);
  };

  const handlePreset = (preset: string) => {
    setIntentInputMode("detailed");
    setIntent(preset);
    void generateForm(preset);
  };

  const handleSubmit = async (values: FormValues) => {
    setIsPromptLoading(true);
    clearMessages();
    clearMorphingTimer();
    setUiPhase("forging_prompt");
    setLastValues(values);
    pushTimeline("Forging Prompt", "入力値から最終プロンプトを構築中です。", "info");

    try {
      const payload: PromptGenerateResponse = await generatePromptApi({
        intent: resolvedIntent,
        form: formData,
        values,
        includeSample,
      });

      const resolvedPrompt = payload.systemPrompt ?? payload.result;

      if (!resolvedPrompt) {
        throw new Error("APIから有効な生成結果が返りませんでした。");
      }

      setFinalPrompt(resolvedPrompt);
      setSampleOutput(payload.sampleOutput ?? "");
      setPromptProvider(payload.provider ?? "unknown");

      if (payload.model) {
        setModelName(payload.model);
      }

      if (payload.warning) {
        setWarningMessage(payload.warning);
        pushTimeline("Prompt Warning", payload.warning, "warning");
      }

      setPromptCacheStatus(
        `self:${payload.cache?.selfCache ?? "unknown"} / context:${payload.cache?.contextCache ?? "unknown"}`,
      );
      setUiPhase("prompt_ready");
      if (includeSample && payload.sampleOutput) {
        pushTimeline("Sample Ready", "結果サンプルを生成しました。", "success");
      }
      pushTimeline(
        "Prompt Ready",
        `${payload.provider ?? "unknown"} / ${payload.model ?? "-"}`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "プロンプト生成APIの呼び出しに失敗しました。";
      setErrorMessage(message);
      setFinalPrompt("バックエンドに接続できませんでした。時間をおいて再試行してください。");
      setSampleOutput("");
      setPromptProvider("local-fallback");
      setPromptCacheStatus("self:miss / context:bypass");
      setUiPhase("error");
      pushTimeline("Prompt Generation Failed", message, "error");
    } finally {
      setIsPromptLoading(false);
    }
  };

  return (
    <MorphWorkspaceShell
      phase={uiPhase}
      mobileStep={mobileStep}
      onMobileStepChange={setMobileStep}
      leftPane={
        <IntentPane
          mode={intentInputMode}
          intent={intent}
          keywords={keywords}
          keywordInput={keywordInput}
          simpleIntentPreview={composeIntentFromKeywords(keywords)}
          presets={presets}
          isFormLoading={isFormLoading}
          onModeChange={setIntentInputMode}
          onIntentChange={setIntent}
          onKeywordInputChange={setKeywordInput}
          onKeywordAdd={addKeyword}
          onKeywordRemove={removeKeyword}
          onKeywordClear={clearKeywords}
          onGenerate={handleGenerateForm}
          onPreset={handlePreset}
        />
      }
      centerPane={
        <MorphCanvas
          phase={uiPhase}
          formData={formData}
          intent={resolvedIntent}
          isSubmitting={isPromptLoading}
          onSubmit={handleSubmit}
        />
      }
      rightPane={
        <PromptForgePanel
          finalPrompt={finalPrompt}
          sampleOutput={sampleOutput}
          includeSample={includeSample}
          onIncludeSampleChange={setIncludeSample}
          isPromptLoading={isPromptLoading}
          formProvider={formProvider}
          promptProvider={promptProvider}
          modelName={modelName}
          formCacheStatus={formCacheStatus}
          promptCacheStatus={promptCacheStatus}
          warningMessage={warningMessage}
          errorMessage={errorMessage}
          lastValues={lastValues}
          timeline={timeline}
        />
      }
    />
  );
}
