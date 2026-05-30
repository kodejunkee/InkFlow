import json
from bs4 import BeautifulSoup
import re

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()


class WuxiaClickScraper:
    def __init__(self):
        self.base_url = "https://wuxia.click"
        self.api_url = "https://wuxia.click/api"

    def perform_search(self, session, query):
        search_url = f"{self.api_url}/search/?search={query}"
        try:
            response = session.get(search_url, headers={'Accept': 'application/json'}, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get('results', []):
                slug = item.get('slug')
                title = clean_text(item.get('name', 'Unknown'))
                novel_url = f"{self.base_url}/novel/{slug}"
                
                # Image can be relative or full
                img = item.get('image') or ""
                cover_url = img if img.startswith('http') else f"{self.base_url}{img}" if img else ""
                
                # WuxiaClick author data is usually a nested dict
                author_data = item.get('author')
                author = "Unknown"
                if isinstance(author_data, dict):
                    author = clean_text(author_data.get('name', 'Unknown'))
                elif isinstance(author_data, str):
                    author = clean_text(author_data)

                results.append({
                    "title": title,
                    "url": novel_url,
                    "cover_url": cover_url,
                    "author": author,
                    "source": "WuxiaClick"
                })
            
            return results
            
        except Exception as e:
            print(f"Error fetching from WuxiaClick: {e}")
            return []

    def get_novel_details(self, session, novel_url):
        try:
            slug = novel_url.rstrip('/').split('/')[-1]
            api_novel_url = f"{self.api_url}/novels/{slug}/"
            
            response = session.get(api_novel_url, headers={'Accept': 'application/json'}, timeout=15)
            response.raise_for_status()
            data = response.json()

            title = clean_text(data.get('name', 'Unknown'))
            
            img = data.get('image') or ""
            cover_url = img if img.startswith('http') else f"{self.base_url}{img}" if img else ""
            
            author_data = data.get('author')
            author = "Unknown"
            if isinstance(author_data, dict):
                author = clean_text(author_data.get('name', 'Unknown'))
            elif isinstance(author_data, str):
                author = clean_text(author_data)

            description = clean_text(data.get('description', 'No description available.'))
            num_of_chaps = data.get('numOfChaps', 0)
            
            chapters = []
            # WuxiaClick's chapters are sequentially numbered starting from 1 (or sometimes 0)
            # They don't expose a clean full chapter list via API so we generate the expected URLs.
            for i in range(1, num_of_chaps + 1):
                chapters.append({
                    "title": f"Chapter {i}",
                    "url": f"{self.base_url}/chapter/{slug}-{i}"
                })

            return {
                "title": title,
                "cover_url": cover_url,
                "author": author,
                "description": description,
                "chapters": chapters,
                "source": "WuxiaClick"
            }
        except Exception as e:
            print(f"Error fetching novel details from WuxiaClick: {e}")
            return None

    def get_chapter_content(self, session, chapter_url):
        try:
            response = session.get(chapter_url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            # WuxiaClick uses NextJS. The content is embedded in the __NEXT_DATA__ JSON.
            next_data_script = soup.find('script', id='__NEXT_DATA__')
            if not next_data_script:
                print("WuxiaClick: __NEXT_DATA__ not found")
                return None
                
            json_data = json.loads(next_data_script.string)
            queries = json_data.get('props', {}).get('pageProps', {}).get('dehydratedState', {}).get('queries', [])
            
            content_html = None
            for query in queries:
                data = query.get('state', {}).get('data', {})
                if 'text' in data:
                    content_html = data['text']
                    break
                    
            if content_html:
                content_soup = BeautifulSoup(content_html, 'lxml')
                for unwanted in content_soup.find_all(['script', 'style', 'iframe', 'ins']):
                    unwanted.decompose()
                
                text_blocks = []
                paragraphs = content_soup.find_all('p')
                if paragraphs:
                    for p in paragraphs:
                        text = p.get_text(strip=True)
                        if text:
                            text_blocks.append(f"<p>{text}</p>")
                    return "\n".join(text_blocks)
                else:
                    text = content_soup.get_text(separator='\n\n')
                    return "\n".join([f"<p>{p.strip()}</p>" for p in text.split('\n\n') if p.strip()])
                    
            return "<p>Content not found.</p>"

        except Exception as e:
            print(f"Error fetching chapter content from WuxiaClick: {e}")
            return None
