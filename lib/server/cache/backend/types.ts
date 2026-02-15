export interface CacheBackend {
  readonly kind: string;
  readonly available: boolean;
  get<T>(namespace: string, key: string): Promise<T | null>;
  set<T>(namespace: string, key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
  deleteExpired(): Promise<void>;
}
