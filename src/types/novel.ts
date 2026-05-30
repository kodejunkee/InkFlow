/**
 * Novel Acquisition System — Type Definitions
 *
 * Shared interfaces for novel sources, search results, downloads,
 * and the extension system.
 */

// ─── Source Definition ───────────────────────────────────────────────────────

export interface NovelSource {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface NovelSearchResult {
  title: string;
  author: string;
  coverUrl: string;
  sourceUrl: string;
  sourceId: string;
  status: string;
  latestChapter: string;
  description: string;
}

// ─── Novel Details ───────────────────────────────────────────────────────────

export interface NovelChapter {
  index: number;
  title: string;
  url: string;
}

export interface NovelDetails {
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  status: string;
  genres: string[];
  sourceUrl: string;
  sourceId: string;
  totalChapters: number;
  chapters: NovelChapter[];
}

// ─── Download Progress ───────────────────────────────────────────────────────

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'generating_epub'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface DownloadProgress {
  novelTitle: string;
  sourceUrl: string;
  currentChapter: number;
  totalChapters: number;
  status: DownloadStatus;
  error?: string;
  coverUrl?: string;
}

// ─── Database Record ─────────────────────────────────────────────────────────

export interface NovelDownloadRecord {
  id: number;
  bookId: number | null;
  sourceId: string;
  sourceUrl: string;
  novelTitle: string;
  lastChapterDownloaded: number;
  totalChapters: number;
  status: string;
  lastCheckedAt: string | null;
  createdAt: string;
}

// ─── Batch Download Result ───────────────────────────────────────────────────

export interface BatchDownloadResult {
  success: number;
  failed: number;
  errors: string[];
}

// ─── EPUB Generation Result ──────────────────────────────────────────────────

export interface EpubGenerationResult {
  success: boolean;
  path?: string;
  chapterCount?: number;
  error?: string;
}

// ─── Update Check ────────────────────────────────────────────────────────────

export interface UpdateCheckResult {
  hasUpdates: boolean;
  newChapters: number;
  currentChapters: number;
  totalChapters: number;
}

// ─── Cookie State ────────────────────────────────────────────────────────────

export type CookieStatus = 'idle' | 'connecting' | 'ready' | 'error';

export interface CookieState {
  cookies: string;
  userAgent: string;
  status: CookieStatus;
}
