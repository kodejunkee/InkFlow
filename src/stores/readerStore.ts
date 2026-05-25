import { create } from 'zustand';
import type { Book } from '../types/book';
import type { TocItem } from '../types/reader';

// ─── State shape ─────────────────────────────────────────────────────────────

interface ReaderState {
  /** The currently open book, or `null` when no book is open. */
  currentBook: Book | null;
  /** Current EPUB CFI position. */
  currentCfi: string | null;
  /** Reading progress 0.0 – 1.0. */
  progress: number;
  /** Title of the chapter currently being read. */
  chapterTitle: string;
  /** Zero-based index of the current chapter. */
  chapterIndex: number;
  /** Full table of contents received from the WebView. */
  toc: TocItem[];
  /** Whether the reader overlay (header/footer) is visible. */
  isOverlayVisible: boolean;
  /** Whether the chapter list drawer is open. */
  isChapterDrawerOpen: boolean;
}

interface ReaderActions {
  /** Open a book in the reader. */
  setBook: (book: Book) => void;
  /** Called on every location change from the WebView. */
  updateLocation: (
    cfi: string,
    progress: number,
    chapterIndex: number,
    chapterTitle: string,
  ) => void;
  /** Toggle the reader overlay (header + footer bar). */
  toggleOverlay: () => void;
  /** Explicitly set overlay visibility. */
  setOverlayVisible: (visible: boolean) => void;
  /** Toggle the chapter drawer open/closed. */
  toggleChapterDrawer: () => void;
  /** Explicitly set chapter drawer state. */
  setChapterDrawerOpen: (open: boolean) => void;
  /** Store the parsed table of contents. */
  setToc: (toc: TocItem[]) => void;
  /** Reset the store to its initial state (when leaving the reader). */
  resetReader: () => void;
}

type ReaderStore = ReaderState & ReaderActions;

// ─── Initial state ──────────────────────────────────────────────────────────

const initialState: ReaderState = {
  currentBook: null,
  currentCfi: null,
  progress: 0,
  chapterTitle: '',
  chapterIndex: 0,
  toc: [],
  isOverlayVisible: false,
  isChapterDrawerOpen: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useReaderStore = create<ReaderStore>()((set) => ({
  ...initialState,

  setBook: (book) =>
    set({
      currentBook: book,
      currentCfi: book.lastLocation,
      progress: book.progress,
      chapterTitle: book.lastChapterTitle ?? '',
      chapterIndex: 0,
      toc: [],
      isOverlayVisible: false,
      isChapterDrawerOpen: false,
    }),

  updateLocation: (cfi, progress, chapterIndex, chapterTitle) =>
    set({
      currentCfi: cfi,
      progress,
      chapterIndex,
      chapterTitle,
    }),

  toggleOverlay: () =>
    set((state) => ({
      isOverlayVisible: !state.isOverlayVisible,
      // Close the chapter drawer when hiding the overlay.
      isChapterDrawerOpen: state.isOverlayVisible
        ? false
        : state.isChapterDrawerOpen,
    })),

  setOverlayVisible: (visible) =>
    set({
      isOverlayVisible: visible,
      ...(!visible && { isChapterDrawerOpen: false }),
    }),

  toggleChapterDrawer: () =>
    set((state) => ({
      isChapterDrawerOpen: !state.isChapterDrawerOpen,
    })),

  setChapterDrawerOpen: (open) => set({ isChapterDrawerOpen: open }),

  setToc: (toc) => set({ toc }),

  resetReader: () => set(initialState),
}));
