from bs4 import BeautifulSoup

html = open("nb_novel.html", encoding="utf-8").read()
soup = BeautifulSoup(html, "lxml")

links = (
    soup.select("#list-chapter ul.list-chapter li a")
    or soup.select("ul.list-chapter li a")
    or soup.select("#list-chapter li a")
    or soup.select("[data-first-chapter-item] a")
    or soup.select("template[data-first-chapter-template] a")
)

if not links:
    # Try html.parser
    soup2 = BeautifulSoup(html, "html.parser")
    links = soup2.select("[data-first-chapter-item] a") or soup2.select("template a")

print(f"Found {len(links)} chapters.")
if links:
    print("First:", links[0].get('href'))
    print("Last:", links[-1].get('href'))
