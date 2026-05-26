import type { HighlightColor } from './book';
import type { ReaderTheme, TocItem } from './reader';

// ═══════════════════════════════════════════════════════════════════════════════
// WebView → React Native  (messages the WebView sends to RN)
// ═══════════════════════════════════════════════════════════════════════════════

export interface WVReadyMessage {
  type: 'ready';
}

export interface WVLocationChangedMessage {
  type: 'locationChanged';
  cfi: string;
  progress: number;
  chapterIndex: number;
  chapterTitle: string;
}

export interface WVTocLoadedMessage {
  type: 'tocLoaded';
  toc: TocItem[];
}

export interface WVTextSelectedMessage {
  type: 'textSelected';
  cfiRange: string;
  selectedText: string;
  chapterTitle: string;
  /** Coordinates relative to WebView for positioning a context menu */
  rect: { x: number; y: number; width: number; height: number };
}

export interface WVBookmarkContextMessage {
  type: 'bookmarkContext';
  cfi: string;
  chapterTitle: string;
  contextText: string;
}

export interface WVTapMessage {
  type: 'tap';
  /** Normalised X position 0.0 – 1.0 */
  x: number;
  /** Normalised Y position 0.0 – 1.0 */
  y: number;
}

export interface WVSwipeMessage {
  type: 'swipe';
  direction: 'left' | 'right';
}

export interface WVErrorMessage {
  type: 'error';
  message: string;
  stack?: string;
}

export interface WVContentLoadedMessage {
  type: 'contentLoaded';
  totalPages: number;
}

export type WebViewMessage =
  | WVReadyMessage
  | WVLocationChangedMessage
  | WVTocLoadedMessage
  | WVTextSelectedMessage
  | WVBookmarkContextMessage
  | WVTapMessage
  | WVSwipeMessage
  | WVErrorMessage
  | WVContentLoadedMessage;

// ═══════════════════════════════════════════════════════════════════════════════
// React Native → WebView  (commands RN sends into the WebView)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RNLoadBookCommand {
  type: 'loadBook';
  /** Base-64 encoded EPUB *or* a file URI */
  uri: string;
  initialCfi?: string;
}

export interface RNGoToCfiCommand {
  type: 'goToCfi';
  cfi: string;
}

export interface RNGoToHighlightCommand {
  type: 'goToHighlight';
  cfiRange: string;
}

export interface RNGoToChapterCommand {
  type: 'goToChapter';
  href: string;
}

export interface RNNextPageCommand {
  type: 'nextPage';
}

export interface RNPrevPageCommand {
  type: 'prevPage';
}

export interface RNApplyThemeCommand {
  type: 'applyTheme';
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  margins: number;
}

export interface RNAddHighlightCommand {
  type: 'addHighlight';
  cfiRange: string;
  color: HighlightColor;
  id: number;
}

export interface RNRemoveHighlightCommand {
  type: 'removeHighlight';
  cfiRange: string;
  id: number;
}

export interface RNClearSelectionCommand {
  type: 'clearSelection';
}

export interface RNGetBookmarkContextCommand {
  type: 'getBookmarkContext';
}

export interface RNRestoreHighlightsCommand {
  type: 'restoreHighlights';
  highlights: Array<{ cfiRange: string; color: HighlightColor; id: number }>;
}

export type ReaderCommand =
  | RNLoadBookCommand
  | RNGoToCfiCommand
  | RNGoToChapterCommand
  | RNNextPageCommand
  | RNPrevPageCommand
  | RNApplyThemeCommand
  | RNAddHighlightCommand
  | RNRemoveHighlightCommand
  | RNClearSelectionCommand
  | RNGetBookmarkContextCommand
  | RNGoToHighlightCommand
  | RNRestoreHighlightsCommand;

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialise a command to the JS string that will be injected into the WebView.
 * The WebView's `window.handleReaderCommand(cmd)` function receives it.
 */
export function serializeCommand(command: ReaderCommand): string {
  return `window.handleReaderCommand(${JSON.stringify(command)});`;
}

/**
 * Parse a raw `event.nativeEvent.data` string into a typed WebViewMessage.
 * Returns `null` when the payload cannot be parsed.
 */
export function parseWebViewMessage(data: string): WebViewMessage | null {
  try {
    const parsed = JSON.parse(data) as WebViewMessage;
    if (parsed && typeof parsed.type === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
