import requests
from bs4 import BeautifulSoup

ajax_url = "https://novelbin.me/ajax/chapter-archive?novelId=fates-slave-shadow-slave-x-honkai-star-rail"
ajax_res = requests.get(ajax_url, timeout=30)
ajax_soup = BeautifulSoup(ajax_res.text, "lxml")
links = ajax_soup.select("template li a") or ajax_soup.select("li a")

if links:
    link = links[0]
    print("HTML:", link)
    print("TEXT:", repr(link.get_text(strip=True)))
    print("HREF:", repr(link.get("href")))
    print("TITLE ATTR:", repr(link.get("title")))
