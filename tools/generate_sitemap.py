#!/usr/bin/env python3
import json, os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SITES_JSON = os.path.join(DATA, "sites.json")
CONFIG_JSON = os.path.join(DATA, "config.json")

def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00","Z")

def load_base_url():
    base = ""
    if os.path.exists(CONFIG_JSON):
        with open(CONFIG_JSON, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            base = (cfg.get("base_url") or "").strip()
    if base:
        return base.rstrip("/")
    # fallback for user/org pages:
    owner = os.environ.get("GITHUB_REPOSITORY_OWNER", "").strip()
    if owner:
        return f"https://{owner}.github.io"
    # final fallback: leave empty
    return ""

def main():
    base = load_base_url()
    with open(SITES_JSON, "r", encoding="utf-8") as f:
        sites = json.load(f)

    urls = ["/", "/site-ro/"] + [f"/site-ro/{s['slug']}/" for s in sites]
    lastmod = now_iso()

    def abs_url(u):
        return (base + u) if base else u

    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml.append("  <url>")
        xml.append(f"    <loc>{abs_url(u)}</loc>")
        xml.append(f"    <lastmod>{lastmod}</lastmod>")
        xml.append("  </url>")
    xml.append("</urlset>\n")

    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(xml))

    # robots.txt
    robots = [
        "User-agent: *",
        "Allow: /",
        f"Sitemap: {abs_url('/sitemap.xml')}",
        ""
    ]
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(robots))

    print("Generated sitemap.xml and robots.txt")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
