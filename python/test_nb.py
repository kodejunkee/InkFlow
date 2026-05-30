import sys
import json
import requests
from sources.novelbin import build_search_url, parse_search_results, parse_novel_details

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})

url = build_search_url("Shadow Slave")
print("Search URL:", url)
res = session.get(url)
results = parse_search_results(res.text)

if results:
    novel = results[0]
    print("Found:", novel['title'], novel['sourceUrl'])
    n_res = session.get(novel['sourceUrl'])
    details = parse_novel_details(n_res.text, novel['sourceUrl'])
    print("Chapters found:", details.get('totalChapters'))
    with open('nb_novel.html', 'w', encoding='utf-8') as f:
        f.write(n_res.text)
else:
    print("No results found.")
