"""
InkFlow AllNovel.org Source Parser

Parses search results, novel details, chapter lists, and chapter content
from AllNovel.org. Uses BeautifulSoup with the lxml parser.

URL Patterns:
  - Search:  https://allnovel.org/search?keyword={query}
  - Novel:   https://allnovel.org/{slug}.html
  - Chapter: https://allnovel.org/{slug}/{chapter-slug}.html
  - Pages:   https://allnovel.org/{slug}.html?page={n}
  - Author:  https://allnovel.org/author/{name}
"""

import re
from urllib.parse import quote_plus, urljoin

BASE_URL = "https://allnovel.org"


# ── Search ────────────────────────────────────────────────────────────────────

def build_search_url(query: str) -> str:
    """Build a search URL for AllNovel.org."""
    encoded = quote_plus(query)
    return f"{BASE_URL}/search?keyword={encoded}"


def parse_search_results(html: str) -> list[dict]:
    """
    Parse search results page HTML.

    Returns:
        List of dicts, each containing:
            title, author, coverUrl, sourceUrl, status,
            latestChapter, description
    """
    results = []

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return results

    # Primary selector: div.list-novel rows
    rows = soup.select("div.list-novel .row") or soup.select(".list.list-novel .row")

    for row in rows:
        try:
            entry = {
                "title": "",
                "author": "",
                "coverUrl": "",
                "sourceUrl": "",
                "status": "",
                "latestChapter": "",
                "description": "",
            }

            # ── Title & URL ──────────────────────────────────────────────
            title_el = (
                row.select_one("h3.novel-title a")
                or row.select_one(".novel-title a")
                or row.select_one("h3 a")
            )
            if title_el:
                entry["title"] = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                entry["sourceUrl"] = urljoin(BASE_URL, href)

            # ── Cover image ──────────────────────────────────────────────
            cover_el = row.select_one(".cover img") or row.select_one("img")
            if cover_el:
                entry["coverUrl"] = cover_el.get("src", "") or cover_el.get("data-src", "")
                if entry["coverUrl"] and not entry["coverUrl"].startswith("http"):
                    entry["coverUrl"] = urljoin(BASE_URL, entry["coverUrl"])

            # ── Author ───────────────────────────────────────────────────
            author_el = row.select_one("span.author") or row.select_one(".author")
            if author_el:
                entry["author"] = author_el.get_text(strip=True)

            # ── Latest chapter ───────────────────────────────────────────
            chapter_el = row.select_one(".text-info a") or row.select_one(".latest-chapter a")
            if chapter_el:
                entry["latestChapter"] = chapter_el.get_text(strip=True)

            # ── Status ───────────────────────────────────────────────────
            # Sometimes indicated by a badge or label element
            status_el = row.select_one(".label-status") or row.select_one(".status")
            if status_el:
                entry["status"] = status_el.get_text(strip=True)

            # ── Description (if present in search) ───────────────────────
            desc_el = row.select_one(".novel-desc") or row.select_one(".desc")
            if desc_el:
                entry["description"] = desc_el.get_text(strip=True)

            # Only add if we got at least a title
            if entry["title"]:
                results.append(entry)

        except Exception:
            continue

    return results


# ── Novel Details ─────────────────────────────────────────────────────────────

def parse_novel_details(html: str, url: str) -> dict:
    """
    Parse a novel detail page.

    Args:
        html: Raw HTML of the novel detail page.
        url:  The URL of the page (used as sourceUrl).

    Returns:
        Dict with: title, author, coverUrl, description, status,
                   genres, sourceUrl, totalChapters, chapters
    """
    details = {
        "title": "",
        "author": "",
        "coverUrl": "",
        "description": "",
        "status": "",
        "genres": [],
        "sourceUrl": url,
        "totalChapters": 0,
        "chapters": [],
    }

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return details

    # ── Title ─────────────────────────────────────────────────────────────
    try:
        title_el = (
            soup.select_one("h3.title")
            or soup.select_one("div.book h3")
            or soup.select_one("h3")
        )
        if title_el:
            details["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    # ── Cover ─────────────────────────────────────────────────────────────
    try:
        cover_el = (
            soup.select_one("div.book img")
            or soup.select_one(".info-holder .book img")
            or soup.select_one(".books .book img")
        )
        if cover_el:
            src = cover_el.get("src", "") or cover_el.get("data-src", "")
            if src:
                details["coverUrl"] = urljoin(BASE_URL, src)
    except Exception:
        pass

    # ── Info block (Author, Status, Genre) ────────────────────────────────
    try:
        info_divs = soup.select(".info-holder .info div") or soup.select(".info div")

        for div in info_divs:
            heading = div.find(["h3", "strong", "b", "label"])
            if not heading:
                continue
            label = heading.get_text(strip=True).lower().rstrip(":")

            if "author" in label:
                author_link = div.find("a")
                if author_link:
                    details["author"] = author_link.get_text(strip=True)
                else:
                    # Fallback: text after the heading
                    text = div.get_text(strip=True)
                    text = text.replace(heading.get_text(strip=True), "").strip()
                    if text:
                        details["author"] = text

            elif "genre" in label:
                genre_links = div.find_all("a")
                details["genres"] = [g.get_text(strip=True) for g in genre_links if g.get_text(strip=True)]

            elif "status" in label:
                status_link = div.find("a")
                if status_link:
                    details["status"] = status_link.get_text(strip=True)
                else:
                    text = div.get_text(strip=True)
                    text = text.replace(heading.get_text(strip=True), "").strip()
                    if text:
                        details["status"] = text
    except Exception:
        pass

    # ── Description ───────────────────────────────────────────────────────
    try:
        desc_el = soup.select_one("div.desc-text") or soup.select_one(".desc-text")
        if desc_el:
            details["description"] = desc_el.get_text(strip=True)
        else:
            # Fallback: look for a <div> with itemprop="description"
            desc_el = soup.find(attrs={"itemprop": "description"})
            if desc_el:
                details["description"] = desc_el.get_text(strip=True)
    except Exception:
        pass

    # ── Chapters from first page ──────────────────────────────────────────
    try:
        details["chapters"] = parse_chapter_list_page(html)
        details["totalChapters"] = len(details["chapters"])
    except Exception:
        pass

    return details


# ── Chapter List Pagination ───────────────────────────────────────────────────

def parse_chapter_list_page(html: str) -> list[dict]:
    """
    Parse a single page of the chapter list.

    Returns:
        List of dicts: [{index, title, url}, ...]
        Index is zero-based within this page; the caller re-indexes globally.
    """
    chapters = []

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return chapters

    # Primary selector: ul.list-chapter li a
    links = (
        soup.select("ul.list-chapter li a")
        or soup.select(".list-chapter li a")
        or soup.select("#list-chapter li a")
    )

    for idx, link in enumerate(links):
        try:
            title = link.get_text(strip=True)
            href = link.get("href", "")
            if href and title:
                chapters.append({
                    "index": idx,
                    "title": title,
                    "url": urljoin(BASE_URL, href),
                })
        except Exception:
            continue

    return chapters


def get_last_page_number(html: str) -> int:
    """
    Extract the total number of chapter-list pages from pagination links.

    Returns:
        The last page number (1 if no pagination found).
    """
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return 1

    try:
        pagination_links = soup.select(".pagination li a") or soup.select("ul.pagination a")

        max_page = 1
        for link in pagination_links:
            href = link.get("href", "")

            # Look for ?page=N pattern
            match = re.search(r"[?&]page=(\d+)", href)
            if match:
                page_num = int(match.group(1))
                max_page = max(max_page, page_num)

            # Also check the link text for "Last" / "»" with page number
            text = link.get_text(strip=True)
            if text.isdigit():
                max_page = max(max_page, int(text))

        return max_page
    except Exception:
        return 1


# ── Chapter Content ───────────────────────────────────────────────────────────

def parse_chapter_content(html: str) -> dict:
    """
    Parse chapter page HTML and extract reading content.

    Returns:
        Dict with: title, content (cleaned HTML string)
    """
    result = {"title": "", "content": ""}

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        return result

    # ── Chapter title ─────────────────────────────────────────────────────
    try:
        title_el = (
            soup.select_one(".chr-title")
            or soup.select_one("a.chr-title")
            or soup.select_one("h2")
            or soup.select_one("h1")
        )
        if title_el:
            result["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    # ── Chapter body ──────────────────────────────────────────────────────
    try:
        content_el = (
            soup.select_one("#chr-content")
            or soup.select_one(".chr-c")
            or soup.select_one(".chr-text")
            or soup.select_one("#chapter-content")
            or soup.select_one(".chapter-content")
        )

        if content_el:
            # Remove ads, scripts, and junk from the content container
            for junk_tag in content_el.find_all(["script", "style", "ins", "iframe", "noscript"]):
                junk_tag.decompose()

            # Remove hidden divs (often ad containers)
            for div in content_el.find_all("div", style=re.compile(r"display\s*:\s*none", re.IGNORECASE)):
                div.decompose()

            # Remove common ad-class elements
            for ad_class in ["ads", "adsbygoogle", "ad-container", "ad-banner"]:
                for el in content_el.find_all(class_=re.compile(ad_class, re.IGNORECASE)):
                    el.decompose()

            # Strip attributes except essential ones
            _strip_attrs(content_el)

            result["content"] = str(content_el)
    except Exception:
        pass

    return result


def _strip_attrs(element):
    """Recursively strip non-essential attributes from elements."""
    KEEP_ATTRS = {"src", "alt", "href", "id"}
    try:
        if hasattr(element, "attrs"):
            attrs_to_remove = [a for a in element.attrs if a not in KEEP_ATTRS]
            for attr in attrs_to_remove:
                del element[attr]
        for child in element.find_all(True):
            attrs_to_remove = [a for a in child.attrs if a not in KEEP_ATTRS]
            for attr in attrs_to_remove:
                del child[attr]
    except Exception:
        pass
