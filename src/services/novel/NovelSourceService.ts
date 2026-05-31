/**
 * NovelSourceService — TypeScript wrapper for the NovelSource native module.
 *
 * All calls bridge to Python via Kotlin (Chaquopy).
 */

import { NativeModules } from 'react-native';
import type {
  NovelSearchResult,
  NovelDetails,
  BatchDownloadResult,
  EpubGenerationResult,
} from '../../types/novel';

const { NovelSource } = NativeModules;

/**
 * Search novels across a source.
 */
export async function searchNovels(
  sourceId: string,
  query: string,
  cookies: string,
  userAgent: string,
): Promise<NovelSearchResult[]> {
  const json = await NovelSource.searchNovels(sourceId, query, cookies, userAgent);
  const parsed = JSON.parse(json);
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  
  // Inject sourceId into every result so UI knows where it came from
  if (Array.isArray(parsed)) {
    parsed.forEach((item: NovelSearchResult) => {
      item.sourceId = sourceId;
    });
  }
  
  return parsed;
}

/**
 * Get full novel details including chapter list (all pages).
 */
export async function getNovelDetails(
  sourceId: string,
  url: string,
  cookies: string,
  userAgent: string,
): Promise<NovelDetails> {
  const json = await NovelSource.getNovelDetails(sourceId, url, cookies, userAgent);
  const parsed = JSON.parse(json);
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}

/**
 * Download a batch of chapters to a temp directory.
 */
export async function downloadChapterBatch(
  sourceId: string,
  chaptersJson: string,
  cookies: string,
  userAgent: string,
  outputDir: string,
): Promise<BatchDownloadResult> {
  const json = await NovelSource.downloadChapterBatch(
    sourceId,
    chaptersJson,
    cookies,
    userAgent,
    outputDir,
  );
  return JSON.parse(json);
}

/**
 * Generate an EPUB from downloaded chapter files.
 */
export async function generateNovelEpub(
  chaptersDir: string,
  metadataJson: string,
  coverImagePath: string,
  outputPath: string,
): Promise<EpubGenerationResult> {
  const json = await NovelSource.generateNovelEpub(chaptersDir, metadataJson, coverImagePath, outputPath);
  return JSON.parse(json);
}

export function showDownloadNotification(id: number, title: string, progress: number, total: number, status: string) {
  NovelSource.showDownloadNotification(id, title, progress, total, status);
}

export function cancelDownloadNotification(id: number): void {
  NovelSource.cancelDownloadNotification(id);
}

/**
 * Update an existing EPUB with new chapter files.
 */
export async function updateNovelEpub(
  existingEpubPath: string,
  newChaptersDir: string,
  outputEpubPath: string,
): Promise<{ success: boolean; path?: string; error?: string; appendedCount?: number }> {
  const json = await NovelSource.updateNovelEpub(
    existingEpubPath,
    newChaptersDir,
    outputEpubPath,
  );
  return JSON.parse(json);
}
