export type UIPhase =
  | "idle"
  | "analyzing_intent"
  | "morphing_form"
  | "form_ready"
  | "forging_prompt"
  | "prompt_ready"
  | "error";

export const UI_PHASE_RAIL: ReadonlyArray<Exclude<UIPhase, "error">> = [
  "idle",
  "analyzing_intent",
  "morphing_form",
  "form_ready",
  "forging_prompt",
  "prompt_ready",
];

const UI_PHASE_LABELS: Record<UIPhase, string> = {
  idle: "Idle",
  analyzing_intent: "Analyzing Intent",
  morphing_form: "Morphing Form",
  form_ready: "Form Ready",
  forging_prompt: "Forging Prompt",
  prompt_ready: "Prompt Ready",
  error: "Error",
};

export function getUiPhaseLabel(phase: UIPhase): string {
  return UI_PHASE_LABELS[phase];
}

export function getUiPhaseRailIndex(phase: UIPhase): number {
  if (phase === "error") {
    return -1;
  }
  return UI_PHASE_RAIL.indexOf(phase);
}

export function getUiPhaseProgress(phase: UIPhase): number {
  const index = getUiPhaseRailIndex(phase);
  if (index < 0) {
    return 0;
  }

  if (UI_PHASE_RAIL.length <= 1) {
    return 100;
  }

  return Math.round((index / (UI_PHASE_RAIL.length - 1)) * 100);
}
