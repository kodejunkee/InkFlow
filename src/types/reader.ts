// ─── Table of Contents ───────────────────────────────────────────────────────

export interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export type ReaderTheme = 'light' | 'dark' | 'sepia' | 'ocean';

// ─── Reader Settings ─────────────────────────────────────────────────────────

export interface ReaderSettings {
  /** Font size in px */
  fontSize: number;
  /** CSS line-height multiplier, e.g. 1.8 */
  lineHeight: number;
  /** Horizontal margin in px */
  margins: number;
  theme: ReaderTheme;
}

// ─── Reading Position ────────────────────────────────────────────────────────

export interface ReadingPosition {
  /** EPUB CFI string */
  cfi: string;
  /** Reading progress 0.0 – 1.0 */
  progress: number;
  /** Zero-based chapter index */
  chapterIndex: number;
  chapterTitle: string;
}

// ─── Reader Overlay State ────────────────────────────────────────────────────

export type OverlayPanel = 'none' | 'toc' | 'settings' | 'bookmarks' | 'highlights';
