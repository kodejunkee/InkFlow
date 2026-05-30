import requests
import json

BASE_URL = "https://novelbin.me"
session = requests.Session()
url = "https://novelbin.me/novel-book/fates-slave-shadow-slave-x-honkai-star-rail"

slug = url.rstrip("/").split("/")[-1]
ajax_url = f"{BASE_URL}/ajax/chapter-archive?novelId={slug}"
ajax_res = session.get(ajax_url, timeout=30)
print("AJAX status code:", ajax_res.status_code)
print("AJAX content start:", ajax_res.text[:100])

from bs4 import BeautifulSoup
ajax_soup = BeautifulSoup(ajax_res.text, "lxml")
links = ajax_soup.select("template li a") or ajax_soup.select("li a")
print("Links found:", len(links))
