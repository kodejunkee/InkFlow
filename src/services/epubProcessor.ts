import { NativeModules, Platform } from 'react-native';
import type { ProcessedEpub } from '../types/book';

// ─── Native bridge ───────────────────────────────────────────────────────────

interface EpubProcessorNative {
  /** Process an EPUB file and return metadata + chapters as a JSON string. */
  processEpub(filePath: string): Promise<string>;
  /** Lightweight metadata-only scan. */
  getEpubInfo(filePath: string): Promise<string>;
  /** Generate a quote card image. Returns the output file path. */
  generateQuoteCard(
    coverPath: string,
    quoteText: string,
    author: string,
    title: string,
    chapterTitle: string,
    outputPath: string,
  ): Promise<string>;
}

const Native =
  NativeModules.EpubProcessor as EpubProcessorNative | undefined;

function getNativeModule(): EpubProcessorNative {
  if (!Native) {
    throw new Error(
      `NativeModules.EpubProcessor is not available. ` +
        `Platform: ${Platform.OS}. ` +
        `Make sure the native module is linked and the app is rebuilt.`,
    );
  }
  return Native;
}

// ─── Raw native response typing ──────────────────────────────────────────────

interface NativeProcessResult {
  success: boolean;
  error?: string;
  title: string;
  author: string;
  coverPath: string | null;
  chapterCount: number;
  language: string;
  description: string | null;
  chapters: Array<{
    index: number;
    href: string;
    title: string;
  }>;
  normalizedPath: string | null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Process an EPUB file through the native module.
 *
 * The native side (Kotlin + Python via Chaquopy) extracts metadata, TOC, and
 * cover art, then returns a JSON string which this function parses into a
 * typed `ProcessedEpub`.
 */
export async function processEpub(filePath: string): Promise<ProcessedEpub> {
  const mod = getNativeModule();

  try {
    const jsonString = await mod.processEpub(filePath);
    const raw: NativeProcessResult = JSON.parse(jsonString);

    return {
      title: raw.title || 'Untitled',
      author: raw.author || 'Unknown',
      coverPath: raw.coverPath,
      chapterCount: raw.chapterCount,
      language: raw.language || 'en',
      description: raw.description,
      chapters: (raw.chapters || []).map((ch) => ({
        index: ch.index,
        href: ch.href,
        title: ch.title,
      })),
      filePath: raw.normalizedPath || filePath,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown processing error';
    throw new Error(`Failed to process EPUB: ${message}`);
  }
}

// ─── Quote Card ──────────────────────────────────────────────────────────────

export interface QuoteCardParams {
  coverPath: string;
  quoteText: string;
  author: string;
  title: string;
  chapterTitle: string;
  outputPath: string;
}

/**
 * Generate a shareable quote card image from a highlight.
 * Returns the absolute path to the generated image file.
 */
export async function generateQuoteCard(
  params: QuoteCardParams,
): Promise<string> {
  const mod = getNativeModule();

  try {
    return await mod.generateQuoteCard(
      params.coverPath,
      params.quoteText,
      params.author,
      params.title,
      params.chapterTitle,
      params.outputPath,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate quote card: ${message}`);
  }
}
