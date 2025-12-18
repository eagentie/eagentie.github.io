function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function formatDate(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'});
}

function stripHtml(html){
  if(!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g," ").trim();
}

async function fetchJson(url){
  // Use cache-first strategy for better performance
  const cacheKey = `rss-hub-${url}`;
  const cached = sessionStorage.getItem(cacheKey);
  if(cached){
    try{
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      if(age < 60000){ // Use cache if less than 1 minute old
        return data.data;
      }
    }catch(e){}
  }
  
  const res = await fetch(url, {cache:"no-store"});
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  
  // Cache the result
  try{
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: data,
      timestamp: Date.now()
    }));
  }catch(e){}
  
  return data;
}

function deriveTitle(site){
  try{
    const u = new URL(site);
    return u.hostname;
  }catch(e){
    return site;
  }
}

function siteUrlForSlug(slug){
  return `/site-ro/${slug}/`;
}

function renderCards(sites, container){
  container.innerHTML = "";
  for(const s of sites){
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <h2><a href="${siteUrlForSlug(s.slug)}" style="text-decoration:none">${s.name || deriveTitle(s.site)}</a></h2>
      ${s.description_short || s.description ? `<p style="margin:0 0 16px 0;color:var(--muted);font-size:14px;line-height:1.7;display:block">${s.description_short || s.description}</p>` : ""}
      <div class="meta">
        <span class="pill"><span class="dot"></span> Site: <a href="${s.site}" target="_blank" rel="noopener nofollow" style="text-decoration:none">${deriveTitle(s.site)}</a></span>
        <span class="pill">Mastodon: <a href="${s.mastodon}" target="_blank" rel="noopener nofollow" style="text-decoration:none">@${s.mastodon_user || ""}</a></span>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn" href="${siteUrlForSlug(s.slug)}">Vezi feed RSS</a>
        <a class="btn" href="${s.site}" target="_blank" rel="noopener nofollow">Deschide site</a>
        <a class="btn" href="${s.mastodon}" target="_blank" rel="noopener nofollow">Profil Mastodon</a>
      </div>
    `;
    container.appendChild(el);
  }
}

async function initHome(){
  const sites = await fetchJson("/data/sites.json");
  const grid = $("#cards");
  const input = $("#q");

  renderCards(sites, grid);

  const update = () => {
    const q = (input.value || "").toLowerCase().trim();
    const filtered = !q ? sites : sites.filter(s => {
      const hay = `${s.slug} ${s.name} ${s.site} ${s.mastodon_user} ${s.description || ""}`.toLowerCase();
      return hay.includes(q);
    });
    renderCards(filtered, grid);
    $("#count").textContent = `${filtered.length}/${sites.length}`;
  };
  input.addEventListener("input", update);
  update();
}

function renderFeedList(items, kind){
  if(!items || !items.length){
    return `<div class="notice">Feed-ul RSS este în curs de actualizare. Conținutul va fi disponibil în curând.</div>`;
  }
  const rows = items.slice(0, 12).map(it => {
    const title = kind === "mastodon" ? (stripHtml(it.content || it.title || "").slice(0,140) || "Post") : (it.title || "Articol");
    const link = it.link || "#";
    const date = it.date || it.published || it.updated || "";
    const sub = kind === "mastodon" ? stripHtml(it.content || it.summary || "").slice(0, 220) : stripHtml(it.summary || it.description || "").slice(0, 220);
    return `
      <div class="item">
        <a href="${link}" target="_blank" rel="noopener nofollow"><strong>${title}</strong></a>
        <div class="sub">
          <span>${formatDate(date)}</span>
          <span class="kbd">${kind === "mastodon" ? "toot" : "post"}</span>
        </div>
        ${sub ? `<div class="notice">${sub}${sub.length>=220 ? "…" : ""}</div>` : ""}
      </div>
    `;
  }).join("");
  return rows;
}

async function initSitePage(){
  const slug = document.documentElement.getAttribute("data-slug");
  if(!slug) return;

  const sites = await fetchJson("/data/sites.json");
  const site = sites.find(s => s.slug === slug);
  if(!site){
    $("#title").textContent = "Site necunoscut";
    $("#siteMeta").innerHTML = `<div class="notice">Slug invalid: <span class="kbd">${slug}</span></div>`;
    return;
  }

  $("#title").textContent = site.name || deriveTitle(site.site);
  
  // Add extended description if available
  const description = site.description_long || site.description_medium || site.description || "";
  const descriptionHtml = description ? `<div style="margin-top: 20px; padding: 18px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255,255,255,.02); margin-bottom: 20px;"><p style="margin: 0; color: var(--muted); line-height: 1.7; font-size: 14px;">${description}</p></div>` : "";
  
  $("#siteMeta").innerHTML = `
    ${descriptionHtml}
    <div class="meta">
      <span class="pill"><span class="dot"></span> Site: <a href="${site.site}" target="_blank" rel="noopener" style="text-decoration:none">${site.site}</a></span>
      <span class="pill">Feed RSS: <a href="${site.site_feed}" target="_blank" rel="noopener nofollow" style="text-decoration:none">${site.site_feed}</a></span>
      <span class="pill">Mastodon: <a href="${site.mastodon}" target="_blank" rel="noopener nofollow" style="text-decoration:none">@${site.mastodon_user}</a></span>
    </div>
  `;

  let feed;
  try{
    feed = await fetchJson(`/data/feeds/${slug}.json`);
  }catch(e){
    feed = null;
  }

  if(feed){
    $("#updatedAt").textContent = feed.updated_at ? `Actualizat: ${formatDate(feed.updated_at)}` : "";
    $("#sitePosts").innerHTML = renderFeedList(feed.site_posts, "site");
    $("#mastodonPosts").innerHTML = renderFeedList(feed.mastodon_posts, "mastodon");
  }else{
    $("#updatedAt").textContent = "";
    $("#sitePosts").innerHTML = `<div class="notice">Feed-ul RSS este temporar indisponibil. Te rugăm să revii mai târziu.</div>`;
    $("#mastodonPosts").innerHTML = `<div class="notice">Feed-ul RSS este temporar indisponibil. Te rugăm să revii mai târziu.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.documentElement.getAttribute("data-page");
  if(page === "home") initHome();
  if(page === "site") initSitePage();
});
