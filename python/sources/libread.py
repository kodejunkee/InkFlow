import json
from bs4 import BeautifulSoup
import re

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

class LibReadScraper:
    def __init__(self):
        self.base_url = "https://libread.com"

    def perform_search(self, session, query):
        search_url = f"{self.base_url}/search"
        data = {"searchkey": query}
        try:
            response = session.post(search_url, data=data, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            results = []
            for row in soup.select('.li-row'):
                a_tag = row.select_one('h3.tit a')
                if not a_tag:
                    continue
                    
                title = clean_text(a_tag.text)
                novel_url = a_tag['href']
                if not novel_url.startswith('http'):
                    novel_url = self.base_url + novel_url
                
                img_tag = row.select_one('.pic img')
                cover_url = img_tag['src'] if img_tag else ""
                if cover_url and not cover_url.startswith('http'):
                    cover_url = self.base_url + cover_url

                # Author might be missing in search results, so we set to Unknown
                author = "Unknown"

                results.append({
                    "title": title,
                    "url": novel_url,
                    "cover_url": cover_url,
                    "author": author,
                    "source": "LibRead"
                })
            
            return results
            
        except Exception as e:
            print(f"Error fetching from LibRead: {e}")
            return []

    def get_novel_details(self, session, novel_url):
        try:
            response = session.get(novel_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')

            title_tag = soup.find('h1')
            title = clean_text(title_tag.text) if title_tag else "Unknown Title"

            cover_img = soup.select_one('.pic img')
            cover_url = cover_img['src'] if cover_img else ""
            if cover_url and not cover_url.startswith('http'):
                cover_url = self.base_url + cover_url

            author = "Unknown"
            author_tag = soup.select_one('.glyphicon-user + .right a')
            if author_tag:
                author = clean_text(author_tag.text)

            # Look for summary in .desc-text or similar block
            description = "No description available."
            # In libread, description is usually in <div class="m-desc"> <div class="txt"> ...
            desc_div = soup.select_one('.m-desc .txt')
            if desc_div:
                description = clean_text(desc_div.text)

            chapters = []
            for a in soup.select('#idData li a'):
                chapter_title = clean_text(a.text)
                chapter_url = a['href']
                if not chapter_url.startswith('http'):
                    chapter_url = self.base_url + chapter_url
                    
                chapters.append({
                    "title": chapter_title,
                    "url": chapter_url
                })

            return {
                "title": title,
                "cover_url": cover_url,
                "author": author,
                "description": description,
                "chapters": chapters,
                "source": "LibRead"
            }
        except Exception as e:
            print(f"Error fetching novel details from LibRead: {e}")
            return None

    def get_chapter_content(self, session, chapter_url):
        try:
            response = session.get(chapter_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Content is typically within a div with id 'chaptercontent'
            content_div = soup.find('div', id='chaptercontent')
            if not content_div:
                content_div = soup.find('div', class_='txt')

            if content_div:
                # Remove unwanted ads or navigation elements
                for unwanted in content_div.find_all(['script', 'style', 'iframe', 'ins']):
                    unwanted.decompose()
                    
                for a in content_div.find_all('a'):
                    a.decompose()
                    
                text_blocks = []
                for child in content_div.children:
                    if child.name == 'p':
                        text = child.get_text(strip=True)
                        if text:
                            text_blocks.append(f"<p>{text}</p>")
                    elif isinstance(child, str) and child.strip():
                        text_blocks.append(f"<p>{child.strip()}</p>")
                        
                if text_blocks:
                    return "\n".join(text_blocks)
                
                # Fallback
                text = content_div.get_text(separator='\n\n')
                paragraphs = [f"<p>{p.strip()}</p>" for p in text.split('\n\n') if p.strip()]
                return "\n".join(paragraphs)

            return "<p>Content not found.</p>"

        except Exception as e:
            print(f"Error fetching chapter content from LibRead: {e}")
            return None
