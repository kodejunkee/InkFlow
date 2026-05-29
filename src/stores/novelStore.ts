/**
 * novelStore — Zustand store for the Browse/Download system.
 */

import { create } from 'zustand';
import type {
  NovelSearchResult,
  NovelDetails,
  DownloadProgress,
  DownloadStatus,
} from '../types/novel';

interface NovelStoreState {
  // Search
  searchResults: NovelSearchResult[];
  isSearching: boolean;
  searchQuery: string;

  // Currently viewed novel
  currentNovel: NovelDetails | null;
  isLoadingNovel: boolean;

  // Active download
  activeDownload: DownloadProgress | null;

  // Actions — Search
  setSearchResults: (results: NovelSearchResult[]) => void;
  setSearching: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Actions — Novel details
  setCurrentNovel: (novel: NovelDetails | null) => void;
  setLoadingNovel: (loading: boolean) => void;

  // Actions — Download
  setActiveDownload: (progress: DownloadProgress | null) => void;
  updateDownloadProgress: (current: number, total: number) => void;
  updateDownloadStatus: (status: DownloadStatus, error?: string) => void;
}

export const useNovelStore = create<NovelStoreState>((set) => ({
  // Initial state
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  currentNovel: null,
  isLoadingNovel: false,
  activeDownload: null,

  // Search
  setSearchResults: (results) => set({ searchResults: results }),
  setSearching: (loading) => set({ isSearching: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchResults: [], searchQuery: '', isSearching: false }),

  // Novel details
  setCurrentNovel: (novel) => set({ currentNovel: novel }),
  setLoadingNovel: (loading) => set({ isLoadingNovel: loading }),

  // Download
  setActiveDownload: (progress) => set({ activeDownload: progress }),
  updateDownloadProgress: (current, total) =>
    set((state) => ({
      activeDownload: state.activeDownload
        ? { ...state.activeDownload, currentChapter: current, totalChapters: total }
        : null,
    })),
  updateDownloadStatus: (status, error) =>
    set((state) => ({
      activeDownload: state.activeDownload
        ? { ...state.activeDownload, status, error }
        : null,
    })),
}));
