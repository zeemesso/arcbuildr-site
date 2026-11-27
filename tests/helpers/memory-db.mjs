import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS = new URL("../../migrations/", import.meta.url);

/**
 * An in-memory SQLite database with every migration applied, shaped like the part of
 * Cloudflare D1 the engine uses. Tests run the real SQL on it.
 * @param {(file: string, db: DatabaseSync) => void} [beforeMigration]
 */
export function memoryDb(beforeMigration) {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (!file.endsWith(".sql")) continue;
    beforeMigration?.(file, db);
    db.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));
  }

  const statement = (query, values = []) => {
    const execute = () => ({ meta: { changes: Number(db.prepare(query).run(...values).changes) } });
    return {
      bind: (...next) => statement(query, next),
      first: async () => db.prepare(query).get(...values) ?? null,
      all: async () => ({ results: db.prepare(query).all(...values) }),
      run: async () => execute(),
      execute,
    };
  };
  return {
    prepare: (query) => statement(query),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        const results = statements.map((entry) => entry.execute());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
