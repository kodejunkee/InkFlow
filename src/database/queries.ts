import type * as SQLite from 'expo-sqlite';
import type { Book, Bookmark, Highlight, HighlightColor, NewBook } from '../types/book';

// ═══════════════════════════════════════════════════════════════════════════════
// Row ↔ Model mappers
// ═══════════════════════════════════════════════════════════════════════════════

interface BookRow {
  id: number;
  title: string;
  author: string;
  cover_uri: string | null;
  file_path: string;
  progress: number;
  last_location: string | null;
  last_chapter_title: string | null;
  chapter_count: number;
  file_size: number | null;
  language: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUri: row.cover_uri,
    filePath: row.file_path,
    progress: row.progress,
    lastLocation: row.last_location,
    lastChapterTitle: row.last_chapter_title,
    chapterCount: row.chapter_count,
    fileSize: row.file_size,
    language: row.language,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface BookmarkRow {
  id: number;
  book_id: number;
  cfi: string;
  chapter_title: string;
  label: string;
  created_at: string;
}

function rowToBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    bookId: row.book_id,
    cfi: row.cfi,
    chapterTitle: row.chapter_title,
    label: row.label,
    createdAt: row.created_at,
  };
}

interface HighlightRow {
  id: number;
  book_id: number;
  cfi_range: string;
  selected_text: string;
  chapter_title: string;
  note: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

function rowToHighlight(row: HighlightRow): Highlight {
  return {
    id: row.id,
    bookId: row.book_id,
    cfiRange: row.cfi_range,
    selectedText: row.selected_text,
    chapterTitle: row.chapter_title,
    note: row.note,
    color: row.color as HighlightColor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Books
// ═══════════════════════════════════════════════════════════════════════════════

export function insertBook(db: SQLite.SQLiteDatabase, book: NewBook): Book {
  const result = db.runSync(
    `INSERT INTO books (
       title, author, cover_uri, file_path, progress,
       last_location, last_chapter_title, chapter_count,
       file_size, language, description
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.title,
      book.author,
      book.coverUri,
      book.filePath,
      book.progress,
      book.lastLocation,
      book.lastChapterTitle,
      book.chapterCount,
      book.fileSize,
      book.language,
      book.description,
    ],
  );

  return getBookById(db, result.lastInsertRowId)!;
}

export function getBooks(db: SQLite.SQLiteDatabase): Book[] {
  const rows = db.getAllSync<BookRow>(
    `SELECT * FROM books ORDER BY updated_at DESC`,
  );
  return rows.map(rowToBook);
}

export function getBookById(
  db: SQLite.SQLiteDatabase,
  id: number,
): Book | null {
  const row = db.getFirstSync<BookRow>(
    `SELECT * FROM books WHERE id = ?`,
    [id],
  );
  return row ? rowToBook(row) : null;
}

export function updateBookProgress(
  db: SQLite.SQLiteDatabase,
  id: number,
  progress: number,
): void {
  db.runSync(
    `UPDATE books SET progress = ?, updated_at = datetime('now') WHERE id = ?`,
    [progress, id],
  );
}

export function updateBookLocation(
  db: SQLite.SQLiteDatabase,
  id: number,
  cfi: string,
  progress: number,
  chapterTitle: string | null,
): void {
  db.runSync(
    `UPDATE books
       SET last_location = ?,
           progress = ?,
           last_chapter_title = ?,
           updated_at = datetime('now')
     WHERE id = ?`,
    [cfi, progress, chapterTitle, id],
  );
}

export function deleteBook(db: SQLite.SQLiteDatabase, id: number): void {
  db.runSync(`DELETE FROM books WHERE id = ?`, [id]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bookmarks
// ═══════════════════════════════════════════════════════════════════════════════

export function insertBookmark(
  db: SQLite.SQLiteDatabase,
  bookId: number,
  cfi: string,
  chapterTitle: string,
  label: string,
): Bookmark {
  const result = db.runSync(
    `INSERT INTO bookmarks (book_id, cfi, chapter_title, label)
     VALUES (?, ?, ?, ?)`,
    [bookId, cfi, chapterTitle, label],
  );

  const row = db.getFirstSync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE id = ?`,
    [result.lastInsertRowId],
  );

  return rowToBookmark(row!);
}

export function getBookmarksByBookId(
  db: SQLite.SQLiteDatabase,
  bookId: number,
): Bookmark[] {
  const rows = db.getAllSync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC`,
    [bookId],
  );
  return rows.map(rowToBookmark);
}

export function deleteBookmark(
  db: SQLite.SQLiteDatabase,
  id: number,
): void {
  db.runSync(`DELETE FROM bookmarks WHERE id = ?`, [id]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Highlights
// ═══════════════════════════════════════════════════════════════════════════════

export function insertHighlight(
  db: SQLite.SQLiteDatabase,
  bookId: number,
  cfiRange: string,
  selectedText: string,
  chapterTitle: string,
  color: HighlightColor = 'yellow',
  note: string | null = null,
): Highlight {
  const result = db.runSync(
    `INSERT INTO highlights (book_id, cfi_range, selected_text, chapter_title, color, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bookId, cfiRange, selectedText, chapterTitle, color, note],
  );

  const row = db.getFirstSync<HighlightRow>(
    `SELECT * FROM highlights WHERE id = ?`,
    [result.lastInsertRowId],
  );

  return rowToHighlight(row!);
}

export function getHighlightsByBookId(
  db: SQLite.SQLiteDatabase,
  bookId: number,
): Highlight[] {
  const rows = db.getAllSync<HighlightRow>(
    `SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at DESC`,
    [bookId],
  );
  return rows.map(rowToHighlight);
}

export function updateHighlightNote(
  db: SQLite.SQLiteDatabase,
  id: number,
  note: string | null,
): void {
  db.runSync(
    `UPDATE highlights SET note = ?, updated_at = datetime('now') WHERE id = ?`,
    [note, id],
  );
}

export function updateHighlightColor(
  db: SQLite.SQLiteDatabase,
  id: number,
  color: HighlightColor,
): void {
  db.runSync(
    `UPDATE highlights SET color = ?, updated_at = datetime('now') WHERE id = ?`,
    [color, id],
  );
}

export function deleteHighlight(
  db: SQLite.SQLiteDatabase,
  id: number,
): void {
  db.runSync(`DELETE FROM highlights WHERE id = ?`, [id]);
}

/**
 * Full-text search across highlighted text and notes for a given book.
 * Pass `bookId = null` to search across all books.
 */
export function searchHighlights(
  db: SQLite.SQLiteDatabase,
  query: string,
  bookId: number | null = null,
): Highlight[] {
  const pattern = `%${query}%`;

  if (bookId !== null) {
    const rows = db.getAllSync<HighlightRow>(
      `SELECT * FROM highlights
       WHERE book_id = ?
         AND (selected_text LIKE ? OR note LIKE ?)
       ORDER BY created_at DESC`,
      [bookId, pattern, pattern],
    );
    return rows.map(rowToHighlight);
  }

  const rows = db.getAllSync<HighlightRow>(
    `SELECT * FROM highlights
     WHERE selected_text LIKE ? OR note LIKE ?
     ORDER BY created_at DESC`,
    [pattern, pattern],
  );
  return rows.map(rowToHighlight);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reading Sessions
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReadingSession {
  id: number;
  bookId: number;
  startedAt: string;
  endedAt: string | null;
  durationSecs: number;
  startProgress: number;
  endProgress: number;
}

interface SessionRow {
  id: number;
  book_id: number;
  started_at: string;
  ended_at: string | null;
  duration_secs: number;
  start_progress: number;
  end_progress: number;
}

function rowToSession(row: SessionRow): ReadingSession {
  return {
    id: row.id,
    bookId: row.book_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSecs: row.duration_secs,
    startProgress: row.start_progress,
    endProgress: row.end_progress,
  };
}

export function startReadingSession(
  db: SQLite.SQLiteDatabase,
  bookId: number,
  startProgress: number,
): number {
  const result = db.runSync(
    `INSERT INTO reading_sessions (book_id, start_progress)
     VALUES (?, ?)`,
    [bookId, startProgress],
  );
  return result.lastInsertRowId;
}

export function endReadingSession(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  durationSecs: number,
  endProgress: number,
): void {
  db.runSync(
    `UPDATE reading_sessions
       SET ended_at = datetime('now'),
           duration_secs = ?,
           end_progress = ?
     WHERE id = ?`,
    [durationSecs, endProgress, sessionId],
  );
}

export function getReadingSessionsByBookId(
  db: SQLite.SQLiteDatabase,
  bookId: number,
): ReadingSession[] {
  const rows = db.getAllSync<SessionRow>(
    `SELECT * FROM reading_sessions WHERE book_id = ? ORDER BY started_at DESC`,
    [bookId],
  );
  return rows.map(rowToSession);
}

export function getTotalReadingTime(
  db: SQLite.SQLiteDatabase,
  bookId: number,
): number {
  const row = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(duration_secs), 0) AS total
     FROM reading_sessions
     WHERE book_id = ?`,
    [bookId],
  );
  return row?.total ?? 0;
}
