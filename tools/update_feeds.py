#!/usr/bin/env python3
import json, os, re, time
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
import feedparser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SITES_JSON = os.path.join(DATA, "sites.json")
FEEDS_DIR = os.path.join(DATA, "feeds")

UA = "romania-press-release-ghpages/1.0 (+https://github.com/)"

def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")

def strip_html(s: str) -> str:
    if not s: return ""
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def pick_date(entry):
    for key in ("published", "updated", "created"):
        if key in entry and entry[key]:
            return entry[key]
    # feedparser may store parsed_structs
    for key in ("published_parsed", "updated_parsed"):
        if key in entry and entry[key]:
            try:
                return datetime.fromtimestamp(time.mktime(entry[key]), tz=timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")
            except Exception:
                pass
    return ""

def fetch_rss(url: str):
    # requests first (more control), then feedparser.parse bytes
    r = requests.get(url, headers={"User-Agent": UA, "Accept": "*/*"}, timeout=25)
    r.raise_for_status()
    return feedparser.parse(r.content)

def build_site_posts(feed, limit=12):
    out = []
    for e in feed.entries[:limit]:
        out.append({
            "title": getattr(e, "title", "") or "",
            "link": getattr(e, "link", "") or "",
            "date": pick_date(e),
            "summary": strip_html(getattr(e, "summary", "") or getattr(e, "description", "") or "")
        })
    return out

def build_mastodon_posts(feed, limit=12):
    out = []
    for e in feed.entries[:limit]:
        content = getattr(e, "summary", "") or getattr(e, "description", "") or ""
        # Mastodon RSS sometimes contains HTML with links; keep as text for display
        out.append({
            "title": getattr(e, "title", "") or "",
            "link": getattr(e, "link", "") or "",
            "date": pick_date(e),
            "content": strip_html(content)
        })
    return out

def main():
    os.makedirs(FEEDS_DIR, exist_ok=True)
    with open(SITES_JSON, "r", encoding="utf-8") as f:
        sites = json.load(f)

    any_errors = False

    for s in sites:
        slug = s["slug"]
        target = os.path.join(FEEDS_DIR, f"{slug}.json")

        payload = {
            "slug": slug,
            "site": s.get("site",""),
            "site_feed": s.get("site_feed",""),
            "mastodon": s.get("mastodon",""),
            "mastodon_rss": s.get("mastodon_rss",""),
            "updated_at": now_iso(),
            "site_posts": [],
            "mastodon_posts": []
        }

        # Site RSS
        try:
            if s.get("site_feed"):
                feed = fetch_rss(s["site_feed"])
                payload["site_posts"] = build_site_posts(feed, limit=12)
        except Exception as e:
            any_errors = True

        # Mastodon RSS
        try:
            if s.get("mastodon_rss"):
                feed = fetch_rss(s["mastodon_rss"])
                payload["mastodon_posts"] = build_mastodon_posts(feed, limit=12)
        except Exception as e:
            any_errors = True

        with open(target, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        # be nice to servers
        time.sleep(1.0)

    # don't fail workflow if some feeds were temporarily unavailable
    print("Done. Some feeds may have had temporary errors." if any_errors else "Done.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
