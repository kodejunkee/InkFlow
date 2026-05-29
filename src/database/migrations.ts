import type * as SQLite from 'expo-sqlite';
import {
  ALL_CREATE_STATEMENTS,
  DB_VERSION,
  CREATE_NOVEL_DOWNLOADS_TABLE,
  CREATE_NOVEL_DOWNLOADS_SOURCE_INDEX,
} from './schema';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Migration {
  version: number;
  /** SQL statements to run when upgrading TO this version. */
  statements: string[];
}

// ─── Migration registry ─────────────────────────────────────────────────────
// Version 1 is the initial schema — all CREATE statements live here.
// Future migrations append entries with version 2, 3, etc.

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: ALL_CREATE_STATEMENTS,
  },
  {
    version: 2,
    statements: [CREATE_NOVEL_DOWNLOADS_TABLE, CREATE_NOVEL_DOWNLOADS_SOURCE_INDEX],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStoredVersion(db: SQLite.SQLiteDatabase): number {
  // Ensure the meta table exists so the first query never fails.
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM _meta WHERE key = 'db_version'`,
  );

  return row ? parseInt(row.value, 10) : 0;
}

function setStoredVersion(db: SQLite.SQLiteDatabase, version: number): void {
  db.runSync(
    `INSERT OR REPLACE INTO _meta (key, value) VALUES ('db_version', ?)`,
    [String(version)],
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run all pending migrations inside a single transaction.
 *
 * Safe to call on every app launch — it's a no-op when the DB is already at
 * the latest version.
 */
export function runMigrations(db: SQLite.SQLiteDatabase): void {
  // Enable WAL mode & foreign keys for the session.
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA foreign_keys = ON;');

  const currentVersion = getStoredVersion(db);

  if (currentVersion >= DB_VERSION) {
    return; // Already up to date.
  }

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  if (pending.length === 0) {
    return;
  }

  db.withTransactionSync(() => {
    for (const migration of pending) {
      for (const statement of migration.statements) {
        db.execSync(statement);
      }
    }
    setStoredVersion(db, DB_VERSION);
  });
}
