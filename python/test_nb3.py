import requests
from bs4 import BeautifulSoup

url = 'https://novelbin.me/ajax/chapter-archive?novelId=fates-slave-shadow-slave-x-honkai-star-rail'
res = requests.get(url)
soup = BeautifulSoup(res.text, 'lxml')

links = soup.select("template li a") or soup.select("li a")
print(f"Found {len(links)} chapters.")
if links:
    print("First:", links[0].get('href'))
    print("Last:", links[-1].get('href'))
