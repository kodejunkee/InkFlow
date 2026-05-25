/**
 * useQuoteCard — Hook for generating and sharing quote card images
 *
 * Orchestrates: generate image via Python → preview → share via native sheet
 */

import { useCallback, useState } from 'react';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';
import { generateQuoteCard } from '../services/epubProcessor';

interface QuoteInput {
  coverPath: string | null;
  quoteText: string;
  author: string;
  title: string;
  chapterTitle: string;
}

interface UseQuoteCardResult {
  /** Generate a quote card image. Returns the file path on success. */
  generate: (input: QuoteInput) => Promise<string | null>;
  /** Share the most recently generated card via the OS share sheet. */
  share: () => Promise<void>;
  /** Whether generation is in progress. */
  isGenerating: boolean;
  /** Path to the most recently generated card image, or null. */
  cardPath: string | null;
  /** Most recent error, or null. */
  error: string | null;
  /** Clear the generated card and error state. */
  reset: () => void;
}

/**
 * Get or create the quote-cards output directory.
 */
function getQuoteDirectory(): Directory {
  const dir = new Directory(Paths.document, 'quote_cards');
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

export function useQuoteCard(): UseQuoteCardResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardPath, setCardPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (input: QuoteInput): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);
      setCardPath(null);

      try {
        const quotesDir = getQuoteDirectory();
        const filename = `quote_${Date.now()}.jpg`;
        const outputFile = new File(quotesDir, filename);
        const outputPath = outputFile.uri;

        const result = await generateQuoteCard({
          coverPath: input.coverPath || '',
          quoteText: input.quoteText,
          author: input.author,
          title: input.title,
          chapterTitle: input.chapterTitle,
          outputPath,
        });

        setCardPath(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to generate quote card';
        setError(msg);
        console.error('[useQuoteCard] Generation failed:', msg);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const share = useCallback(async () => {
    if (!cardPath) return;

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(cardPath, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Quote Card',
        });
      } else {
        setError('Sharing is not available on this device');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Share failed';
      setError(msg);
      console.error('[useQuoteCard] Share failed:', msg);
    }
  }, [cardPath]);

  const reset = useCallback(() => {
    setCardPath(null);
    setError(null);
  }, []);

  return {
    generate,
    share,
    isGenerating,
    cardPath,
    error,
    reset,
  };
}
