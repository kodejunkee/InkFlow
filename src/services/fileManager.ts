import { File, Directory, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';

// ─── Directory paths ─────────────────────────────────────────────────────────

const BOOKS_DIR_NAME = 'books';
const COVERS_DIR_NAME = 'covers';

/**
 * Get or create the books directory.
 */
export function getBookDirectory(): Directory {
  return new Directory(Paths.document, BOOKS_DIR_NAME);
}

/**
 * Get or create the covers directory.
 */
export function getCoverDirectory(): Directory {
  return new Directory(Paths.document, COVERS_DIR_NAME);
}

// ─── Directory setup ─────────────────────────────────────────────────────────

/**
 * Ensure the books and covers directories exist. Call on app startup.
 */
export function ensureDirectories(): void {
  const bookDir = getBookDirectory();
  const coverDir = getCoverDirectory();

  if (!bookDir.exists) {
    bookDir.create();
  }
  if (!coverDir.exists) {
    coverDir.create();
  }
}

// ─── File operations ─────────────────────────────────────────────────────────

/**
 * Copy an EPUB from a picker/cache URI into the app's books directory.
 *
 * @param sourceUri  The URI returned by the document picker (content:// or file://)
 * @param fileName   Desired file name including `.epub` extension
 * @returns Absolute URI to the copied file
 */
export async function copyEpubToStorage(
  sourceUri: string,
  fileName: string,
): Promise<string> {
  ensureDirectories();

  const sanitisedName = sanitiseFileName(fileName);
  const bookDir = getBookDirectory();
  let destFile = new File(bookDir, sanitisedName);

  // If a file with this name already exists, add a timestamp suffix.
  if (destFile.exists) {
    destFile = new File(bookDir, addTimestamp(sanitisedName));
  }

  // Use legacy FileSystem.copyAsync which handles content:// URIs from
  // the document picker, unlike the new File API.
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destFile.uri,
  });

  return destFile.uri;
}

/**
 * Copy a cover image to the covers directory.
 *
 * @param sourcePath  Absolute path/URI to the cover image (from the native processor)
 * @param bookId      Book ID used to name the cover file
 * @returns The new file URI, or `null` if the source doesn't exist
 */
export function copyCoverToStorage(
  sourcePath: string,
  bookId: number,
): string | null {
  ensureDirectories();

  const sourceFile = new File(sourcePath);
  if (!sourceFile.exists) {
    return null;
  }

  // Preserve the original extension.
  const ext = sourceFile.extension || '.jpg';
  const coverDir = getCoverDirectory();
  const destFile = new File(coverDir, `cover_${bookId}${ext}`);

  sourceFile.copy(destFile);

  return destFile.uri;
}

/**
 * Delete all files associated with a book (the EPUB and its cover image).
 */
export function deleteBookFiles(
  bookId: number,
  filePath: string | null,
  coverUri: string | null,
): void {
  if (filePath) {
    safeDelete(filePath);
  }

  if (coverUri) {
    safeDelete(coverUri);
  }

  // Also try to clean up any cover with the standard naming convention.
  const coverDir = getCoverDirectory();
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    safeDelete(new File(coverDir, `cover_${bookId}${ext}`).uri);
  }
}

/**
 * Get the size of a file in bytes, or `null` if the file doesn't exist.
 */
export function getFileSize(filePath: string): number | null {
  try {
    const file = new File(filePath);
    if (file.exists) {
      return file.size ?? null;
    }
  } catch {
    // Swallow
  }
  return null;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function safeDelete(path: string): void {
  try {
    const file = new File(path);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Swallow — best-effort cleanup.
  }
}

function sanitiseFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function addTimestamp(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${name}_${Date.now()}`;
  }
  const base = name.slice(0, dotIndex);
  const ext = name.slice(dotIndex);
  return `${base}_${Date.now()}${ext}`;
}
