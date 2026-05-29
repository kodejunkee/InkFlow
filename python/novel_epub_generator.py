"""
InkFlow Novel EPUB Generator

Assembles downloaded chapter JSON files into a valid EPUB3 book.
Uses ebooklib (same library as the existing EPUB pipeline).
"""

import json
import logging
import os
import re

logging.basicConfig(level=logging.INFO, format="[InkFlow] %(levelname)s %(message)s")
log = logging.getLogger("novel_epub_generator")


def generate_epub(
    chapters_dir: str,
    metadata_json: str,
    cover_image_path: str,
    output_path: str,
) -> str:
    """
    Generate an EPUB3 file from downloaded chapter JSON files.

    Args:
        chapters_dir:    Directory containing ``chapter_0001.json`` etc.
        metadata_json:   JSON string with ``{title, author, description, sourceUrl, language}``.
        cover_image_path: Absolute path to a cover image, or empty string if none.
        output_path:     Where to write the final ``.epub`` file.

    Returns:
        JSON string:
            On success — ``{success: true, path: "<path>", chapterCount: N}``
            On failure — ``{success: false, error: "<message>"}``
    """
    try:
        import ebooklib
        from ebooklib import epub
    except ImportError as e:
        return json.dumps({"success": False, "error": f"ebooklib not available: {e}"})

    try:
        # ── Parse metadata ────────────────────────────────────────────────
        meta = json.loads(metadata_json) if isinstance(metadata_json, str) else metadata_json
        title = meta.get("title", "Unknown Title")
        author = meta.get("author", "Unknown Author")
        description = meta.get("description", "")
        source_url = meta.get("sourceUrl", "")
        language = meta.get("language", "en")

        # ── Collect chapter files ─────────────────────────────────────────
        chapter_files = _collect_chapter_files(chapters_dir)
        if not chapter_files:
            return json.dumps({"success": False, "error": "No chapter files found"})

        log.info("Generating EPUB: '%s' — %d chapters", title, len(chapter_files))

        # ── Create EPUB book ──────────────────────────────────────────────
        book = epub.EpubBook()

        # Metadata
        book.set_identifier(f"inkflow-novel-{_slugify(title)}")
        book.set_title(title)
        book.set_language(language)
        book.add_author(author)

        if description:
            book.add_metadata("DC", "description", description)
        if source_url:
            book.add_metadata("DC", "source", source_url)

        # ── Cover image ──────────────────────────────────────────────────
        cover_item = None
        if cover_image_path and os.path.isfile(cover_image_path):
            try:
                ext = os.path.splitext(cover_image_path)[1].lower()
                media_type = {
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".gif": "image/gif",
                    ".webp": "image/webp",
                }.get(ext, "image/jpeg")

                with open(cover_image_path, "rb") as f:
                    cover_data = f.read()

                cover_filename = f"cover{ext}"
                book.set_cover(cover_filename, cover_data)

                # Create a cover XHTML page
                cover_item = _create_cover_page(book, cover_filename, media_type)
                log.info("Cover image added: %s", cover_image_path)
            except Exception as e:
                log.warning("Failed to add cover image: %s", e)

        # ── Default CSS ──────────────────────────────────────────────────
        css_content = _default_stylesheet()
        css_item = epub.EpubItem(
            uid="style_default",
            file_name="style/default.css",
            media_type="text/css",
            content=css_content.encode("utf-8"),
        )
        book.add_item(css_item)

        # ── Build chapters ───────────────────────────────────────────────
        epub_chapters = []
        toc_entries = []

        for ch_file in chapter_files:
            try:
                with open(ch_file, "r", encoding="utf-8") as f:
                    ch_data = json.load(f)

                ch_index = ch_data.get("index", 0)
                ch_title = ch_data.get("title", f"Chapter {ch_index + 1}")
                ch_content = ch_data.get("content", "")

                if not ch_content:
                    continue

                # Stable filename: chapter_0001.xhtml
                xhtml_filename = f"chapter_{ch_index:04d}.xhtml"

                chapter_item = epub.EpubHtml(
                    uid=f"chapter_{ch_index:04d}",
                    title=ch_title,
                    file_name=xhtml_filename,
                    lang=language,
                )

                # Clean and wrap chapter body
                body_html = _prepare_chapter_body(ch_title, ch_content)
                chapter_item.set_content(body_html.encode("utf-8"))
                chapter_item.add_item(css_item)

                book.add_item(chapter_item)
                epub_chapters.append(chapter_item)
                toc_entries.append(chapter_item)

            except Exception as e:
                log.warning("Skipping chapter file %s: %s", ch_file, e)
                continue

        if not epub_chapters:
            return json.dumps({"success": False, "error": "No valid chapters after processing"})

        # ── Table of Contents ────────────────────────────────────────────
        book.toc = toc_entries

        # ── Spine (reading order) ────────────────────────────────────────
        spine = ["nav"]
        if cover_item:
            spine.insert(0, cover_item)
        spine.extend(epub_chapters)
        book.spine = spine

        # ── Navigation ───────────────────────────────────────────────────
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())

        # ── Write EPUB ───────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        epub.write_epub(output_path, book)

        log.info("EPUB written: %s (%d chapters)", output_path, len(epub_chapters))
        return json.dumps({
            "success": True,
            "path": output_path,
            "chapterCount": len(epub_chapters),
        })

    except Exception as e:
        log.error("EPUB generation failed: %s", e, exc_info=True)
        return json.dumps({"success": False, "error": str(e)})


# ── Internal helpers ──────────────────────────────────────────────────────────

def _collect_chapter_files(chapters_dir: str) -> list[str]:
    """
    Find and sort ``chapter_NNNN.json`` files in the given directory.

    Returns:
        Sorted list of absolute file paths.
    """
    if not os.path.isdir(chapters_dir):
        return []

    pattern = re.compile(r"^chapter_\d{4}\.json$")
    files = [
        os.path.join(chapters_dir, f)
        for f in os.listdir(chapters_dir)
        if pattern.match(f)
    ]
    files.sort()
    return files


def _slugify(text: str) -> str:
    """Create a simple slug from text for EPUB identifiers."""
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")
    return slug[:64] or "untitled"


def _create_cover_page(book, cover_filename: str, media_type: str):
    """Create an XHTML cover page that displays the cover image."""
    from ebooklib import epub

    cover_page = epub.EpubHtml(
        uid="cover_page",
        title="Cover",
        file_name="cover.xhtml",
    )

    cover_html = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Cover</title>
  <style>
    body {{ margin: 0; padding: 0; text-align: center; }}
    img {{ max-width: 100%; max-height: 100%; }}
  </style>
</head>
<body>
  <div>
    <img src="{cover_filename}" alt="Cover" />
  </div>
</body>
</html>"""

    cover_page.set_content(cover_html.encode("utf-8"))
    book.add_item(cover_page)
    return cover_page


def _prepare_chapter_body(title: str, raw_content: str) -> str:
    """
    Wrap chapter content in a valid XHTML document.

    Strips any existing ``<html>``/``<body>`` wrappers from the raw content
    so we don't end up with nested documents.
    """
    # Extract inner content if wrapped in body/html tags
    content = raw_content

    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(content, "lxml")

        # Remove any existing html/head structure — we only want body content
        body = soup.find("body")
        if body:
            content = body.decode_contents()
        else:
            # If no body tag, use the soup's contents directly
            content = soup.decode_contents()
    except Exception:
        pass

    # Escape the title for XML
    safe_title = (
        title.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )

    return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>{safe_title}</title>
  <link rel="stylesheet" type="text/css" href="style/default.css" />
</head>
<body>
  <h1>{safe_title}</h1>
  {content}
</body>
</html>"""


def _default_stylesheet() -> str:
    """Return a clean default CSS for novel reading."""
    return """/* InkFlow Novel Stylesheet */
body {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.8;
    margin: 1em;
    padding: 0;
    color: #222;
}

h1 {
    font-size: 1.4em;
    margin-bottom: 1em;
    text-align: center;
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.5em;
}

p {
    text-indent: 1.5em;
    margin: 0.5em 0;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
}

a {
    color: inherit;
    text-decoration: none;
}
"""
