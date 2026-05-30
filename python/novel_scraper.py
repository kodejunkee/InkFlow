"""
InkFlow Novel Scraper — Main Orchestrator

Called from Kotlin via Chaquopy. All public functions accept raw parameters
and return JSON strings for the bridge layer.

Uses requests for HTTP and delegates HTML parsing to source modules
under the ``sources`` package.
"""

import json
import logging
import os
import time

logging.basicConfig(level=logging.INFO, format="[InkFlow] %(levelname)s %(message)s")
log = logging.getLogger("novel_scraper")


# ── Source registry ───────────────────────────────────────────────────────────

def _get_source(source_id: str):
    """
    Resolve a source module by its identifier.

    Returns:
        The source module (e.g. ``sources.allnovel``).

    Raises:
        ValueError: If the source_id is unknown.
    """
    source_id = (source_id or "").strip().lower()

    if source_id in ("allnovel", "allnovel.org"):
        from sources import allnovel
        return allnovel
    elif source_id in ("royalroad", "royalroad.com"):
        from sources import royalroad
        return royalroad
    elif source_id in ("novelbin", "novelbin.me", "novelbin.com"):
        from sources import novelbin
        return novelbin
    elif source_id in ("boxnovel", "boxnovel.com"):
        from sources import boxnovel
        return boxnovel
    elif source_id in ("lightnovelpub", "lightnovelpub.com"):
        from sources import lightnovelpub
        return lightnovelpub

    raise ValueError(f"Unknown source: {source_id}")


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _parse_cookies(cookie_str: str) -> dict:
    """Parse a cookie header string into a dict."""
    cookies = {}
    if not cookie_str:
        return cookies
    for pair in cookie_str.split("; "):
        if "=" in pair:
            key, _, value = pair.partition("=")
            cookies[key.strip()] = value.strip()
    return cookies


def _build_session(cookies: str, user_agent: str, referer: str = None):
    """Create a session (using cloudscraper if available) with standard headers and cookies."""
    try:
        import cloudscraper
        session = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'android', 'desktop': False})
    except ImportError:
        import requests
        session = requests.Session()

    session.cookies.update(_parse_cookies(cookies))
    session.headers.update({
        "User-Agent": user_agent or "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": referer or "",
    })
    return session


def _fetch(session, url: str, timeout: int = 30) -> str:
    """Fetch a URL and return the response text. Raises on HTTP error."""
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return response.text


# ── Public API ────────────────────────────────────────────────────────────────

def search(source_id: str, query: str, cookies: str, user_agent: str) -> str:
    """
    Search for novels on the specified source.

    Args:
        source_id:  Source identifier (e.g. ``"allnovel"``).
        query:      Search keywords.
        cookies:    Cookie header string (``"k1=v1; k2=v2"``).
        user_agent: User-Agent header value.

    Returns:
        JSON string — array of search result dicts.
    """
    try:
        source = _get_source(source_id)
        session = _build_session(cookies, user_agent, source.BASE_URL)

        search_url = source.build_search_url(query)
        log.info("Searching: %s", search_url)

        html = _fetch(session, search_url)
        results = source.parse_search_results(html)

        return json.dumps(results, ensure_ascii=False)

    except Exception as e:
        log.error("Search failed: %s", e, exc_info=True)
        return json.dumps({"error": str(e)})


def get_novel_details(source_id: str, url: str, cookies: str, user_agent: str) -> str:
    """
    Fetch full novel details including ALL paginated chapters.

    Args:
        source_id:  Source identifier.
        url:        Novel detail page URL.
        cookies:    Cookie header string.
        user_agent: User-Agent header value.

    Returns:
        JSON string — novel details dict with complete chapter list.
    """
    try:
        source = _get_source(source_id)
        session = _build_session(cookies, user_agent, source.BASE_URL)

        # ── Page 1 ───────────────────────────────────────────────────────
        log.info("Fetching novel details: %s", url)
        html_page1 = _fetch(session, url)

        details = source.parse_novel_details(html_page1, url)
        all_chapters = list(details.get("chapters", []))

        # ── Remaining pages ──────────────────────────────────────────────
        last_page = source.get_last_page_number(html_page1)
        log.info("Novel has %d chapter-list page(s)", last_page)

        for page_num in range(2, last_page + 1):
            try:
                page_url = f"{url.split('?')[0]}?page={page_num}"
                log.info("Fetching chapter page %d/%d", page_num, last_page)
                time.sleep(0.5)

                page_html = _fetch(session, page_url)
                page_chapters = source.parse_chapter_list_page(page_html)
                all_chapters.extend(page_chapters)

            except Exception as e:
                log.warning("Failed to fetch page %d: %s", page_num, e)
                continue

        # Re-index chapters globally (0-based)
        for idx, ch in enumerate(all_chapters):
            ch["index"] = idx

        details["chapters"] = all_chapters
        details["totalChapters"] = len(all_chapters)

        return json.dumps(details, ensure_ascii=False)

    except Exception as e:
        log.error("get_novel_details failed: %s", e, exc_info=True)
        return json.dumps({"error": str(e)})


def download_chapter_batch(
    source_id: str,
    chapters_json: str,
    cookies: str,
    user_agent: str,
    output_dir: str,
) -> str:
    """
    Download a batch of chapters and save each to a JSON file.

    Args:
        source_id:     Source identifier.
        chapters_json: JSON array of ``{index, title, url}`` dicts.
        cookies:       Cookie header string.
        user_agent:    User-Agent header value.
        output_dir:    Directory to write ``chapter_NNNN.json`` files.

    Returns:
        JSON string — ``{success: int, failed: int, errors: [str]}``.
    """
    result = {"success": 0, "failed": 0, "errors": []}

    try:
        source = _get_source(source_id)
        session = _build_session(cookies, user_agent, source.BASE_URL)

        chapters = json.loads(chapters_json) if isinstance(chapters_json, str) else chapters_json
        os.makedirs(output_dir, exist_ok=True)

        for i, ch in enumerate(chapters):
            ch_index = ch.get("index", i)
            ch_title = ch.get("title", f"Chapter {ch_index + 1}")
            ch_url = ch.get("url", "")

            if not ch_url:
                result["failed"] += 1
                result["errors"].append(f"Chapter {ch_index}: missing URL")
                continue

            try:
                log.info(
                    "Downloading chapter %d/%d: %s",
                    i + 1, len(chapters), ch_title,
                )
                html = _fetch(session, ch_url)
                parsed = source.parse_chapter_content(html)

                # Use parsed title if available, fall back to list title
                final_title = parsed.get("title") or ch_title
                content = parsed.get("content", "")

                if not content:
                    result["failed"] += 1
                    result["errors"].append(f"Chapter {ch_index}: empty content")
                    continue

                # Write chapter file
                out_file = os.path.join(output_dir, f"chapter_{ch_index:04d}.json")
                with open(out_file, "w", encoding="utf-8") as f:
                    json.dump(
                        {"index": ch_index, "title": final_title, "content": content},
                        f,
                        ensure_ascii=False,
                    )

                result["success"] += 1

            except Exception as e:
                result["failed"] += 1
                result["errors"].append(f"Chapter {ch_index}: {e}")
                log.warning("Chapter %d failed: %s", ch_index, e)

            # Rate-limit: 0.5 – 1.0 s between requests
            if i < len(chapters) - 1:
                time.sleep(0.5)

    except Exception as e:
        log.error("download_chapter_batch failed: %s", e, exc_info=True)
        result["errors"].append(f"Batch error: {e}")

    return json.dumps(result, ensure_ascii=False)
