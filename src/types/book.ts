// ─── Book ────────────────────────────────────────────────────────────────────

export interface Book {
  id: number;
  title: string;
  author: string;
  coverUri: string | null;
  filePath: string;
  /** Reading progress as a fraction 0.0 – 1.0 */
  progress: number;
  /** EPUB CFI of the last read position */
  lastLocation: string | null;
  lastChapterTitle: string | null;
  chapterCount: number;
  fileSize: number | null;
  /** BCP-47 language tag, e.g. "en" */
  language: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Bookmark ────────────────────────────────────────────────────────────────

export interface Bookmark {
  id: number;
  bookId: number;
  /** EPUB CFI pointing to the bookmarked location */
  cfi: string;
  chapterTitle: string;
  /** User-provided label (defaults to chapter title on creation) */
  label: string;
  createdAt: string;
}

// ─── Highlight ───────────────────────────────────────────────────────────────

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface Highlight {
  id: number;
  bookId: number;
  /** EPUB CFI range covering the highlighted text */
  cfiRange: string;
  selectedText: string;
  chapterTitle: string;
  note: string | null;
  color: HighlightColor;
  createdAt: string;
  updatedAt: string;
}

// ─── EPUB Processing ─────────────────────────────────────────────────────────

export interface ProcessedChapter {
  /** Chapter index in reading order */
  index: number;
  href: string;
  title: string;
}

export interface ProcessedEpub {
  title: string;
  author: string;
  /** Absolute path to the extracted cover image, or null */
  coverPath: string | null;
  chapterCount: number;
  /** BCP-47 language tag */
  language: string;
  description: string | null;
  chapters: ProcessedChapter[];
  /** Path to the EPUB file itself */
  filePath: string;
}

// ─── Convenience type for creating a new book from a processed EPUB ─────────

export type NewBook = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;
