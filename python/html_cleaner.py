"""
InkFlow HTML Cleaner

Cleans malformed web novel HTML using BeautifulSoup4 + lxml.
Handles the common issues found in scraped/converted web novel EPUBs.
"""

import re


def clean_html(raw_html):
    """
    Clean malformed HTML from web novel EPUB chapters.
    
    - Strips inline styles and classes
    - Removes script, style, link, nav, footer, iframe tags
    - Removes empty paragraphs and divs
    - Normalizes encoding
    - Removes common web scraper artifacts
    
    Args:
        raw_html: Raw HTML string from EPUB chapter
    
    Returns:
        Cleaned HTML string
    """
    if not raw_html:
        return ""

    # ── Pre-processing ───────────────────────────────────────────────────
    html = _normalize_encoding(raw_html)
    html = _fix_double_encoded_entities(html)

    try:
        from bs4 import BeautifulSoup
        return _clean_with_beautifulsoup(html)
    except ImportError:
        return _clean_with_regex(html)


def _clean_with_beautifulsoup(html):
    """Full HTML cleaning using BeautifulSoup + lxml parser."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")

    # Remove unwanted tags entirely (including content)
    for tag_name in ["script", "style", "link", "nav", "footer", "iframe", "form", "noscript"]:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # Unwrap formatting tags (keep content, remove wrapper)
    for tag_name in ["font", "center", "marquee"]:
        for tag in soup.find_all(tag_name):
            tag.unwrap()

    # Strip attributes from all tags
    KEEP_ATTRS = {"src", "alt", "href", "id"}
    for tag in soup.find_all(True):
        attrs_to_remove = [attr for attr in tag.attrs if attr not in KEEP_ATTRS]
        for attr in attrs_to_remove:
            del tag[attr]

    # Remove empty paragraphs, divs, spans
    _remove_empty_elements(soup)

    # Remove ad/scraper artifacts
    _remove_artifacts(soup)

    # Extract body content
    body = soup.find("body")
    if body:
        return str(body)
    return str(soup)


def _remove_empty_elements(soup):
    """Remove empty elements (multi-pass for nested empties)."""
    for _ in range(3):  # Multiple passes for nested empties
        changed = False
        for tag in soup.find_all(["p", "div", "span"]):
            text = tag.get_text(strip=True)
            if not text and not tag.find("img"):
                tag.decompose()
                changed = True
        if not changed:
            break


def _remove_artifacts(soup):
    """Remove common web scraper artifacts from content."""
    # Suspicious text patterns (ads, watermarks, etc.)
    artifact_patterns = [
        r"downloaded\s+from",
        r"read\s+more\s+at",
        r"visit\s+(us\s+at|our\s+website)",
        r"support\s+the\s+author",
        r"patreon\.com",
        r"ko-?fi\.com",
        r"buy\s+me\s+a\s+coffee",
        r"this\s+chapter\s+(is|was)\s+translated",
        r"translator['\u2019]?s?\s+note",
    ]

    combined_pattern = re.compile("|".join(artifact_patterns), re.IGNORECASE)

    for tag in soup.find_all(["p", "div"]):
        text = tag.get_text(strip=True)
        if text and len(text) < 200 and combined_pattern.search(text):
            tag.decompose()


def _normalize_encoding(html):
    """Normalize encoding issues in HTML content."""
    if isinstance(html, bytes):
        # Try UTF-8 first, then common fallbacks
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
            try:
                html = html.decode(encoding)
                break
            except (UnicodeDecodeError, AttributeError):
                continue
        else:
            html = html.decode("utf-8", errors="replace")

    # Remove BOM
    html = html.lstrip("\ufeff")
    # Remove null bytes
    html = html.replace("\x00", "")

    return html


def _fix_double_encoded_entities(html):
    """Fix double-encoded HTML entities like &amp;amp; → &amp;"""
    # Multi-pass for triple-encoding
    for _ in range(3):
        prev = html
        html = html.replace("&amp;amp;", "&amp;")
        html = html.replace("&amp;lt;", "&lt;")
        html = html.replace("&amp;gt;", "&gt;")
        html = html.replace("&amp;quot;", "&quot;")
        html = html.replace("&amp;#", "&#")
        if html == prev:
            break
    return html


def _clean_with_regex(html):
    """Fallback HTML cleaning using regex when BeautifulSoup is unavailable."""
    # Remove script and style tags
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    # Remove inline styles
    html = re.sub(r'\s+style="[^"]*"', "", html, flags=re.IGNORECASE)
    html = re.sub(r"\s+class=\"[^\"]*\"", "", html, flags=re.IGNORECASE)
    return html
