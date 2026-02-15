import { DynamicForm, FormValues } from "@/lib/form-schema";

export type CacheStatus = "disabled" | "hit" | "miss" | "created" | "unsupported" | "error" | "bypass";

export interface CacheDiagnostics {
  selfCache: CacheStatus;
  contextCache: CacheStatus;
}

export interface FormGenerateRequest {
  intent: string;
}

export interface FormGenerateResponse {
  form?: DynamicForm;
  provider?: string;
  model?: string;
  warning?: string;
  cache?: CacheDiagnostics;
  error?: string;
}

export interface FormAutoFillRequest {
  intent: string;
  form: DynamicForm;
  values: FormValues;
  targetFieldId?: string;
  onlyEmpty?: boolean;
}

export interface FormAutoFillResponse {
  suggestions?: FormValues;
  filledFieldIds?: string[];
  provider?: string;
  model?: string;
  warning?: string;
  cache?: CacheDiagnostics;
  error?: string;
}

export interface PromptGenerateRequest {
  intent: string;
  form: DynamicForm;
  values: FormValues;
  includeSample?: boolean;
}

export interface PromptGenerateResponse {
  systemPrompt?: string;
  sampleOutput?: string;
  result?: string;
  compiledPrompt?: string;
  provider?: string;
  model?: string;
  warning?: string;
  cache?: CacheDiagnostics;
  error?: string;
}
