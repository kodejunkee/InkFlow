"""
InkFlow EPUB Processor — Main Entry Point

Called from Kotlin via Chaquopy. All public functions return JSON strings.
"""

import json
import os
import traceback

def process_epub(file_path):
    """
    Full EPUB processing pipeline.
    
    Args:
        file_path: Absolute path to the EPUB file on Android storage.
    
    Returns:
        JSON string with: title, author, coverPath, chapterCount, language,
        description, chapters, normalizedPath, success, error
    """
    result = {
        "success": False,
        "error": None,
        "title": "Unknown Title",
        "author": "Unknown Author",
        "coverPath": None,
        "chapterCount": 0,
        "language": "en",
        "description": None,
        "chapters": [],
        "normalizedPath": None,
    }

    try:
        import ebooklib
        from ebooklib import epub
    except ImportError as e:
        result["error"] = f"ebooklib not available: {e}"
        return json.dumps(result)

    if not os.path.exists(file_path):
        result["error"] = f"File not found: {file_path}"
        return json.dumps(result)

    # Create working directory alongside the EPUB
    work_dir = os.path.splitext(file_path)[0] + "_inkflow"
    os.makedirs(work_dir, exist_ok=True)

    # ── 1. Open EPUB ─────────────────────────────────────────────────────
    book = None
    try:
        book = epub.read_epub(file_path, options={"ignore_ncx": False})
    except Exception:
        try:
            book = epub.read_epub(file_path, options={"ignore_ncx": True})
        except Exception as e:
            result["error"] = f"Cannot read EPUB: {e}"
            return json.dumps(result)

    # ── 2. Extract metadata ──────────────────────────────────────────────
    try:
        from metadata_extractor import extract_metadata
        meta = extract_metadata(book)
        result["title"] = meta.get("title", "Unknown Title")
        result["author"] = meta.get("author", "Unknown Author")
        result["language"] = meta.get("language", "en")
        result["description"] = meta.get("description", None)
    except Exception as e:
        result["error"] = f"Metadata extraction failed: {e}"
        # Continue — we have fallback values

    # ── 3. Extract cover ─────────────────────────────────────────────────
    try:
        from cover_extractor import extract_cover
        cover_path = extract_cover(book, work_dir)
        result["coverPath"] = cover_path
    except Exception as e:
        # Not fatal — we just won't have a cover
        pass

    # ── 4. Extract chapters ──────────────────────────────────────────────
    try:
        import ebooklib
        chapters = []
        idx = 0
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            title = _extract_chapter_title(item)
            chapters.append({
                "index": idx,
                "href": item.get_name(),
                "title": title or f"Chapter {idx + 1}",
            })
            idx += 1
        result["chapters"] = chapters
        result["chapterCount"] = len(chapters)
    except Exception as e:
        result["error"] = f"Chapter extraction failed: {e}"

    # ── 5. Normalize EPUB ────────────────────────────────────────────────
    try:
        from epub_normalizer import normalize_epub
        normalized = normalize_epub(file_path, work_dir, book)
        result["normalizedPath"] = normalized
    except Exception as e:
        # Non-fatal — reader can use original file
        result["normalizedPath"] = file_path

    # If we got a title, consider it a success even if some steps failed
    if result["title"] != "Unknown Title" or result["chapterCount"] > 0:
        result["success"] = True
    else:
        result["success"] = True  # Even minimal extraction is OK
        if not result["error"]:
            # Use filename as title fallback
            basename = os.path.basename(file_path)
            name = os.path.splitext(basename)[0].replace("_", " ").replace("-", " ")
            result["title"] = name.title()

    return json.dumps(result)


def _extract_chapter_title(item):
    """Try to extract a chapter title from an EPUB document item."""
    try:
        from bs4 import BeautifulSoup
        content = item.get_content().decode("utf-8", errors="replace")
        soup = BeautifulSoup(content, "lxml")
        
        # Try heading tags first
        for tag in ["h1", "h2", "h3", "title"]:
            heading = soup.find(tag)
            if heading and heading.get_text(strip=True):
                return heading.get_text(strip=True)[:100]
        
        return None
    except Exception:
        return None


def get_epub_info(file_path):
    """
    Lightweight metadata-only scan for library browsing.
    Returns JSON with title, author, language only.
    """
    result = {"title": "Unknown Title", "author": "Unknown Author", "language": "en"}
    
    try:
        from ebooklib import epub
        book = epub.read_epub(file_path, options={"ignore_ncx": True})
        from metadata_extractor import extract_metadata
        meta = extract_metadata(book)
        result.update(meta)
    except Exception:
        # Use filename as fallback
        basename = os.path.basename(file_path)
        name = os.path.splitext(basename)[0].replace("_", " ").replace("-", " ")
        result["title"] = name.title()
    
    return json.dumps(result)
