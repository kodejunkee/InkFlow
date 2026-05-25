import { useCallback, useState } from 'react';
import type { ProcessedEpub } from '../types/book';
import { processEpub } from '../services/epubProcessor';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseEpubProcessorResult {
  /** Process an EPUB file and return structured metadata. */
  process: (filePath: string) => Promise<ProcessedEpub>;
  /** Whether the processor is currently working. */
  isProcessing: boolean;
  /** The most recent processing error, or `null`. */
  error: Error | null;
  /** Clear the current error state. */
  clearError: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Wraps the native `EpubProcessor` service with React-friendly loading and
 * error state.
 *
 * ```tsx
 * const { process, isProcessing, error } = useEpubProcessor();
 * const epub = await process('/path/to/book.epub');
 * ```
 */
export function useEpubProcessor(): UseEpubProcessorResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const process = useCallback(async (filePath: string): Promise<ProcessedEpub> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await processEpub(filePath);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    process,
    isProcessing,
    error,
    clearError,
  };
}
