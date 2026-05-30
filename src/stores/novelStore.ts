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

  // Active downloads
  activeDownloads: Record<string, DownloadProgress>;

  // Actions — Search
  setSearchResults: (results: NovelSearchResult[]) => void;
  appendSearchResults: (results: NovelSearchResult[]) => void;
  setSearching: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Actions — Novel details
  setCurrentNovel: (novel: NovelDetails | null) => void;
  setLoadingNovel: (loading: boolean) => void;

  // Actions — Download
  addDownload: (sourceUrl: string, progress: DownloadProgress) => void;
  updateDownloadProgress: (sourceUrl: string, current: number, total: number) => void;
  updateDownloadStatus: (sourceUrl: string, status: DownloadStatus, error?: string) => void;
  removeDownload: (sourceUrl: string) => void;
}

export const useNovelStore = create<NovelStoreState>((set) => ({
  // Initial state
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  currentNovel: null,
  isLoadingNovel: false,
  activeDownloads: {},

  // Search
  setSearchResults: (results) => set({ searchResults: results }),
  appendSearchResults: (results) => set((state) => ({ searchResults: [...state.searchResults, ...results] })),
  setSearching: (loading) => set({ isSearching: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchResults: [], searchQuery: '', isSearching: false }),

  // Novel details
  setCurrentNovel: (novel) => set({ currentNovel: novel }),
  setLoadingNovel: (loading) => set({ isLoadingNovel: loading }),

  // Download
  addDownload: (sourceUrl, progress) =>
    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [sourceUrl]: progress },
    })),
  updateDownloadProgress: (sourceUrl, current, total) =>
    set((state) => {
      const existing = state.activeDownloads[sourceUrl];
      if (!existing) return state;
      return {
        activeDownloads: {
          ...state.activeDownloads,
          [sourceUrl]: { ...existing, currentChapter: current, totalChapters: total },
        },
      };
    }),
  updateDownloadStatus: (sourceUrl, status, error) =>
    set((state) => {
      const existing = state.activeDownloads[sourceUrl];
      if (!existing) return state;
      return {
        activeDownloads: {
          ...state.activeDownloads,
          [sourceUrl]: { ...existing, status, error },
        },
      };
    }),
  removeDownload: (sourceUrl) =>
    set((state) => {
      const { [sourceUrl]: _, ...rest } = state.activeDownloads;
      return { activeDownloads: rest };
    }),
}));
