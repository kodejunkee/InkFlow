import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://novelbin.me"

def get_novel_details(session, url: str) -> dict:
    details = {"chapters": []}
    
    slug = url.rstrip("/").split("/")[-1]
    ajax_url = f"{BASE_URL}/ajax/chapter-archive?novelId={slug}"
    print(ajax_url)
    try:
        ajax_res = session.get(ajax_url, timeout=30)
        ajax_res.raise_for_status()
        
        try:
            ajax_soup = BeautifulSoup(ajax_res.text, "lxml")
        except Exception:
            ajax_soup = BeautifulSoup(ajax_res.text, "html.parser")
            
        links = ajax_soup.select("template li a") or ajax_soup.select("li a")
        print("LINKS:", len(links))
        if links:
            chapters = []
            for idx, link in enumerate(links):
                title = link.get_text(strip=True)
                href = link.get("href", "")
                if href and title:
                    chapters.append({
                        "index": idx,
                        "title": title,
                        "url": urljoin(BASE_URL, href),
                    })
            
            if chapters:
                details["chapters"] = chapters
                details["totalChapters"] = len(chapters)
            print("CHAPTERS PARSED:", len(chapters))
    except Exception as e:
        print("EXCEPTION:", e)

    return details

print(get_novel_details(requests.Session(), 'https://novelbin.me/novel-book/fates-slave-shadow-slave-x-honkai-star-rail').get('totalChapters'))
