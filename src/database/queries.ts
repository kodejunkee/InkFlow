import type * as SQLite from 'expo-sqlite';
import type { Book, Bookmark, Highlight, HighlightColor, GlobalSearchResult, NewBook } from '../types/book';
import type { NovelDownloadRecord } from '../types/novel';

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

/**
 * Global search across both highlights and bookmarks for all books.
 */
export function searchGlobalAnnotations(
  db: SQLite.SQLiteDatabase,
  query: string,
): GlobalSearchResult[] {
  const pattern = `%${query}%`;
  
  const sql = `
    SELECT
      h.id, h.book_id as bookId, b.title as bookTitle,
      h.cfi_range as cfi, h.chapter_title as chapterTitle, h.selected_text as text, h.note, h.color, h.created_at as createdAt,
      'highlight' as type
    FROM highlights h
    JOIN books b ON h.book_id = b.id
    WHERE h.selected_text LIKE ? OR h.note LIKE ?

    UNION ALL

    SELECT
      bm.id, bm.book_id as bookId, b.title as bookTitle,
      bm.cfi as cfi, bm.chapter_title as chapterTitle, bm.label as text, NULL as note, 'yellow' as color, bm.created_at as createdAt,
      'bookmark' as type
    FROM bookmarks bm
    JOIN books b ON bm.book_id = b.id
    WHERE bm.label LIKE ?

    ORDER BY createdAt DESC
  `;

  // Note: we can map column names to camelCase using 'as' in SQLite to match our TypeScript interface.
  return db.getAllSync<GlobalSearchResult>(sql, [pattern, pattern, pattern]);
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

// ═══════════════════════════════════════════════════════════════════════════════
// Novel Downloads
// ═══════════════════════════════════════════════════════════════════════════════

interface NovelDownloadRow {
  id: number;
  book_id: number | null;
  source_id: string;
  source_url: string;
  novel_title: string;
  last_chapter_downloaded: number;
  total_chapters: number;
  status: string;
  last_checked_at: string | null;
  created_at: string;
}

function rowToNovelDownload(row: NovelDownloadRow): NovelDownloadRecord {
  return {
    id: row.id,
    bookId: row.book_id,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    novelTitle: row.novel_title,
    lastChapterDownloaded: row.last_chapter_downloaded,
    totalChapters: row.total_chapters,
    status: row.status,
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
  };
}

export function insertNovelDownload(
  db: SQLite.SQLiteDatabase,
  record: Omit<NovelDownloadRecord, 'id' | 'createdAt'>,
): NovelDownloadRecord {
  const result = db.runSync(
    `INSERT INTO novel_downloads (
       book_id, source_id, source_url, novel_title,
       last_chapter_downloaded, total_chapters, status, last_checked_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.bookId,
      record.sourceId,
      record.sourceUrl,
      record.novelTitle,
      record.lastChapterDownloaded,
      record.totalChapters,
      record.status,
      record.lastCheckedAt,
    ],
  );

  const row = db.getFirstSync<NovelDownloadRow>(
    `SELECT * FROM novel_downloads WHERE id = ?`,
    [result.lastInsertRowId],
  );
  return rowToNovelDownload(row!);
}

export function getNovelDownloadBySourceUrl(
  db: SQLite.SQLiteDatabase,
  sourceUrl: string,
): NovelDownloadRecord | null {
  const row = db.getFirstSync<NovelDownloadRow>(
    `SELECT * FROM novel_downloads WHERE source_url = ?`,
    [sourceUrl],
  );
  return row ? rowToNovelDownload(row) : null;
}

export function getNovelDownloadByBookId(
  db: SQLite.SQLiteDatabase,
  bookId: number,
): NovelDownloadRecord | null {
  const row = db.getFirstSync<NovelDownloadRow>(
    `SELECT * FROM novel_downloads WHERE book_id = ?`,
    [bookId],
  );
  return row ? rowToNovelDownload(row) : null;
}

export function getAllNovelDownloads(
  db: SQLite.SQLiteDatabase,
): NovelDownloadRecord[] {
  const rows = db.getAllSync<NovelDownloadRow>(
    `SELECT * FROM novel_downloads ORDER BY created_at DESC`,
  );
  return rows.map(rowToNovelDownload);
}

export function updateNovelDownload(
  db: SQLite.SQLiteDatabase,
  id: number,
  updates: Partial<Pick<NovelDownloadRecord, 'bookId' | 'lastChapterDownloaded' | 'totalChapters' | 'status' | 'lastCheckedAt'>>,
): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.bookId !== undefined) {
    fields.push('book_id = ?');
    values.push(updates.bookId);
  }
  if (updates.lastChapterDownloaded !== undefined) {
    fields.push('last_chapter_downloaded = ?');
    values.push(updates.lastChapterDownloaded);
  }
  if (updates.totalChapters !== undefined) {
    fields.push('total_chapters = ?');
    values.push(updates.totalChapters);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.lastCheckedAt !== undefined) {
    fields.push('last_checked_at = ?');
    values.push(updates.lastCheckedAt);
  }

  if (fields.length === 0) return;

  values.push(id);
  db.runSync(
    `UPDATE novel_downloads SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );
}

export function deleteNovelDownload(
  db: SQLite.SQLiteDatabase,
  id: number,
): void {
  db.runSync(`DELETE FROM novel_downloads WHERE id = ?`, [id]);
}
