import { sha256Hex } from "@/lib/server/cache/hash-utils";
import {
  CachedContextReference,
  getCachedContextReference,
  getContextCacheTtlSeconds,
  setCachedContextReference,
} from "@/lib/server/cache/model-cache";
import { UnifiedAiProvider } from "@/lib/server/ai/provider";

export interface ContextCacheResult {
  status: "disabled" | "hit" | "created" | "unsupported" | "error";
  cacheName?: string;
  warning?: string;
}

const unsupportedCacheUntilMs = new Map<string, number>();

function isContextCacheEnabled(): boolean {
  const raw = process.env.CONTEXT_CACHE_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return raw !== "false" && raw !== "0";
}

function buildCacheLookupKey(
  providerKind: string,
  model: string,
  staticContext: string,
): string {
  const contextHash = sha256Hex(staticContext);
  return `${providerKind}:${model}:${contextHash}`;
}

function adjustExpireAtMs(reference: CachedContextReference): CachedContextReference | null {
  const safetyWindowMs = 60 * 1000;
  if (reference.expireAtMs - safetyWindowMs <= Date.now()) {
    return null;
  }
  return reference;
}

function getUnsupportedTtlMs(): number {
  const defaultMs = 60 * 60 * 1000;
  const ttlMs = getContextCacheTtlSeconds() * 1000;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    return defaultMs;
  }
  return ttlMs;
}

function isUnsupportedCached(lookupKey: string): boolean {
  const until = unsupportedCacheUntilMs.get(lookupKey);
  if (!until) {
    return false;
  }

  if (until <= Date.now()) {
    unsupportedCacheUntilMs.delete(lookupKey);
    return false;
  }

  return true;
}

function markUnsupported(lookupKey: string): void {
  unsupportedCacheUntilMs.set(lookupKey, Date.now() + getUnsupportedTtlMs());
}

function normalizeContextCacheError(error: unknown): {
  isUnsupported: boolean;
  warning?: string;
} {
  const raw = error instanceof Error ? error.message : String(error);
  const compact = raw.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();

  const is404CachedContents =
    lower.includes("404") &&
    (lower.includes("/cachedcontents") || lower.includes("cachedcontents"));
  const isNotFoundCachedContents =
    lower.includes("not found") &&
    (lower.includes("/cachedcontents") || lower.includes("cachedcontents"));
  const isUnauthenticated = lower.includes("unauthenticated");
  const isMinimumTokenThreshold =
    lower.includes("minimum token count") &&
    lower.includes("start caching");

  if (isMinimumTokenThreshold) {
    return {
      isUnsupported: true,
    };
  }

  if (is404CachedContents || isNotFoundCachedContents) {
    return {
      isUnsupported: true,
      warning:
        "Context cache endpoint が利用できないため、このプロバイダでは通常生成にフォールバックします。",
    };
  }

  if (isUnauthenticated) {
    return {
      isUnsupported: true,
      warning:
        "Context cache用の認証に失敗したため、通常生成にフォールバックします。",
    };
  }

  const trimmed = compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
  return {
    isUnsupported: false,
    warning: `Context cacheを作成できませんでした。通常生成にフォールバックします: ${trimmed}`,
  };
}

import { GeminiProvider } from "../llm/gemini";
// ... (imports)

// ... (code)
export async function getOrCreateContextCache(
  provider: UnifiedAiProvider,
  staticContext: string,
): Promise<ContextCacheResult> {
  if (!isContextCacheEnabled()) {
    return { status: "disabled" };
  }

  if (!(provider.client instanceof GeminiProvider)) {
    return {
      status: "unsupported",
      warning: "Context cache is only supported for Gemini providers.",
    };
  }
  const geminiProvider = provider.client;

  const lookupKey = buildCacheLookupKey(
    provider.info.kind,
    provider.info.model,
    staticContext,
  );

  if (isUnsupportedCached(lookupKey)) {
    return {
      status: "unsupported",
    };
  }

  const cached = await getCachedContextReference({
    key: lookupKey,
  });

  if (cached) {
    const usable = adjustExpireAtMs(cached);
    if (usable) {
      return {
        status: "hit",
        cacheName: usable.cacheName,
      };
    }
  }

  try {
    const created = await geminiProvider.createContextCache({
      cacheKey: `i2p-${sha256Hex(lookupKey).slice(0, 12)}`,
      staticContext,
      ttlSeconds: getContextCacheTtlSeconds(),
    });

    await setCachedContextReference(
      { key: lookupKey },
      {
        cacheName: created.cacheName,
        expireAtMs: created.expireAtMs,
      },
    );

    return {
      status: "created",
      cacheName: created.cacheName,
    };
  } catch (error) {
    const normalizedError = normalizeContextCacheError(error);
    if (normalizedError.isUnsupported) {
      markUnsupported(lookupKey);
    }
    return {
      status: "unsupported",
      warning: normalizedError.warning,
    };
  }
}
