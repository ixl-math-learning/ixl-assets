// Void Network Lite — single-page app

const LS = {
  favs: 'vnl.favs',
  recent: 'vnl.recent',
  cat: 'vnl.cat',
};
const RECENT_MAX = 24;

function lsRead(k, fallback) {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
}
function lsWrite(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

let GAMES = [];
let CATS = [];
let state = {
  query: '',
  category: lsRead(LS.cat, 'All'),
  favs: new Set(lsRead(LS.favs, [])),
};

function getFavs() { return [...state.favs]; }
function setFavs() { lsWrite(LS.favs, getFavs()); }
function toggleFav(id) {
  if (state.favs.has(id)) state.favs.delete(id);
  else state.favs.add(id);
  setFavs();
  renderBrowse();
}

function getRecent() { return lsRead(LS.recent, []); }
function pushRecent(id) {
  let r = getRecent();
  r = r.filter((x) => x !== id);
  r.unshift(id);
  if (r.length > RECENT_MAX) r = r.slice(0, RECENT_MAX);
  lsWrite(LS.recent, r);
}

function tile(g) {
  const a = document.createElement('a');
  a.className = 'tile';
  a.href = `#/play/${g.id}`;
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = g.thumb;
  img.alt = g.title;
  img.onerror = () => { img.style.background = '#1a1a1a'; img.removeAttribute('src'); };
  a.appendChild(img);

  if (g.special && g.special.length) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = g.special[0].toUpperCase();
    a.appendChild(b);
  }

  const fav = document.createElement('button');
  fav.className = 'fav-btn' + (state.favs.has(g.id) ? ' on' : '');
  fav.title = 'Favorite';
  fav.textContent = state.favs.has(g.id) ? '★' : '☆';
  fav.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(g.id);
  };
  a.appendChild(fav);

  const info = document.createElement('div');
  info.className = 'info';
  const t = document.createElement('div');
  t.className = 'title';
  t.textContent = g.title;
  info.appendChild(t);
  a.appendChild(info);
  return a;
}

function buildSection(title, list, opts = {}) {
  if (!list.length) return null;
  const sec = document.createElement('section');
  sec.className = 'section';
  const head = document.createElement('div');
  head.className = 'section-head';
  const h = document.createElement('h2');
  h.textContent = title;
  head.appendChild(h);
  if (opts.meta) {
    const m = document.createElement('span');
    m.className = 'section-meta';
    m.textContent = opts.meta;
    head.appendChild(m);
  }
  sec.appendChild(head);
  const grid = document.createElement('div');
  grid.className = 'grid';
  list.forEach((g) => grid.appendChild(tile(g)));
  sec.appendChild(grid);
  return sec;
}

function renderBrowse() {
  const root = document.getElementById('content');
  root.innerHTML = '';

  const q = state.query.trim().toLowerCase();
  const cat = state.category;

  let pool = GAMES;
  if (cat !== 'All') pool = pool.filter((g) => g.category && g.category.includes(cat));
  if (q) pool = pool.filter((g) => g.title.toLowerCase().includes(q) || (g.author || '').toLowerCase().includes(q));

  if (q || cat !== 'All') {
    const sec = buildSection(
      q ? `Search: "${state.query}"` : cat,
      pool,
      { meta: `${pool.length} game${pool.length === 1 ? '' : 's'}` }
    );
    if (sec) root.appendChild(sec);
    else {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = 'No games match.';
      root.appendChild(e);
    }
    return;
  }

  const favList = GAMES.filter((g) => state.favs.has(g.id));
  const recentIds = getRecent();
  const recentList = recentIds.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean);

  if (favList.length) {
    const s = buildSection('Favorites', favList);
    if (s) root.appendChild(s);
  }
  if (recentList.length) {
    const s = buildSection('Recently played', recentList);
    if (s) root.appendChild(s);
  }

  const all = buildSection('All games', GAMES, { meta: `${GAMES.length} games` });
  if (all) {
    const grid = all.querySelector('.grid');
    const tiles = [...grid.children];
    for (let i = 24; i < tiles.length; i += 25) {
      const row = document.createElement('div');
      row.className = 'ad-row';
      row.style.gridColumn = '1 / -1';
      if (window.placeBanner) {
        const inner = document.createElement('div');
        inner.style.display = 'flex';
        inner.style.gap = '.6rem';
        inner.style.justifyContent = 'center';
        window.placeBanner(inner, '728x90');
        row.appendChild(inner);
      }
      grid.insertBefore(row, tiles[i]);
    }
    root.appendChild(all);
  }
}

function buildCatBar() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = '';
  const cats = ['All', ...CATS];
  cats.forEach((c) => {
    const b = document.createElement('button');
    b.textContent = c;
    if (state.category === c) b.classList.add('active');
    b.onclick = () => {
      state.category = c;
      lsWrite(LS.cat, c);
      buildCatBar();
      renderBrowse();
    };
    bar.appendChild(b);
  });
}

// ---------- Play view ----------

let currentBlobUrl = null;

function showError(msg) {
  const wrap = document.querySelector('#viewPlay .play-frame-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="play-error">
      <h2>Couldn't load this game</h2>
      <p>${msg}</p>
      <p><a href="#/">Back to all games</a></p>
    </div>`;
}

async function loadGame(g) {
  document.title = `${g.title} — Void Network Lite`;
  const titleEl = document.getElementById('playTitle');
  const iconEl  = document.getElementById('cntIcon');
  const urlEl   = document.getElementById('urlDisplay');
  if (titleEl) titleEl.textContent = g.title;
  if (iconEl && g.thumb) iconEl.src = g.thumb;
  if (urlEl)   urlEl.textContent   = location.origin;
  pushRecent(g.id);

  // Adsterra popunder + social-bar scripts hijack the next document click,
  // so we only arm them when a game is actually launched, and only once per session.
  if (!window.__vnPopunderArmed) {
    window.__vnPopunderArmed = true;
    if (window.loadGlobalAds) window.loadGlobalAds();
  }
  // Side 300x250 (scaled into the .sp-inner box)
  mountSidePanelAd();

  const iframe  = document.getElementById('gameFrame');
  const loading = document.getElementById('loadingOverlay');
  if (loading) loading.classList.remove('hidden');

  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }

  try {
    const resp = await fetch(g.jsdelivrUrl + '?cb=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const html = await resp.text();
    const blob = new Blob([html], { type: 'text/html' });
    currentBlobUrl = URL.createObjectURL(blob);
    iframe.src = currentBlobUrl;
    iframe.onload = () => { if (loading) loading.classList.add('hidden'); };
    setTimeout(() => { if (loading) loading.classList.add('hidden'); }, 8000);
  } catch (e) {
    if (loading) loading.classList.add('hidden');
    showError('Network error: ' + e.message);
  }
}

function mountSidePanelAd() {
  const inner = document.getElementById('spInner');
  const container = document.getElementById('spContainer');
  if (!inner || !container || inner.dataset.mounted === '1') {
    if (container) scaleSidePanel();
    return;
  }
  inner.dataset.mounted = '1';
  // 300x250 banner from ad-codes.txt — isolated in an iframe srcdoc
  if (window.bannerIframe) {
    const f = window.bannerIframe('300x250');
    if (f) {
      f.style.width  = '300px';
      f.style.height = '250px';
      inner.appendChild(f);
    }
  }
  scaleSidePanel();
  if (!window.__vnSpResizeWired) {
    window.__vnSpResizeWired = true;
    window.addEventListener('resize', scaleSidePanel);
  }
}
function scaleSidePanel() {
  const inner = document.getElementById('spInner');
  const container = document.getElementById('spContainer');
  if (!inner || !container) return;
  const s = container.clientWidth / 300;
  inner.style.transform = 'scale(' + s + ')';
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.id === 'fullscreenBtn') {
    const c = document.getElementById('embedContainer');
    if (c.requestFullscreen) c.requestFullscreen();
    else if (c.webkitRequestFullscreen) c.webkitRequestFullscreen();
  } else if (btn.id === 'refreshBtn') {
    const f = document.getElementById('gameFrame');
    if (f && f.src) { const cur = f.src; f.src = 'about:blank'; setTimeout(() => { f.src = cur; }, 50); }
  } else if (btn.id === 'newTabBtn') {
    const cloak = `<!doctype html><html><head><title>Google Classroom</title>
      <link rel="icon" href="https://ssl.gstatic.com/classroom/favicon.png">
      <style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style>
      </head><body><iframe src="${location.href}"></iframe></body></html>`;
    const w = window.open('about:blank');
    if (w) { w.document.open(); w.document.write(cloak); w.document.close(); }
  }
});

// ---------- Router ----------

const VIEWS = ['Browse', 'Play', 'About', 'Dmca', 'Privacy'];

function showView(name) {
  VIEWS.forEach((v) => {
    const el = document.getElementById('view' + v);
    if (!el) return;
    el.hidden = (v !== name);
  });
  document.querySelectorAll('header nav a').forEach((a) => a.classList.remove('active'));
  if (name === 'Browse')   document.querySelector('nav a[data-route="home"]')?.classList.add('active');
  if (name === 'About')    document.querySelector('nav a[data-route="about"]')?.classList.add('active');
  if (name === 'Dmca')     document.querySelector('nav a[data-route="dmca"]')?.classList.add('active');
  if (name === 'Privacy')  document.querySelector('nav a[data-route="privacy"]')?.classList.add('active');
}

function setBodyMode(mode) {
  document.body.classList.toggle('mode-play', mode === 'play');
  const footer = document.getElementById('siteFooter');
  if (footer) footer.style.display = (mode === 'play') ? 'none' : '';
}

function route() {
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/play\/(\d+)/);
  if (m) {
    const id = Number(m[1]);
    const g = GAMES.find((x) => x.id === id);
    if (!g) {
      showView('Browse');
      setBodyMode('browse');
      document.title = 'Void Network Lite — Free Browser Games';
      return;
    }
    showView('Play');
    setBodyMode('play');
    loadGame(g);
    return;
  }

  setBodyMode('browse');

  if (hash.startsWith('#/about'))   { showView('About');   document.title = 'About — Void Network Lite';   return; }
  if (hash.startsWith('#/dmca'))    { showView('Dmca');    document.title = 'DMCA — Void Network Lite';    return; }
  if (hash.startsWith('#/privacy')) { showView('Privacy'); document.title = 'Privacy — Void Network Lite'; return; }

  showView('Browse');
  document.title = 'Void Network Lite — Free Browser Games';
  if (currentBlobUrl) {
    document.getElementById('gameFrame').src = 'about:blank';
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

window.addEventListener('hashchange', route);

// ---------- Init ----------

async function init() {
  const manifestUrl = (window.VNL_CDN || '.') + '/games.json';
  try {
    const res = await fetch(manifestUrl);
    GAMES = await res.json();
  } catch (e) {
    document.getElementById('content').innerHTML =
      '<div class="empty">Failed to load games.json. Make sure the site is served (try <code>npx serve</code>).</div>';
    return;
  }

  const cs = new Set();
  GAMES.forEach((g) => (g.category || []).forEach((c) => cs.add(c)));
  CATS = [...cs].sort();
  buildCatBar();

  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.query = e.target.value;
    if (!location.hash || location.hash === '#/' || location.hash.startsWith('#/?')) {
      renderBrowse();
    } else {
      location.hash = '#/';
    }
  });

  renderBrowse();
  route();

  // NOTE: don't auto-load loadGlobalAds() here — popunder/social-bar
  // scripts hijack the very next click. They're armed inside loadGame()
  // instead, so the click-jack only happens after a game is launched.
  if (window.placeStickyFooter) window.placeStickyFooter();
  if (window.placeSideRails) window.placeSideRails();

  const aboveFold = document.getElementById('aboveFold');
  if (aboveFold && window.placeBanner) window.placeBanner(aboveFold, '728x90');
}

init();
