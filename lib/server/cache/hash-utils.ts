import { createHash } from "node:crypto";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function normalizeValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const normalized: Record<string, JsonValue> = {};

    for (const [key, entry] of entries) {
      normalized[key] = normalizeValue(entry);
    }

    return normalized;
  }

  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
