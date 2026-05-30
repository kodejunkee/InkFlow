"""
InkFlow BoxNovel Source Parser
Uses standard Madara WordPress theme selectors.

URL Patterns:
  - Search:  https://boxnovel.com/?s={query}&post_type=wp-manga
  - Novel:   https://boxnovel.com/novel/{slug}/
  - Chapter: https://boxnovel.com/novel/{slug}/chapter-{n}/
"""

import re
from urllib.parse import quote_plus, urljoin

BASE_URL = "https://boxnovel.com"

def build_search_url(query: str) -> str:
    encoded = quote_plus(query)
    return f"{BASE_URL}/?s={encoded}&post_type=wp-manga"

def parse_search_results(html: str) -> list[dict]:
    results = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    rows = soup.select(".c-tabs-item__content")
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

            title_el = row.select_one(".post-title h3 a") or row.select_one(".post-title h4 a")
            if title_el:
                entry["title"] = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                entry["sourceUrl"] = urljoin(BASE_URL, href)
            else:
                continue

            cover_el = row.select_one("img")
            if cover_el:
                src = cover_el.get("data-src", "") or cover_el.get("src", "")
                if src:
                    entry["coverUrl"] = urljoin(BASE_URL, src)

            author_el = row.select_one(".mg_author a")
            if author_el:
                entry["author"] = author_el.get_text(strip=True)

            chapter_el = row.select_one(".chapter-item .chapter a") or row.select_one(".font-meta.chapter a")
            if chapter_el:
                entry["latestChapter"] = chapter_el.get_text(strip=True)

            results.append(entry)
        except Exception:
            continue
    return results

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
        title_el = soup.select_one(".post-title h1") or soup.select_one(".post-title h3")
        if title_el:
            details["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        cover_el = soup.select_one(".summary_image img")
        if cover_el:
            src = cover_el.get("data-src", "") or cover_el.get("src", "")
            if src:
                details["coverUrl"] = urljoin(BASE_URL, src)
    except Exception:
        pass

    try:
        author_el = soup.select_one(".author-content a")
        if author_el:
            details["author"] = author_el.get_text(strip=True)
    except Exception:
        pass

    try:
        genre_links = soup.select(".genres-content a")
        details["genres"] = [g.get_text(strip=True) for g in genre_links if g.get_text(strip=True)]
    except Exception:
        pass

    try:
        status_el = soup.select_one(".post-status .summary-content")
        if status_el:
            details["status"] = status_el.get_text(strip=True)
    except Exception:
        pass

    try:
        desc_el = soup.select_one(".description-summary .summary__content") or soup.select_one(".summary__content")
        if desc_el:
            details["description"] = desc_el.get_text(strip=True)
    except Exception:
        pass

    # BoxNovel sometimes loads chapters via Ajax, sometimes they are directly in the HTML.
    # The React Native app's cookie bypass fetches the HTML, but if it's ajax, we need to handle it.
    # For now we'll assume they are in the HTML directly (lazy loading disabled or cached).
    try:
        details["chapters"] = parse_chapter_list_page(html)
        # Madara chapters are usually listed newest to oldest. Reverse them.
        if details["chapters"]:
            details["chapters"].reverse()
            for i, ch in enumerate(details["chapters"]):
                ch["index"] = i
        details["totalChapters"] = len(details["chapters"])
    except Exception:
        pass

    return details

def parse_chapter_list_page(html: str) -> list[dict]:
    chapters = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    rows = soup.select("li.wp-manga-chapter")
    for idx, row in enumerate(rows):
        try:
            link = row.select_one("a")
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
    return 1 # Madara typically shows all chapters in one list or ajax

def parse_chapter_content(html: str) -> dict:
    result = {"title": "", "content": ""}
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        title_el = soup.select_one("li.active") or soup.select_one(".c-breadcrumb li.active") or soup.select_one("h1")
        if title_el:
            result["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        content_el = soup.select_one(".reading-content") or soup.select_one(".text-left")
        if content_el:
            for junk_tag in content_el.find_all(["script", "style", "ins", "iframe", "noscript"]):
                junk_tag.decompose()
            for div in content_el.find_all("div", style=re.compile(r"display\s*:\s*none", re.IGNORECASE)):
                div.decompose()
            
            result["content"] = str(content_el)
    except Exception:
        pass

    return result
