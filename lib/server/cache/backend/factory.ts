import { CacheBackend } from "@/lib/server/cache/backend/types";
import { MemoryCacheBackend } from "@/lib/server/cache/backend/memory-cache-backend";
import { SQLiteCacheBackend } from "@/lib/server/cache/backend/sqlite-cache-backend";

let singleton: CacheBackend | null = null;

function selfCacheEnabled(): boolean {
  const raw = process.env.SELF_CACHE_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return raw !== "false" && raw !== "0";
}

function preferredBackend(): string {
  return process.env.SELF_CACHE_BACKEND?.trim().toLowerCase() || "sqlite";
}

function createBackend(): CacheBackend | null {
  if (!selfCacheEnabled()) {
    return null;
  }

  const backend = preferredBackend();

  try {
    switch (backend) {
      case "memory":
        return new MemoryCacheBackend();
      case "firestore":
        // Firestore backendは拡張ポイントとして予約。
        // 現在はビルドの依存性を最小化するため memory にフォールバック。
        return new MemoryCacheBackend();
      case "sqlite":
      default:
        return new SQLiteCacheBackend();
    }
  } catch {
    return new MemoryCacheBackend();
  }
}

export function getCacheBackend(): CacheBackend | null {
  if (singleton !== null) {
    return singleton;
  }

  singleton = createBackend();
  return singleton;
}

export function isCacheBackendAvailable(): boolean {
  return getCacheBackend() !== null;
}
