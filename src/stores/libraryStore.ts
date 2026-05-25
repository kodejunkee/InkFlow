import { create } from 'zustand';
import type { Book } from '../types/book';

// ─── State shape ─────────────────────────────────────────────────────────────

interface LibraryState {
  books: Book[];
  isLoading: boolean;
  isImporting: boolean;
  /** Import progress 0.0 – 1.0, meaningful only while `isImporting` is true. */
  importProgress: number;
}

interface LibraryActions {
  /** Replace the entire book list (typically after loading from DB). */
  loadBooks: (books: Book[]) => void;
  /** Prepend a newly imported book to the list. */
  addBook: (book: Book) => void;
  /** Remove a book by ID. */
  removeBook: (bookId: number) => void;
  /** Update an existing book in-place (matched by `id`). */
  updateBook: (book: Book) => void;
  /** Set the loading flag. */
  setLoading: (loading: boolean) => void;
  /** Set importing state and optionally reset progress. */
  setImporting: (importing: boolean) => void;
  /** Update import progress (0.0 – 1.0). */
  setImportProgress: (progress: number) => void;
}

type LibraryStore = LibraryState & LibraryActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLibraryStore = create<LibraryStore>()((set) => ({
  books: [],
  isLoading: false,
  isImporting: false,
  importProgress: 0,

  loadBooks: (books) => set({ books, isLoading: false }),

  addBook: (book) =>
    set((state) => ({
      books: [book, ...state.books],
    })),

  removeBook: (bookId) =>
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
    })),

  updateBook: (book) =>
    set((state) => ({
      books: state.books.map((b) => (b.id === book.id ? book : b)),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setImporting: (isImporting) =>
    set({
      isImporting,
      importProgress: isImporting ? 0 : 0,
    }),

  setImportProgress: (importProgress) => set({ importProgress }),
}));
