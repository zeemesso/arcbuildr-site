import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS = new URL("../../migrations/", import.meta.url);

/**
 * An in-memory SQLite database with every migration applied, shaped like the part of
 * Cloudflare D1 the engine uses. Tests run the real SQL on it.
 */
export function memoryDb() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).sort())
    if (file.endsWith(".sql")) db.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));

  const statement = (query, values = []) => ({
    bind: (...next) => statement(query, next),
    first: async () => db.prepare(query).get(...values) ?? null,
    all: async () => ({ results: db.prepare(query).all(...values) }),
    run: async () => ({ meta: { changes: Number(db.prepare(query).run(...values).changes) } }),
  });
  return { prepare: (query) => statement(query) };
}
