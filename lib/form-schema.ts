export type UiType =
  | "text_input"
  | "text_area"
  | "select"
  | "radio"
  | "slider"
  | "switch"
  | "tags_input";

export type PrimitiveFieldValue = string | number | boolean | string[];
export type FormValues = Record<string, PrimitiveFieldValue | undefined>;

export interface BaseField {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: PrimitiveFieldValue;
  required?: boolean;
  aiHelper?: boolean;
}

export interface TextField extends BaseField {
  uiType: "text_input" | "text_area";
  validation?: {
    minLength?: number;
    maxLength?: number;
  };
}

export interface OptionField {
  label: string;
  value: string;
}

export interface SelectField extends BaseField {
  uiType: "select" | "radio";
  options: OptionField[];
}

export interface SliderField extends BaseField {
  uiType: "slider";
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface SwitchField extends BaseField {
  uiType: "switch";
  activeLabel?: string;
  inactiveLabel?: string;
}

export interface TagsField extends BaseField {
  uiType: "tags_input";
  maxTags?: number;
}

export type FormField =
  | TextField
  | SelectField
  | SliderField
  | SwitchField
  | TagsField;

export interface DynamicForm {
  formTitle: string;
  formDescription: string;
  fields: FormField[];
}

export function isTextField(field: FormField): field is TextField {
  return field.uiType === "text_input" || field.uiType === "text_area";
}

export function isSelectField(field: FormField): field is SelectField {
  return field.uiType === "select" || field.uiType === "radio";
}

export function isSliderField(field: FormField): field is SliderField {
  return field.uiType === "slider";
}

export function isSwitchField(field: FormField): field is SwitchField {
  return field.uiType === "switch";
}

export function isTagsField(field: FormField): field is TagsField {
  return field.uiType === "tags_input";
}
