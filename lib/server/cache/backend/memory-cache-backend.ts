import { CacheBackend } from "@/lib/server/cache/backend/types";

interface MemoryEntry {
  value: unknown;
  expiresAt: number | null;
}

export class MemoryCacheBackend implements CacheBackend {
  readonly kind = "memory";
  readonly available = true;

  private readonly map = new Map<string, MemoryEntry>();

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const row = this.map.get(this.compose(namespace, key));
    if (!row) {
      return null;
    }

    if (row.expiresAt !== null && row.expiresAt <= Date.now()) {
      this.map.delete(this.compose(namespace, key));
      return null;
    }

    return row.value as T;
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const expiresAt =
      typeof ttlSeconds === "number" && ttlSeconds > 0
        ? Date.now() + ttlSeconds * 1000
        : null;

    this.map.set(this.compose(namespace, key), {
      value,
      expiresAt,
    });
  }

  async delete(namespace: string, key: string): Promise<void> {
    this.map.delete(this.compose(namespace, key));
  }

  async deleteExpired(): Promise<void> {
    const now = Date.now();
    for (const [key, row] of this.map.entries()) {
      if (row.expiresAt !== null && row.expiresAt <= now) {
        this.map.delete(key);
      }
    }
  }

  private compose(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
}
