import re
from urllib.parse import urljoin
import cloudscraper
from bs4 import BeautifulSoup
from .source_utils import clean_text

class NovelFireScraper:
    def __init__(self):
        self.base_url = "https://novelfire.net"
        self.scraper = cloudscraper.create_scraper(browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        })

    def perform_search(self, query):
        search_url = f"{self.base_url}/search"
        params = {"keyword": query}
        try:
            response = self.scraper.get(search_url, params=params, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            results = []
            # novelfire uses .novel-item
            for item in soup.select('.novel-item'):
                a_tag = item.select_one('a')
                if not a_tag:
                    continue
                    
                novel_url = a_tag['href']
                if not novel_url.startswith('http'):
                    novel_url = self.base_url + novel_url
                
                title_tag = item.select_one('.novel-title')
                title = clean_text(title_tag.text) if title_tag else "Unknown Title"
                
                img_tag = item.select_one('img')
                cover_url = img_tag['src'] if img_tag else ""
                if cover_url and not cover_url.startswith('http'):
                    cover_url = self.base_url + cover_url

                author = "Unknown" # Not exposed in search list

                results.append({
                    "title": title,
                    "url": novel_url,
                    "cover_url": cover_url,
                    "author": author,
                    "source": "NovelFire"
                })
            
            return results
            
        except Exception as e:
            print(f"Error fetching from NovelFire: {e}")
            return []

    def get_novel_details(self, novel_url):
        try:
            response = self.scraper.get(novel_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')

            title_tag = soup.find('h1', class_='novel-title')
            title = clean_text(title_tag.text) if title_tag else "Unknown Title"

            cover_img = soup.select_one('figure.cover img')
            cover_url = cover_img['src'] if cover_img else ""
            if cover_url and not cover_url.startswith('http'):
                cover_url = self.base_url + cover_url

            author = "Unknown"
            author_tag = soup.find('div', class_='author')
            if author_tag:
                author = clean_text(author_tag.text).replace('Author:', '').strip()

            description = "No description available."
            desc_div = soup.find('div', class_='content')
            if desc_div:
                description = clean_text(desc_div.text)

            # NovelFire paginates chapters at /chapters
            chapters_url = novel_url + "/chapters" if not novel_url.endswith("/chapters") else novel_url
            
            chapters = self._fetch_all_chapters(chapters_url)

            return {
                "title": title,
                "cover_url": cover_url,
                "author": author,
                "description": description,
                "chapters": chapters,
                "source": "NovelFire"
            }
        except Exception as e:
            print(f"Error fetching novel details from NovelFire: {e}")
            return None

    def _fetch_all_chapters(self, chapters_url):
        chapters = []
        try:
            response = self.scraper.get(chapters_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Extract chapters from page 1
            chapters.extend(self._extract_chapters_from_soup(soup))
            
            # Find pagination
            last_page = 1
            pagination = soup.select_one('.pagination')
            if pagination:
                for a in pagination.find_all('a'):
                    if 'page=' in a.get('href', ''):
                        try:
                            page_num = int(a['href'].split('page=')[-1])
                            if page_num > last_page:
                                last_page = page_num
                        except:
                            pass
            
            # Fetch remaining pages
            if last_page > 1:
                from concurrent.futures import ThreadPoolExecutor, as_completed
                
                def fetch_page(page):
                    url = f"{chapters_url}?page={page}"
                    res = self.scraper.get(url, timeout=15)
                    s = BeautifulSoup(res.text, 'lxml')
                    return page, self._extract_chapters_from_soup(s)
                
                page_results = {}
                with ThreadPoolExecutor(max_workers=5) as executor:
                    futures = [executor.submit(fetch_page, p) for p in range(2, last_page + 1)]
                    for future in as_completed(futures):
                        p, chaps = future.result()
                        page_results[p] = chaps
                        
                for p in range(2, last_page + 1):
                    if p in page_results:
                        chapters.extend(page_results[p])
            
        except Exception as e:
            print(f"Error fetching chapters list from NovelFire: {e}")
            
        return chapters

    def _extract_chapters_from_soup(self, soup):
        chapters = []
        # NovelFire chapter links are in ul.chapter-list
        list_container = soup.find('ul', class_='chapter-list')
        if not list_container:
            return chapters
            
        for a in list_container.find_all('a'):
            href = a.get('href')
            if not href:
                continue
            title = clean_text(a.text) or "Unknown Chapter"
            url = self.base_url + href if not href.startswith('http') else href
            chapters.append({
                "title": title,
                "url": url
            })
        return chapters

    def get_chapter_content(self, chapter_url):
        try:
            response = self.scraper.get(chapter_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            content_div = soup.find('div', id='chapter-content') or soup.find('div', class_='chapter-content')
            
            if content_div:
                for unwanted in content_div.find_all(['script', 'style', 'iframe', 'ins', 'div']):
                    unwanted.decompose()
                
                text_blocks = []
                for p in content_div.find_all('p'):
                    text = p.get_text(strip=True)
                    if text:
                        text_blocks.append(f"<p>{text}</p>")
                
                if text_blocks:
                    return "\n".join(text_blocks)
                    
                text = content_div.get_text(separator='\n\n')
                return "\n".join([f"<p>{p.strip()}</p>" for p in text.split('\n\n') if p.strip()])

            return "<p>Content not found.</p>"

        except Exception as e:
            print(f"Error fetching chapter content from NovelFire: {e}")
            return None
