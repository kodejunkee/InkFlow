import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type * as SQLite from 'expo-sqlite';
import type { Book, NewBook } from '../types/book';
import { insertBook } from '../database/queries';
import { useLibraryStore } from '../stores/libraryStore';
import { processEpub } from '../services/epubProcessor';
import {
  copyEpubToStorage,
  copyCoverToStorage,
  getFileSize,
} from '../services/fileManager';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseBookImportResult {
  /** Kick off the full import pipeline (picker → copy → process → DB → store). */
  importBook: () => Promise<Book | null>;
  /** Whether an import is currently in progress. */
  isImporting: boolean;
  /** Normalised progress 0.0 – 1.0. */
  importProgress: number;
  /** The most recent import error, or `null`. */
  error: Error | null;
  /** Clear the current error. */
  clearError: () => void;
}

// ─── Progress stages ─────────────────────────────────────────────────────────

const PROGRESS_PICKING = 0.05;
const PROGRESS_COPYING = 0.2;
const PROGRESS_PROCESSING = 0.7;
const PROGRESS_SAVING = 0.9;
const PROGRESS_DONE = 1.0;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Full import pipeline hook.
 *
 * Orchestrates:
 * 1. Document picker (user selects an `.epub` file)
 * 2. Copy the EPUB into the app's storage directory
 * 3. Process via the native `EpubProcessor`
 * 4. Copy the cover image (if any)
 * 5. Insert the book row into the database
 * 6. Update the library Zustand store
 *
 * @param db  A ready SQLite database handle (from `useDatabase`).
 */
export function useBookImport(
  db: SQLite.SQLiteDatabase | null,
): UseBookImportResult {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const { addBook, setImporting, setImportProgress: storeSetProgress } =
    useLibraryStore.getState();

  const importBook = useCallback(async (): Promise<Book | null> => {
    if (!db) {
      const err = new Error('Database is not initialised yet.');
      setError(err);
      return null;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImporting(true);
    setError(null);

    try {
      // ── 1. Pick file ─────────────────────────────────────────────────
      setImportProgress(PROGRESS_PICKING);
      storeSetProgress(PROGRESS_PICKING);

      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/epub+zip',
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        // User cancelled — not an error.
        return null;
      }

      const asset = pickerResult.assets[0];
      const originalName = asset.name ?? 'book.epub';

      // ── 2. Copy EPUB to storage ──────────────────────────────────────
      setImportProgress(PROGRESS_COPYING);
      storeSetProgress(PROGRESS_COPYING);

      const storedPath = await copyEpubToStorage(asset.uri, originalName);

      // ── 3. Process EPUB metadata ─────────────────────────────────────
      setImportProgress(PROGRESS_PROCESSING);
      storeSetProgress(PROGRESS_PROCESSING);

      const epub = await processEpub(storedPath);

      // ── 4. Save to database ──────────────────────────────────────────
      setImportProgress(PROGRESS_SAVING);
      storeSetProgress(PROGRESS_SAVING);

      const fileSize = getFileSize(storedPath);

      // Insert book first to get an ID, then handle the cover.
      const newBook: NewBook = {
        title: epub.title,
        author: epub.author,
        coverUri: null, // Will be updated after cover copy.
        filePath: storedPath,
        progress: 0,
        lastLocation: null,
        lastChapterTitle: null,
        chapterCount: epub.chapterCount,
        fileSize,
        language: epub.language,
        description: epub.description,
      };

      const inserted = insertBook(db, newBook);

      // ── 5. Copy cover image (if available) ───────────────────────────
      let finalBook = inserted;
      if (epub.coverPath) {
        const coverUri = copyCoverToStorage(epub.coverPath, inserted.id);
        if (coverUri) {
          db.runSync(
            `UPDATE books SET cover_uri = ?, updated_at = datetime('now') WHERE id = ?`,
            [coverUri, inserted.id],
          );
          finalBook = { ...inserted, coverUri };
        }
      }

      // ── 6. Update store ──────────────────────────────────────────────
      setImportProgress(PROGRESS_DONE);
      storeSetProgress(PROGRESS_DONE);
      addBook(finalBook);

      return finalBook;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      console.error('[useBookImport] Import failed:', err.message);
      return null;
    } finally {
      setIsImporting(false);
      setImporting(false);
    }
  }, [db, addBook, setImporting, storeSetProgress]);

  const clearError = useCallback(() => setError(null), []);

  return {
    importBook,
    isImporting,
    importProgress,
    error,
    clearError,
  };
}
