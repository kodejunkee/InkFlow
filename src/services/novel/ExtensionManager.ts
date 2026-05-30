/**
 * ExtensionManager — Source registry for novel sources.
 *
 * All sources are bundled with the app and registered here.
 * Users can enable/disable sources. Adding a new source = adding a new
 * Python file + registering it here.
 */

import type { NovelSource } from '../../types/novel';

// ─── Source Registry ─────────────────────────────────────────────────────────

const SOURCES: NovelSource[] = [
  {
    id: 'allnovel',
    name: 'AllNovel',
    baseUrl: 'https://allnovel.org',
    enabled: true,
  },
  {
    id: 'royalroad',
    name: 'RoyalRoad',
    baseUrl: 'https://www.royalroad.com',
    enabled: true,
  },
  {
    id: 'novelbin',
    name: 'NovelBin',
    baseUrl: 'https://novelbin.me',
    enabled: true,
  },
  {
    id: 'boxnovel',
    name: 'BoxNovel',
    baseUrl: 'https://boxnovel.com',
    enabled: true,
  },
  {
    id: 'lightnovelpub',
    name: 'LightNovelPub',
    baseUrl: 'https://www.lightnovelpub.com',
    enabled: true,
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/** Get all registered sources. */
export function getAllSources(): NovelSource[] {
  return [...SOURCES];
}

/** Get only enabled sources. */
export function getEnabledSources(): NovelSource[] {
  return SOURCES.filter((s) => s.enabled);
}

/** Get a source by ID. */
export function getSource(id: string): NovelSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** Enable or disable a source. */
export function setSourceEnabled(id: string, enabled: boolean): void {
  const source = SOURCES.find((s) => s.id === id);
  if (source) {
    source.enabled = enabled;
  }
}
