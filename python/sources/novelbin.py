"""
InkFlow NovelBin Source Parser

URL Patterns:
  - Search:  https://novelbin.me/search?keyword={query}
  - Novel:   https://novelbin.me/novel-book/{slug}
  - Chapter: https://novelbin.me/novel-book/{slug}/chapter-{n}
"""

import re
from urllib.parse import quote_plus, urljoin

BASE_URL = "https://novelbin.me"

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

    rows = soup.select(".col-truyen-main div.row") or soup.select("div.row")
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

            title_el = row.select_one("h3.novel-title a")
            if title_el:
                entry["title"] = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                entry["sourceUrl"] = urljoin(BASE_URL, href)
            else:
                continue

            cover_el = row.select_one("img.cover") or row.select_one(".cover img") or row.select_one("img")
            if cover_el:
                src = cover_el.get("src", "") or cover_el.get("data-src", "")
                if src:
                    entry["coverUrl"] = urljoin(BASE_URL, src)

            author_el = row.select_one("span.author")
            if author_el:
                entry["author"] = author_el.get_text(strip=True)

            chapter_el = row.select_one(".text-info a") or row.select_one(".latest-chapter a")
            if chapter_el:
                entry["latestChapter"] = chapter_el.get_text(strip=True)

            status_el = row.select_one(".label-status")
            if status_el:
                entry["status"] = status_el.get_text(strip=True)

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
        title_el = soup.select_one("h3.title")
        if title_el:
            details["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        cover_el = soup.select_one("div.book img")
        if cover_el:
            src = cover_el.get("src", "") or cover_el.get("data-src", "")
            if src:
                details["coverUrl"] = urljoin(BASE_URL, src)
    except Exception:
        pass

    try:
        info_el = soup.select_one("div.info")
        if info_el:
            info_divs = info_el.find_all("div", recursive=False)
            for div in info_divs:
                heading = div.find(["h3", "strong", "b", "label"])
                if not heading:
                    continue
                label = heading.get_text(strip=True).lower().rstrip(":")

                if "author" in label:
                    a_link = div.find("a")
                    if a_link:
                        details["author"] = a_link.get_text(strip=True)
                elif "genre" in label:
                    genre_links = div.find_all("a")
                    details["genres"] = [g.get_text(strip=True) for g in genre_links if g.get_text(strip=True)]
                elif "status" in label:
                    status_link = div.find("a")
                    if status_link:
                        details["status"] = status_link.get_text(strip=True)
    except Exception:
        pass

    try:
        desc_el = soup.select_one("div.desc-text")
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

    links = (
        soup.select("#list-chapter ul.list-chapter li a")
        or soup.select("ul.list-chapter li a")
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
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        pagination_links = soup.select("ul.pagination a")
        max_page = 1
        for link in pagination_links:
            href = link.get("href", "")
            match = re.search(r"[?&]page=(\d+)", href)
            if match:
                max_page = max(max_page, int(match.group(1)))
            text = link.get_text(strip=True)
            if text.isdigit():
                max_page = max(max_page, int(text))
        return max_page
    except Exception:
        return 1

def parse_chapter_content(html: str) -> dict:
    result = {"title": "", "content": ""}
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

    try:
        title_el = soup.select_one("a.chapter-title") or soup.select_one(".chapter-title") or soup.select_one("h2")
        if title_el:
            result["title"] = title_el.get_text(strip=True)
    except Exception:
        pass

    try:
        content_el = soup.select_one("#chapter-content") or soup.select_one("#chr-content")
        if content_el:
            for junk_tag in content_el.find_all(["script", "style", "ins", "iframe", "noscript"]):
                junk_tag.decompose()
            for div in content_el.find_all("div", style=re.compile(r"display\s*:\s*none", re.IGNORECASE)):
                div.decompose()
            
            # keep only necessary attributes
            result["content"] = str(content_el)
    except Exception:
        pass

    return result
