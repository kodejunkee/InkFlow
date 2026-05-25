/**
 * Current schema version. Bump this whenever the schema changes and add a
 * corresponding migration in `migrations.ts`.
 */
export const DB_VERSION = 1;

// ─── Table: books ────────────────────────────────────────────────────────────

export const CREATE_BOOKS_TABLE = `
CREATE TABLE IF NOT EXISTS books (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  author          TEXT    NOT NULL DEFAULT 'Unknown',
  cover_uri       TEXT,
  file_path       TEXT    NOT NULL UNIQUE,
  progress        REAL    NOT NULL DEFAULT 0.0,
  last_location   TEXT,
  last_chapter_title TEXT,
  chapter_count   INTEGER NOT NULL DEFAULT 0,
  file_size       INTEGER,
  language        TEXT    NOT NULL DEFAULT 'en',
  description     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
`;

// ─── Table: bookmarks ────────────────────────────────────────────────────────

export const CREATE_BOOKMARKS_TABLE = `
CREATE TABLE IF NOT EXISTS bookmarks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id        INTEGER NOT NULL,
  cfi            TEXT    NOT NULL,
  chapter_title  TEXT    NOT NULL DEFAULT '',
  label          TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
`;

export const CREATE_BOOKMARKS_BOOK_INDEX = `
CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
`;

// ─── Table: highlights ───────────────────────────────────────────────────────

export const CREATE_HIGHLIGHTS_TABLE = `
CREATE TABLE IF NOT EXISTS highlights (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id        INTEGER NOT NULL,
  cfi_range      TEXT    NOT NULL,
  selected_text  TEXT    NOT NULL,
  chapter_title  TEXT    NOT NULL DEFAULT '',
  note           TEXT,
  color          TEXT    NOT NULL DEFAULT 'yellow',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
`;

export const CREATE_HIGHLIGHTS_BOOK_INDEX = `
CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON highlights(book_id);
`;

export const CREATE_HIGHLIGHTS_TEXT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_highlights_text ON highlights(selected_text);
`;

// ─── Table: reading_sessions ─────────────────────────────────────────────────

export const CREATE_READING_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS reading_sessions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id        INTEGER NOT NULL,
  started_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  ended_at       TEXT,
  duration_secs  INTEGER NOT NULL DEFAULT 0,
  start_progress REAL    NOT NULL DEFAULT 0.0,
  end_progress   REAL    NOT NULL DEFAULT 0.0,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
`;

export const CREATE_SESSIONS_BOOK_INDEX = `
CREATE INDEX IF NOT EXISTS idx_sessions_book_id ON reading_sessions(book_id);
`;

// ─── Schema version tracking ─────────────────────────────────────────────────

export const CREATE_META_TABLE = `
CREATE TABLE IF NOT EXISTS _meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ─── All DDL statements in execution order ───────────────────────────────────

export const ALL_CREATE_STATEMENTS: string[] = [
  CREATE_META_TABLE,
  CREATE_BOOKS_TABLE,
  CREATE_BOOKMARKS_TABLE,
  CREATE_BOOKMARKS_BOOK_INDEX,
  CREATE_HIGHLIGHTS_TABLE,
  CREATE_HIGHLIGHTS_BOOK_INDEX,
  CREATE_HIGHLIGHTS_TEXT_INDEX,
  CREATE_READING_SESSIONS_TABLE,
  CREATE_SESSIONS_BOOK_INDEX,
];
