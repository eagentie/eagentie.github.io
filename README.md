# Romania Press Release Hub (GitHub Pages)

Acest repo este gata de urcat pe GitHub (drag & drop) și publicat prin **GitHub Pages**.

## Ce face
- `/` și `/site-ro/` afișează o listă cu toate site-urile din `data/sites.json`.
- Pentru fiecare site există pagină la: `/site-ro/<slug>/` (deja generată).
- Pe fiecare pagină se afișează:
  - **Latest de pe site** (RSS -> JSON local)
  - **Latest de pe Mastodon** (RSS -> JSON local)

## Setup (2 minute)
1) Creează repo-ul:
- pentru org/user pages: `romania-press-release.github.io` (exact numele acesta)
2) Urcă TOT conținutul din acest folder în repo (drag & drop în GitHub)
3) Activează GitHub Pages:
- Settings → Pages → Deploy from branch → `main` → `/ (root)`
4) Rulează o dată workflow-ul:
- Actions → **Update feeds** → Run workflow  
(sau aștepți primul run automat, e programat din oră în oră)

## Adaugi / modifici site-uri
Editezi `data/sites.json` și adaugi un obiect nou (slug unic).
După ce adaugi un site nou, creează și folderul `site-ro/<slug>/index.html`.
Dacă vrei, îți pot genera automat și aceste foldere pentru orice listă nouă.

## Custom domain (opțional)
Dacă pui domeniu custom, editează `data/config.json`:
- `base_url`: "https://domeniul-tau.ro"
Ca sitemap.xml să iasă corect.

---
Generat pentru rețeaua social.5th.ro
