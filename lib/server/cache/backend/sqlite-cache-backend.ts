import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";
import { CacheBackend } from "@/lib/server/cache/backend/types";

const require = createRequire(import.meta.url);

interface StatementLike<T = unknown> {
  get: (...params: unknown[]) => T | undefined;
  run: (...params: unknown[]) => void;
}

interface DatabaseLike {
  exec: (sql: string) => void;
  prepare: <T = unknown>(sql: string) => StatementLike<T>;
}

interface CacheRow {
  value: string;
  expires_at: number | null;
}

interface CachedPayload {
  value: unknown;
}

export class SQLiteCacheBackend implements CacheBackend {
  readonly kind = "sqlite";
  readonly available = true;

  private readonly readStmt: StatementLike<CacheRow>;
  private readonly writeStmt: StatementLike;
  private readonly deleteStmt: StatementLike;
  private readonly deleteExpiredStmt: StatementLike;

  constructor() {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        namespace TEXT NOT NULL,
        cache_key TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (namespace, cache_key)
      );
    `);

    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON cache_entries(expires_at);",
    );

    this.readStmt = db.prepare<CacheRow>(
      "SELECT value, expires_at FROM cache_entries WHERE namespace = ? AND cache_key = ? LIMIT 1;",
    );
    this.writeStmt = db.prepare(
      `
      INSERT INTO cache_entries (namespace, cache_key, value, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(namespace, cache_key)
      DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at, updated_at = excluded.updated_at;
      `,
    );
    this.deleteStmt = db.prepare(
      "DELETE FROM cache_entries WHERE namespace = ? AND cache_key = ?;",
    );
    this.deleteExpiredStmt = db.prepare(
      "DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at <= ?;",
    );
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    await this.deleteExpired();

    const row = this.readStmt.get(namespace, key);
    if (!row) {
      return null;
    }

    if (row.expires_at !== null && row.expires_at <= Date.now()) {
      await this.delete(namespace, key);
      return null;
    }

    try {
      const parsed = JSON.parse(row.value) as CachedPayload;
      return parsed.value as T;
    } catch {
      await this.delete(namespace, key);
      return null;
    }
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const now = Date.now();
    const expiresAt =
      typeof ttlSeconds === "number" && ttlSeconds > 0
        ? now + ttlSeconds * 1000
        : null;

    const payload: CachedPayload = {
      value,
    };

    this.writeStmt.run(
      namespace,
      key,
      JSON.stringify(payload),
      expiresAt,
      now,
    );
  }

  async delete(namespace: string, key: string): Promise<void> {
    this.deleteStmt.run(namespace, key);
  }

  async deleteExpired(): Promise<void> {
    this.deleteExpiredStmt.run(Date.now());
  }
}

function resolveDbPath(): string {
  const configured = process.env.SELF_CACHE_DB_PATH?.trim() || ".cache/morph-prompt-cache.sqlite";
  if (isAbsolute(configured)) {
    return configured;
  }

  return join(process.cwd(), configured);
}

function createDatabase(): DatabaseLike {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const sqliteModule = require("node:sqlite") as {
    DatabaseSync: new (path: string) => DatabaseLike;
  };

  const db = new sqliteModule.DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  return db;
}
