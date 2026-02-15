import { getCacheBackend, isCacheBackendAvailable } from "@/lib/server/cache/backend/factory";
import { sha256Hex, stableStringify } from "@/lib/server/cache/hash-utils";

const FORM_NAMESPACE = "form_generation_result";
const PROMPT_NAMESPACE = "prompt_generation_result";
const CONTEXT_NAMESPACE = "provider_context_cache";

export interface CachedContextReference {
  cacheName: string;
  expireAtMs: number;
}

function parseTtlSeconds(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export function getFormCacheTtlSeconds(): number {
  return parseTtlSeconds(process.env.FORM_RESULT_CACHE_TTL_SECONDS, 60 * 60 * 12);
}

export function getPromptCacheTtlSeconds(): number {
  return parseTtlSeconds(process.env.PROMPT_RESULT_CACHE_TTL_SECONDS, 60 * 30);
}

export function getContextCacheTtlSeconds(): number {
  return parseTtlSeconds(process.env.CONTEXT_CACHE_TTL_SECONDS, 60 * 60 * 6);
}

function buildCacheKey(payload: unknown): string {
  const canonical = stableStringify(payload);
  return sha256Hex(canonical);
}

export function isSelfCacheAvailable(): boolean {
  return isCacheBackendAvailable();
}

export async function getCachedFormResult<T>(payload: unknown): Promise<T | null> {
  const cache = getCacheBackend();
  if (!cache) {
    return null;
  }

  return cache.get<T>(FORM_NAMESPACE, buildCacheKey(payload));
}

export async function setCachedFormResult<T>(payload: unknown, value: T): Promise<void> {
  const cache = getCacheBackend();
  if (!cache) {
    return;
  }

  await cache.set(
    FORM_NAMESPACE,
    buildCacheKey(payload),
    value,
    getFormCacheTtlSeconds(),
  );
}

export async function getCachedPromptResult<T>(payload: unknown): Promise<T | null> {
  const cache = getCacheBackend();
  if (!cache) {
    return null;
  }

  return cache.get<T>(PROMPT_NAMESPACE, buildCacheKey(payload));
}

export async function setCachedPromptResult<T>(payload: unknown, value: T): Promise<void> {
  const cache = getCacheBackend();
  if (!cache) {
    return;
  }

  await cache.set(
    PROMPT_NAMESPACE,
    buildCacheKey(payload),
    value,
    getPromptCacheTtlSeconds(),
  );
}

export async function getCachedContextReference(
  payload: unknown,
): Promise<CachedContextReference | null> {
  const cache = getCacheBackend();
  if (!cache) {
    return null;
  }

  const ref = await cache.get<CachedContextReference>(
    CONTEXT_NAMESPACE,
    buildCacheKey(payload),
  );

  if (!ref) {
    return null;
  }

  if (!ref.cacheName || ref.expireAtMs <= Date.now()) {
    return null;
  }

  return ref;
}

export async function setCachedContextReference(
  payload: unknown,
  value: CachedContextReference,
): Promise<void> {
  const cache = getCacheBackend();
  if (!cache) {
    return;
  }

  const ttlSeconds = Math.max(1, Math.floor((value.expireAtMs - Date.now()) / 1000));
  await cache.set(
    CONTEXT_NAMESPACE,
    buildCacheKey(payload),
    value,
    ttlSeconds,
  );
}
