import sys
import cloudscraper
from bs4 import BeautifulSoup

def fetch(url):
    scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'android', 'desktop': False})
    resp = scraper.get(url)
    print(f"Status: {resp.status_code}")
    print(f"URL: {resp.url}")
    
    soup = BeautifulSoup(resp.text, 'lxml')
    
    # Try finding an 'a' tag with 'martial'
    for a in soup.find_all('a'):
        if a.get_text() and 'martial' in a.get_text().lower():
            print("Found matching 'a' tag:")
            # Print the parent of the parent (usually a list item or row)
            parent = a.parent.parent
            if parent:
                print(parent.prettify()[:1000])
            break
            
if __name__ == "__main__":
    fetch(sys.argv[1])
