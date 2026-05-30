"""
InkFlow RoyalRoad Source Parser

URL Patterns:
  - Search:  https://www.royalroad.com/fictions/search?title={query}
  - Novel:   https://www.royalroad.com/fiction/{id}/{slug}
  - Chapter: https://www.royalroad.com/fiction/{id}/{slug}/chapter/{ch_id}/{ch_slug}
"""

import re
from urllib.parse import quote_plus, urljoin

BASE_URL = "https://www.royalroad.com"

# ── Search ────────────────────────────────────────────────────────────────────

def build_search_url(query: str) -> str:
    encoded = quote_plus(query)
    return f"{BASE_URL}/fictions/search?title={encoded}"

def parse_search_results(html: str) -> list[dict]:
    results = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    rows = soup.select(".fiction-list-item")
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

            title_el = row.select_one("h2.fiction-title a")
            if title_el:
                entry["title"] = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                entry["sourceUrl"] = urljoin(BASE_URL, href)

            cover_el = row.select_one("img")
            if cover_el:
                src = cover_el.get("src", "") or cover_el.get("data-src", "")
                if src:
                    entry["coverUrl"] = urljoin(BASE_URL, src)

            author_el = row.select_one(".author")
            if author_el:
                entry["author"] = author_el.get_text(strip=True).replace("by ", "", 1)
                
            stats = row.select(".margin-bottom-10.uppercase span")
            if len(stats) >= 3:
                entry["latestChapter"] = stats[1].get_text(strip=True)
                
            status_el = row.select_one(".label-primary")
            if status_el:
                entry["status"] = status_el.get_text(strip=True)

            desc_el = row.select_one(".margin-top-10.col-xs-12")
            if desc_el:
                entry["description"] = desc_el.get_text(strip=True)

            if entry["title"]:
                results.append(entry)
        except Exception:
            continue
    return results

# ── Novel Details ─────────────────────────────────────────────────────────────

def parse_novel_details(html: str, url: str) -> dict:
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
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        title_el = soup.select_one("h1")
        if title_el:
            details["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        cover_el = soup.select_one(".fic-header img")
        if cover_el:
            src = cover_el.get("src", "") or cover_el.get("data-src", "")
            if src:
                details["coverUrl"] = urljoin(BASE_URL, src)
    except Exception:
        pass

    try:
        author_el = soup.select_one(".fic-header h4 a")
        if author_el:
            details["author"] = author_el.get_text(strip=True)
    except Exception:
        pass

    try:
        genre_links = soup.select(".tags .tags")
        details["genres"] = [g.get_text(strip=True) for g in genre_links if g.get_text(strip=True)]
    except Exception:
        pass

    try:
        status_label = soup.select_one(".margin-bottom-10 .label-primary")
        if status_label:
            details["status"] = status_label.get_text(strip=True)
    except Exception:
        pass

    try:
        desc_el = soup.select_one(".description")
        if desc_el:
            details["description"] = desc_el.get_text(strip=True)
    except Exception:
        pass

    try:
        details["chapters"] = parse_chapter_list_page(html)
        details["totalChapters"] = len(details["chapters"])
    except Exception:
        pass

    return details

# ── Chapter List Pagination ───────────────────────────────────────────────────
# RoyalRoad doesn't paginate chapters! They are all on the details page.

def parse_chapter_list_page(html: str) -> list[dict]:
    chapters = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    rows = soup.select("tbody tr.chapter-row")
    for idx, row in enumerate(rows):
        try:
            link = row.select_one("td a")
            if link:
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
    return 1

# ── Chapter Content ───────────────────────────────────────────────────────────

def parse_chapter_content(html: str) -> dict:
    result = {"title": "", "content": ""}
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        title_el = soup.select_one("h1")
        if title_el:
            result["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        content_el = soup.select_one(".chapter-content")
        if content_el:
            for junk_tag in content_el.find_all(["script", "style", "ins", "iframe", "noscript"]):
                junk_tag.decompose()
            for div in content_el.find_all("div", style=re.compile(r"display\s*:\s*none", re.IGNORECASE)):
                div.decompose()

            # Remove ad boxes
            for el in content_el.select(".mt-5, .mb-5"):
                el.decompose()

            result["content"] = str(content_el)
    except Exception:
        pass

    return result
