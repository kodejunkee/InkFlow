from bs4 import BeautifulSoup
import re

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

class ChrysanthemumGardenScraper:
    def __init__(self):
        self.base_url = "https://chrysanthemumgarden.com"

    def perform_search(self, session, query):
        search_url = f"{self.base_url}/"
        params = {"s": query}
        try:
            response = session.get(search_url, params=params, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            results = []
            
            # Chrysanthemum Garden uses .novel-container or .novel-item
            items = soup.select('.novel-container')
            if not items:
                items = soup.select('.novel-item')
            if not items:
                # Fallback to article elements
                items = soup.select('article')
                
            for item in items:
                title_tag = item.select_one('.novel-title a') or item.select_one('h2 a') or item.select_one('h3 a')
                if not title_tag:
                    continue
                    
                title = clean_text(title_tag.text)
                novel_url = title_tag['href']
                if not novel_url.startswith('http'):
                    novel_url = self.base_url + novel_url
                
                # Check if it's a novel link
                if '/novel-tl/' not in novel_url and '/novel/' not in novel_url:
                    continue
                
                img_tag = item.select_one('.novel-cover img') or item.select_one('img')
                cover_url = ""
                if img_tag:
                    cover_url = img_tag.get('src', '') or img_tag.get('data-src', '')
                    
                if cover_url and not cover_url.startswith('http') and not cover_url.startswith('data:'):
                    cover_url = self.base_url + cover_url

                author = "Unknown"

                results.append({
                    "title": title,
                    "sourceUrl": novel_url,
                    "coverUrl": cover_url,
                    "author": author,
                    "source": "Chrysanthemum Garden"
                })
            
            return results
            
        except Exception as e:
            print(f"Error fetching from Chrysanthemum Garden: {e}")
            return []

    def get_novel_details(self, session, novel_url):
        try:
            response = session.get(novel_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')

            title_tag = soup.find('h1', class_='novel-title')
            title = clean_text(title_tag.text) if title_tag else "Unknown Title"

            cover_img = soup.select_one('.novel-cover img')
            cover_url = ""
            if cover_img:
                cover_url = cover_img.get('src', '') or cover_img.get('data-src', '')
            if cover_url and not cover_url.startswith('http') and not cover_url.startswith('data:'):
                cover_url = self.base_url + cover_url

            author = "Unknown"
            
            description = "No description available."
            desc_div = soup.find('div', class_='novel-synopsis') or soup.find('div', class_='description')
            if desc_div:
                description = clean_text(desc_div.text)

            chapters = []
            chapter_items = soup.find_all('div', class_='chapter-item')
            for item in chapter_items:
                a_tag = item.find('a')
                if not a_tag:
                    continue
                chap_title = clean_text(a_tag.text)
                chap_url = a_tag['href']
                if not chap_url.startswith('http'):
                    chap_url = self.base_url + chap_url
                    
                chapters.append({
                    "title": chap_title,
                    "url": chap_url
                })

            return {
                "title": title,
                "coverUrl": cover_url,
                "author": author,
                "description": description,
                "chapters": chapters,
                "source": "Chrysanthemum Garden"
            }
        except Exception as e:
            print(f"Error fetching novel details from Chrysanthemum Garden: {e}")
            return None

    def get_chapter_content(self, session, chapter_url):
        try:
            response = session.get(chapter_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            content_div = soup.find('div', id='novel-content') or soup.find('div', class_='novel-content')
            
            if content_div:
                for unwanted in content_div.find_all(['script', 'style', 'iframe', 'ins']):
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
            print(f"Error fetching chapter content from Chrysanthemum Garden: {e}")
            return None
