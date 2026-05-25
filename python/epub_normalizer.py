"""
InkFlow EPUB Normalizer

Reads an EPUB, cleans all chapter HTML, and writes a cleaned copy.
The cleaned EPUB is what epub.js will render.
"""

import os


def normalize_epub(file_path, output_dir, book=None):
    """
    Normalize an EPUB by cleaning all chapter HTML.
    
    Args:
        file_path: Path to the original EPUB
        output_dir: Directory to write the cleaned EPUB
        book: Optional pre-loaded ebooklib Book object
    
    Returns:
        Path to the cleaned EPUB file, or original file_path on failure
    """
    try:
        import ebooklib
        from ebooklib import epub
        from html_cleaner import clean_html
    except ImportError:
        return file_path

    try:
        if book is None:
            try:
                book = epub.read_epub(file_path, options={"ignore_ncx": False})
            except Exception:
                book = epub.read_epub(file_path, options={"ignore_ncx": True})

        # Clean each HTML document
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            try:
                raw = item.get_content()
                html = _decode_content(raw)
                cleaned = clean_html(html)
                
                # Ensure valid XHTML structure
                if not cleaned.strip().startswith("<?xml") and not cleaned.strip().startswith("<!DOCTYPE"):
                    cleaned = _wrap_in_xhtml(cleaned)
                
                item.set_content(cleaned.encode("utf-8"))
            except Exception:
                # Skip chapters that can't be cleaned — keep original
                continue

        # Write cleaned EPUB
        basename = os.path.basename(file_path)
        name, ext = os.path.splitext(basename)
        output_path = os.path.join(output_dir, f"{name}_cleaned{ext}")
        
        epub.write_epub(output_path, book)
        return output_path

    except Exception:
        return file_path


def _decode_content(raw):
    """Decode bytes to string with multiple encoding fallbacks."""
    if isinstance(raw, str):
        return raw
    
    for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, AttributeError):
            continue
    
    return raw.decode("utf-8", errors="replace")


def _wrap_in_xhtml(content):
    """Wrap bare HTML content in a valid XHTML structure."""
    # If it already has <html> tag, don't wrap
    if "<html" in content.lower()[:200]:
        return content
    
    # Extract body content if <body> tag exists
    body_content = content
    if "<body" in content.lower():
        import re
        match = re.search(r"<body[^>]*>(.*)</body>", content, re.DOTALL | re.IGNORECASE)
        if match:
            body_content = match.group(1)

    return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title></title></head>
<body>
{body_content}
</body>
</html>"""
