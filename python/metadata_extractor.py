"""
InkFlow Metadata Extractor

Extracts Dublin Core metadata from EPUB files using ebooklib.
All access is defensive with fallback values.
"""


def extract_metadata(book):
    """
    Extract metadata from an ebooklib Book object.
    
    Returns:
        dict with title, author, language, description, publisher, date, subjects
    """
    meta = {
        "title": "Unknown Title",
        "author": "Unknown Author",
        "language": "en",
        "description": None,
        "publisher": None,
        "date": None,
        "subjects": [],
    }

    meta["title"] = _safe_get(book, "title", "Unknown Title")
    meta["author"] = _safe_get(book, "creator", "Unknown Author")
    meta["language"] = _safe_get(book, "language", "en")
    meta["description"] = _safe_get(book, "description", None)
    meta["publisher"] = _safe_get(book, "publisher", None)
    meta["date"] = _safe_get(book, "date", None)
    meta["subjects"] = _safe_get_all(book, "subject")

    # Fallback: try contributor if no creator
    if meta["author"] == "Unknown Author":
        contributor = _safe_get(book, "contributor", None)
        if contributor:
            meta["author"] = contributor

    return meta


def _safe_get(book, field, default=None):
    """Safely extract a single Dublin Core metadata field."""
    try:
        values = book.get_metadata("DC", field)
        if values and len(values) > 0:
            val = values[0][0]
            if val and str(val).strip():
                return str(val).strip()
    except Exception:
        pass
    return default


def _safe_get_all(book, field):
    """Safely extract all values for a Dublin Core metadata field."""
    try:
        values = book.get_metadata("DC", field)
        return [str(v[0]).strip() for v in values if v and v[0] and str(v[0]).strip()]
    except Exception:
        return []
