"""
InkFlow LightNovelPub Source Parser

URL Patterns:
  - Search:  https://www.lightnovelpub.com/search?keyword={query}
  - Novel:   https://www.lightnovelpub.com/novel/{slug}
  - Chapter: https://www.lightnovelpub.com/novel/{slug}/chapter-{n}
"""

import re
from urllib.parse import quote_plus, urljoin

BASE_URL = "https://www.lightnovelpub.com"

def build_search_url(query: str) -> str:
    encoded = quote_plus(query)
    return f"{BASE_URL}/search?keyword={encoded}"

def parse_search_results(html: str) -> list[dict]:
    results = []
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    rows = soup.select(".novel-list .novel-item")
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

            title_el = row.select_one(".novel-title a")
            if title_el:
                entry["title"] = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                entry["sourceUrl"] = urljoin(BASE_URL, href)
            else:
                continue

            cover_el = row.select_one("figure img")
            if cover_el:
                src = cover_el.get("data-src", "") or cover_el.get("src", "")
                if src:
                    entry["coverUrl"] = urljoin(BASE_URL, src)

            # LNP often puts author in novel-stats
            stats = row.select(".novel-stats span")
            if stats:
                for stat in stats:
                    txt = stat.get_text(strip=True)
                    if "Chapters" in txt:
                        pass
                    elif "Ongoing" in txt or "Completed" in txt:
                        entry["status"] = txt

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
        title_el = soup.select_one(".novel-title")
        if title_el:
            details["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        cover_el = soup.select_one(".fixed-img figure img")
        if cover_el:
            src = cover_el.get("data-src", "") or cover_el.get("src", "")
            if src:
                details["coverUrl"] = urljoin(BASE_URL, src)
    except Exception:
        pass

    try:
        author_el = soup.select_one(".author a")
        if author_el:
            details["author"] = author_el.get_text(strip=True)
    except Exception:
        pass

    try:
        genre_links = soup.select(".categories a")
        details["genres"] = [g.get_text(strip=True) for g in genre_links if g.get_text(strip=True)]
    except Exception:
        pass

    try:
        status_el = soup.select_one(".header-stats span strong")
        if status_el:
            txt = status_el.get_text(strip=True)
            if "Ongoing" in txt or "Completed" in txt:
                details["status"] = txt
    except Exception:
        pass

    try:
        desc_el = soup.select_one(".summary .content")
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

    rows = soup.select("ul.chapter-list li a")
    for idx, link in enumerate(rows):
        try:
            title = link.select_one(".chapter-title")
            title_text = title.get_text(strip=True) if title else link.get_text(strip=True)
            href = link.get("href", "")
            if href and title_text:
                chapters.append({
                    "index": idx,
                    "title": title_text,
                    "url": urljoin(BASE_URL, href),
                })
        except Exception:
            continue
    return chapters

def get_last_page_number(html: str) -> int:
    return 1 # Assume chapters loaded in page or JS

def parse_chapter_content(html: str) -> dict:
    result = {"title": "", "content": ""}
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        title_el = soup.select_one(".chapter-title")
        if title_el:
            result["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        content_el = soup.select_one("#chapter-container")
        if content_el:
            for junk_tag in content_el.find_all(["script", "style", "ins", "iframe", "noscript"]):
                junk_tag.decompose()
            for div in content_el.find_all("div", style=re.compile(r"display\s*:\s*none", re.IGNORECASE)):
                div.decompose()
            
            result["content"] = str(content_el)
    except Exception:
        pass

    return result
