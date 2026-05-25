import { useEffect, useRef, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../database/migrations';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseDatabaseResult {
  /** The initialised database instance, or `null` until ready. */
  db: SQLite.SQLiteDatabase | null;
  /** Whether the database is currently being initialised. */
  isLoading: boolean;
  /** Error that occurred during initialisation, if any. */
  error: Error | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'inkflow.db';

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Initialises the SQLite database on mount:
 * 1. Opens (or creates) the database file.
 * 2. Runs any pending schema migrations.
 * 3. Returns the ready-to-use database handle.
 *
 * The hook keeps a stable reference to the database; it will not re-initialise
 * across re-renders.
 */
export function useDatabase(): UseDatabaseResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  // Track whether init has already been attempted.
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    try {
      const database = SQLite.openDatabaseSync(DB_NAME);
      runMigrations(database);
      dbRef.current = database;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      console.error('[useDatabase] Initialisation failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    db: dbRef.current,
    isLoading,
    error,
  };
}
