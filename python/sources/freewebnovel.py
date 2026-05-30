"""
InkFlow FreeWebNovel Source Parser

URL Patterns:
  - Search (GET):  https://freewebnovel.com/search?searchkey={query}
  - Novel:         https://freewebnovel.com/novel/{slug}
  - Chapter:       https://freewebnovel.com/novel/{slug}/chapter-{num}
"""

import re
from urllib.parse import urljoin

BASE_URL = "https://freewebnovel.com"

def perform_search(session, query: str) -> list[dict]:
    search_url = f"{BASE_URL}/search"
    # FNW uses GET with searchkey
    params = {"searchkey": query}
    try:
        response = session.get(search_url, params=params, timeout=30)
        response.raise_for_status()
        return parse_search_results(response.text)
    except Exception as e:
        import logging
        logging.getLogger("novel_scraper").error("FNW search GET failed: %s", e)
        return []

def parse_search_results(html: str) -> list[dict]:
    results = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    rows = soup.select(".li-row .li")
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

            title_el = row.select_one("h3.tit a")
            if title_el:
                entry["title"] = title_el.get_text(strip=True)
                entry["sourceUrl"] = urljoin(BASE_URL, title_el.get("href", ""))
            else:
                continue

            cover_el = row.select_one(".pic img")
            if cover_el:
                entry["coverUrl"] = urljoin(BASE_URL, cover_el.get("src", ""))

            chapter_el = row.select_one("a.chapter span.s1")
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
        title_el = soup.select_one(".m-desc h1.tit")
        if title_el:
            details["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        # Cover might be in a different element, but we can try to find the main image
        cover_el = soup.select_one(".pic img")
        if cover_el:
            details["coverUrl"] = urljoin(BASE_URL, cover_el.get("src", ""))
    except Exception:
        pass

    try:
        author_el = soup.select_one(".m-desc .txt .item a[href*='/author/']") or soup.select_one("a[href*='/author/']")
        if author_el:
            details["author"] = author_el.get_text(strip=True)
    except Exception:
        pass

    try:
        desc_el = soup.select_one(".m-desc .txt .inner")
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

def parse_chapter_list_page(html: str) -> list[dict]:
    chapters = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    links = soup.select("#idData li a") or soup.select(".m-newest2 ul.ul-list5 li a")
    
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

def parse_chapter_content(html: str) -> dict:
    result = {"title": "", "content": ""}
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        title_el = soup.select_one("h1.tit") or soup.select_one(".chapter-title")
        if title_el:
            result["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        content_el = soup.select_one("div.txt") or soup.select_one("#article")
        if content_el:
            for junk in content_el.find_all(["script", "style", "iframe", "div", "a"]):
                if junk.name == "div" and "class" in junk.attrs and "notice" in junk.attrs["class"]:
                    junk.decompose()
                elif junk.name in ["script", "style", "iframe"]:
                    junk.decompose()
            result["content"] = str(content_el)
    except Exception:
        pass

    return result

def get_last_page_number(html: str) -> int:
    # All chapters are typically loaded on the main novel page or a single chapter list page.
    return 1
