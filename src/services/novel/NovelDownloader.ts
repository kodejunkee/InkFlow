/**
 * NovelDownloader — Full download orchestrator.
 *
 * Manages the pipeline: scrape chapters → generate EPUB → import to library.
 * Designed to be called from the Novel Details screen after the user taps Download.
 */

import type * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import type { NovelDetails, NovelChapter, DownloadProgress } from '../../types/novel';
import type { NewBook } from '../../types/book';
import {
  downloadChapterBatch,
  generateNovelEpub,
} from './NovelSourceService';
import {
  insertNovelDownload,
  updateNovelDownload,
  getNovelDownloadBySourceUrl,
} from '../../database/queries';
import { insertBook } from '../../database/queries';
import { copyCoverToStorage } from '../fileManager';
import { processEpub } from '../epubProcessor';
import { useLibraryStore } from '../../stores/libraryStore';
import { useNovelStore } from '../../stores/novelStore';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Number of chapters to download per batch call to Python. Keep small for smooth progress updates. */
const BATCH_SIZE = 5;

// ─── Types ───────────────────────────────────────────────────────────────────

interface DownloadOptions {
  db: SQLite.SQLiteDatabase;
  novel: NovelDetails;
  cookies: string;
  userAgent: string;
  /** Optional: only download from this chapter index onwards. */
  startFromChapter?: number;
  onProgress?: (progress: DownloadProgress) => void;
}

// ─── Main Download Pipeline ──────────────────────────────────────────────────

/**
 * Downloads a full novel, generates an EPUB, and imports it into the library.
 *
 * Steps:
 * 1. Create temp directory for chapter files
 * 2. Download chapters in batches (25 at a time)
 * 3. Download cover image
 * 4. Generate EPUB from chapters
 * 5. Process EPUB to extract metadata
 * 6. Import into library (DB + store)
 * 7. Clean up temp directory
 *
 * @returns The book ID if successful, null if cancelled or failed.
 */
export async function downloadNovel(options: DownloadOptions): Promise<number | null> {
  const { db, novel, cookies, userAgent, startFromChapter = 0, onProgress } = options;

  const { setActiveDownload, updateDownloadProgress, updateDownloadStatus } =
    useNovelStore.getState();

  // Initialize progress
  const progress: DownloadProgress = {
    novelTitle: novel.title,
    sourceUrl: novel.sourceUrl,
    currentChapter: 0,
    totalChapters: novel.totalChapters,
    status: 'pending',
  };
  setActiveDownload(progress);
  onProgress?.(progress);

  // Create or update download record
  let downloadRecord = getNovelDownloadBySourceUrl(db, novel.sourceUrl);
  if (!downloadRecord) {
    downloadRecord = insertNovelDownload(db, {
      bookId: null,
      sourceId: novel.sourceId,
      sourceUrl: novel.sourceUrl,
      novelTitle: novel.title,
      lastChapterDownloaded: 0,
      totalChapters: novel.totalChapters,
      status: 'downloading',
      lastCheckedAt: new Date().toISOString(),
    });
  } else {
    updateNovelDownload(db, downloadRecord.id, {
      status: 'downloading',
      totalChapters: novel.totalChapters,
    });
  }

  try {
    // ── 1. Create temp directory ─────────────────────────────────────
    // FileSystem.*Directory returns file:// URIs but Python needs raw paths
    const stripFileUri = (uri: string) => uri.replace(/^file:\/\//, '');

    const tempDir = `${FileSystem.cacheDirectory}novel_download_${Date.now()}/`;
    const chaptersDir = `${tempDir}chapters/`;
    await FileSystem.makeDirectoryAsync(chaptersDir, { intermediates: true });

    // Raw paths for Python/native calls
    const chaptersDirPath = stripFileUri(chaptersDir);

    // ── 2. Download chapters in batches ──────────────────────────────
    updateDownloadStatus('downloading');
    progress.status = 'downloading';
    onProgress?.(progress);

    const chaptersToDownload = novel.chapters.filter((ch) => ch.index >= startFromChapter);
    const totalToDownload = chaptersToDownload.length;
    let downloaded = 0;

    for (let i = 0; i < totalToDownload; i += BATCH_SIZE) {
      const batch = chaptersToDownload.slice(i, i + BATCH_SIZE);

      const result = await downloadChapterBatch(
        novel.sourceId,
        JSON.stringify(batch),
        cookies,
        userAgent,
        chaptersDirPath,
      );

      downloaded += result.success;
      progress.currentChapter = startFromChapter + downloaded;
      updateDownloadProgress(progress.currentChapter, progress.totalChapters);
      onProgress?.(progress);

      // Update the download record after each batch
      updateNovelDownload(db, downloadRecord.id, {
        lastChapterDownloaded: progress.currentChapter,
      });

      if (result.errors.length > 0) {
        console.warn(
          `[NovelDownloader] Batch had ${result.failed} failures:`,
          result.errors.slice(0, 3),
        );
      }
    }

    // ── 3. Download cover image ──────────────────────────────────────
    let coverPath = '';
    if (novel.coverUrl) {
      try {
        const coverFile = `${tempDir}cover.jpg`;
        await FileSystem.downloadAsync(novel.coverUrl, coverFile, {
          headers: {
            'User-Agent': userAgent,
            Cookie: cookies,
            Referer: novel.sourceUrl,
          },
        });
        coverPath = stripFileUri(coverFile);
      } catch (e) {
        console.warn('[NovelDownloader] Cover download failed (non-fatal):', e);
      }
    }

    // ── 4. Generate EPUB ─────────────────────────────────────────────
    updateDownloadStatus('generating_epub');
    progress.status = 'generating_epub';
    onProgress?.(progress);

    const booksDir = `${FileSystem.documentDirectory}books/`;
    await FileSystem.makeDirectoryAsync(booksDir, { intermediates: true });

    const slug = novel.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const outputPath = `${booksDir}${slug}.epub`;

    const metadataJson = JSON.stringify({
      title: novel.title,
      author: novel.author,
      description: novel.description,
      sourceUrl: novel.sourceUrl,
      language: 'en',
    });

    const outputPathRaw = stripFileUri(outputPath);

    const epubResult = await generateNovelEpub(
      chaptersDirPath,
      metadataJson,
      coverPath,
      outputPathRaw,
    );

    if (!epubResult.success) {
      throw new Error(epubResult.error || 'EPUB generation failed');
    }

    // ── 5. Process generated EPUB ────────────────────────────────────
    updateDownloadStatus('importing');
    progress.status = 'importing';
    onProgress?.(progress);

    // FileSystem.documentDirectory already starts with file://, ensure we don't double it
    const outputUri = outputPath.startsWith('file://') ? outputPath : `file://${outputPath}`;
    const epubData = await processEpub(outputUri);

    // ── 6. Import into library ───────────────────────────────────────
    const newBook: NewBook = {
      title: epubData.title || novel.title,
      author: epubData.author || novel.author,
      coverUri: null,
      filePath: outputUri,
      progress: 0,
      lastLocation: null,
      lastChapterTitle: null,
      chapterCount: epubData.chapterCount || downloaded,
      fileSize: null,
      language: epubData.language || 'en',
      description: epubData.description || novel.description,
    };

    const insertedBook = insertBook(db, newBook);

    // Copy cover if available
    if (epubData.coverPath) {
      try {
        const coverUri = await copyCoverToStorage(epubData.coverPath, insertedBook.id);
        if (coverUri) {
          db.runSync(
            `UPDATE books SET cover_uri = ?, updated_at = datetime('now') WHERE id = ?`,
            [coverUri, insertedBook.id],
          );
          insertedBook.coverUri = coverUri;
        }
      } catch (e) {
        console.warn('[NovelDownloader] Cover save failed (non-fatal):', e);
      }
    }

    // Update library store
    useLibraryStore.getState().addBook(insertedBook);

    // Update download record
    updateNovelDownload(db, downloadRecord.id, {
      bookId: insertedBook.id,
      lastChapterDownloaded: downloaded,
      status: 'completed',
      lastCheckedAt: new Date().toISOString(),
    });

    // ── 7. Clean up temp directory ───────────────────────────────────
    try {
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
    } catch (e) {
      console.warn('[NovelDownloader] Temp cleanup failed (non-fatal):', e);
    }

    // ── Done! ────────────────────────────────────────────────────────
    updateDownloadStatus('completed');
    progress.status = 'completed';
    onProgress?.(progress);

    return insertedBook.id;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[NovelDownloader] Download failed:', errorMsg);

    updateDownloadStatus('failed', errorMsg);
    progress.status = 'failed';
    progress.error = errorMsg;
    onProgress?.(progress);

    // Update the download record
    updateNovelDownload(db, downloadRecord.id, {
      status: 'failed',
    });

    return null;
  }
}
