(function () {
  var LS = { fav: 'vnl.favs', rec: 'vnl.recent', cat: 'vnl.cat' };
  var RECENT_MAX = 24;

  function rd(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var GAMES = [];
  var CATS = [];
  var st = {
    q: '',
    cat: rd(LS.cat, 'All'),
    favs: new Set(rd(LS.fav, [])),
  };

  function saveFavs() { wr(LS.fav, [].concat([...st.favs])); }
  function toggleFav(id) { st.favs.has(id) ? st.favs.delete(id) : st.favs.add(id); saveFavs(); paint(); }
  function recent() { return rd(LS.rec, []); }
  function pushRecent(id) {
    var r = recent().filter(function (x) { return x !== id; });
    r.unshift(id);
    if (r.length > RECENT_MAX) r.length = RECENT_MAX;
    wr(LS.rec, r);
  }

  function adFrame(w, h, key) {
    var f = document.createElement('iframe');
    f.scrolling = 'no';
    f.frameBorder = '0';
    f.width = w;
    f.height = h;
    f.loading = 'lazy';
    f.style.cssText = 'border:0;display:block;background:transparent';
    f.srcdoc =
      '<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}</style></head><body>' +
      "<script>atOptions={'key':'" + key + "','format':'iframe','height':" + h + ",'width':" + w + ",'params':{}};<\/script>" +
      '<script src="https://www.highperformanceformat.com/' + key + '/invoke.js"><\/script>' +
      '</body></html>';
    return f;
  }

  var BANNERS = {
    '468x60':  '42a42273d6bbea160a4ccc3ca8196102',
    '300x250': '9761ebbef2d249e513184c2ab69ef7f7',
    '160x300': 'b5de3f0d0644e59a31b20b36ff5f3665',
    '160x600': '2ac1c6c752977adc4b48460d3431a849',
    '320x50':  '66d51b026d1791296c2f405dc7c88e7d',
    '728x90':  'bb49d3eb30b6f59a5b1d34cff5e4678a',
  };
  function banner(size) {
    var p = size.split('x'); return adFrame(+p[0], +p[1], BANNERS[size]);
  }

  function tileEl(g) {
    var a = document.createElement('a');
    a.className = 'tile';
    a.href = '#/play/' + g.id;
    var img = document.createElement('img');
    img.loading = 'lazy';
    img.src = g.thumb;
    img.alt = g.title;
    img.onerror = function () { img.style.background = '#1a1a1a'; img.removeAttribute('src'); };
    a.appendChild(img);
    if (g.special && g.special.length) {
      var b = document.createElement('span');
      b.className = 'badge';
      b.textContent = g.special[0].toUpperCase();
      a.appendChild(b);
    }
    var fav = document.createElement('button');
    fav.className = 'fav-btn' + (st.favs.has(g.id) ? ' on' : '');
    fav.title = 'Favorite';
    fav.textContent = st.favs.has(g.id) ? '★' : '☆';
    fav.onclick = function (e) { e.preventDefault(); e.stopPropagation(); toggleFav(g.id); };
    a.appendChild(fav);
    var info = document.createElement('div');
    info.className = 'info';
    var t = document.createElement('div');
    t.className = 'title';
    t.textContent = g.title;
    info.appendChild(t);
    a.appendChild(info);
    return a;
  }

  function section(title, list, meta) {
    if (!list.length) return null;
    var s = document.createElement('section');
    s.className = 'section';
    var h = document.createElement('div');
    h.className = 'section-head';
    var ht = document.createElement('h2');
    ht.textContent = title;
    h.appendChild(ht);
    if (meta) {
      var m = document.createElement('span');
      m.className = 'section-meta';
      m.textContent = meta;
      h.appendChild(m);
    }
    s.appendChild(h);
    var g = document.createElement('div');
    g.className = 'grid';
    list.forEach(function (x) { g.appendChild(tileEl(x)); });
    s.appendChild(g);
    return s;
  }

  function paint() {
    var root = document.getElementById('content');
    root.innerHTML = '';
    var q = st.q.trim().toLowerCase();
    var c = st.cat;
    var pool = GAMES;
    if (c !== 'All') pool = pool.filter(function (g) { return g.category && g.category.indexOf(c) >= 0; });
    if (q) pool = pool.filter(function (g) {
      return g.title.toLowerCase().indexOf(q) >= 0 || (g.author || '').toLowerCase().indexOf(q) >= 0;
    });

    if (q || c !== 'All') {
      var sec = section(q ? 'Search: "' + st.q + '"' : c, pool, pool.length + ' game' + (pool.length === 1 ? '' : 's'));
      if (sec) root.appendChild(sec);
      else {
        var e = document.createElement('div');
        e.className = 'empty';
        e.textContent = 'No games match.';
        root.appendChild(e);
      }
      return;
    }

    var favList = GAMES.filter(function (g) { return st.favs.has(g.id); });
    var rids = recent();
    var recList = rids.map(function (id) { return GAMES.find(function (g) { return g.id === id; }); }).filter(Boolean);
    if (favList.length) { var fs = section('Favorites', favList); if (fs) root.appendChild(fs); }
    if (recList.length) { var rs = section('Recently played', recList); if (rs) root.appendChild(rs); }

    var all = section('All games', GAMES, GAMES.length + ' games');
    if (all) {
      if (!IN_EDITOR) {
        var grid = all.querySelector('.grid');
        var tiles = [].slice.call(grid.children);
        var stride = 24;
        for (var i = stride; i < tiles.length; i += stride + 1) {
          var row = document.createElement('div');
          row.className = 'ad-row';
          row.style.gridColumn = '1 / -1';
          var size = window.innerWidth < 740 ? '320x50' : (i % 48 === 0 ? '468x60' : '728x90');
          row.appendChild(banner(size));
          grid.insertBefore(row, tiles[i]);
        }
      }
      root.appendChild(all);
    }
  }

  function buildCats() {
    var bar = document.getElementById('catBar');
    bar.innerHTML = '';
    var all = ['All'].concat(CATS);
    all.forEach(function (c) {
      var b = document.createElement('button');
      b.textContent = c;
      if (st.cat === c) b.classList.add('active');
      b.onclick = function () { st.cat = c; wr(LS.cat, c); buildCats(); paint(); };
      bar.appendChild(b);
    });
  }

  var blobUrl = null;
  var popArmed = false;
  var stickyMounted = false;
  var sideMounted = false;
  var IN_EDITOR = (function () {
    try {
      var ref = document.referrer || '';
      if (/contentframe\.googleusercontent\.com/i.test(ref)) return true;
      if (/sites\.google\.com.*\/edit(\b|\/|\?|$)/i.test(ref)) return true;
      if (/docs\.google\.com.*\/edit(\b|\/|\?|$)/i.test(ref)) return true;
      var ao = location.ancestorOrigins;
      if (ao && ao.length) {
        for (var i = 0; i < ao.length; i++) {
          if (/contentframe\.googleusercontent\.com/i.test(ao[i])) return true;
        }
      }
      try {
        if (window.top !== window.self && window.top.location && /\/edit/i.test(window.top.location.href)) return true;
      } catch (e) {}
      var qs = (location.search || '') + (location.hash || '');
      if (/[?&#](preview|edit|editor)=1\b/i.test(qs)) return true;
    } catch (e) {}
    return false;
  })();

  function showError(msg) {
    var w = document.querySelector('#viewPlay .embed-container');
    if (!w) return;
    w.innerHTML = '<div class="play-error"><h2>Couldn\'t load this game</h2><p>' + msg + '</p><p><a href="#/">Back to all games</a></p></div>';
  }

  function armPopunder() {
    if (popArmed || IN_EDITOR) return;
    popArmed = true;
    var s1 = document.createElement('script');
    s1.async = true;
    s1.src = 'https://researchingsweatexit.com/1f/d8/42/1fd842e6dd4ea983a8427ab669c19fb1.js';
    document.head.appendChild(s1);
    var s2 = document.createElement('script');
    s2.async = true;
    s2.src = 'https://pl29120646.profitablecpmratenetwork.com/88/07/0b/88070babdbb1232d86b1367690d76975.js';
    document.head.appendChild(s2);
  }

  function mountSticky() {
    if (stickyMounted || IN_EDITOR) return;
    stickyMounted = true;
    var d = document.createElement('div');
    d.className = 'ad-sticky';
    d.appendChild(banner(window.innerWidth < 740 ? '320x50' : '728x90'));
    document.body.appendChild(d);
  }

  function mountSideRails() {
    if (sideMounted || IN_EDITOR) return;
    sideMounted = true;
    if (window.innerWidth < 1400) return;
    ['left', 'right'].forEach(function (s) {
      var w = document.createElement('div');
      w.className = 'ad-side-rail ' + s;
      w.appendChild(banner('160x600'));
      document.body.appendChild(w);
    });
  }

  function scaleSidePanels() {
    var sp = document.querySelector('.sp-container');
    var spi = document.getElementById('spInner');
    if (sp && spi) spi.style.transform = 'scale(' + (sp.clientWidth / 300) + ')';
  }

  function pickRelated(currentId) {
    var pool = GAMES.filter(function (g) { return g.id !== currentId && g.thumb; });
    var out = [];
    var seen = {};
    while (out.length < 3 && pool.length) {
      var i = (Math.random() * pool.length) | 0;
      var g = pool[i];
      if (!seen[g.id]) { seen[g.id] = 1; out.push(g); }
      pool.splice(i, 1);
    }
    return out;
  }
  function fillRelated(currentId) {
    var gallery = document.getElementById('imageGallery');
    if (!gallery) return;
    var picks = pickRelated(currentId);
    if (picks.length < 3) { gallery.classList.remove('visible'); return; }
    var big = document.getElementById('bigGame');
    var bigImg = document.getElementById('bigGameImg');
    var bigTitle = document.getElementById('bigTitle');
    big.href = '#/play/' + picks[0].id;
    bigImg.src = picks[0].thumb;
    bigImg.alt = picks[0].title;
    bigTitle.textContent = picks[0].title;
    [['smallGame1','smallGame1Img','smTitle1',picks[1]],['smallGame2','smallGame2Img','smTitle2',picks[2]]].forEach(function (p) {
      var a = document.getElementById(p[0]);
      var im = document.getElementById(p[1]);
      var ti = document.getElementById(p[2]);
      a.href = '#/play/' + p[3].id;
      im.src = p[3].thumb;
      im.alt = p[3].title;
      ti.textContent = p[3].title;
    });
    gallery.classList.add('visible');
  }

  async function loadGame(g) {
    var ttl = document.getElementById('playTitle');
    var ico = document.getElementById('cntIcon');
    var url = document.getElementById('urlDisplay');
    if (ttl) ttl.textContent = g.title;
    if (ico && g.thumb) ico.src = g.thumb;
    if (url) url.textContent = location.origin;
    pushRecent(g.id);
    scaleSidePanels();
    fillRelated(g.id);

    var iframe = document.getElementById('gameFrame');
    var loading = document.getElementById('loadingOverlay');
    if (loading) loading.classList.remove('hidden');
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }

    try {
      var r = await fetch(g.jsdelivrUrl + '?cb=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var html = await r.text();
      if (g.cdnBase && !/<base[\s>]/i.test(html)) {
        var baseTag = '<base href="' + g.cdnBase + '">';
        if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1>' + baseTag);
        else html = baseTag + html;
      }
      var inject = '<style id="vn-strip">' +
        'button[aria-label*="ullscreen" i],button[title*="ullscreen" i],' +
        'button.fullscreen,button.fullscreen-btn,button.fs-btn,button.fullscreenBtn,' +
        'button.fullscreenButton,button.fullscreen-button,button.fullscreen-toggle,' +
        'button[onclick*="ullscreen"],button[onclick*="screenfulRequest"],' +
        'button.cordialfullscreen,button.fullscreenIcon,button.gd-fullscreen-button,' +
        'button.crazy-fullscreen,#sidebarad1,#sidebarad2,#sidebar-ad-1,#sidebar-ad-2,' +
        '.sidebar-ad,.ads-side,.gameTitleBar,.cm-titlebar' +
        '{display:none !important;}' +
        '</style>';
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1>' + inject);
      else html = inject + html;
      iframe.removeAttribute('src');
      iframe.srcdoc = html;
      iframe.onload = function () { if (loading) loading.classList.add('hidden'); };
      setTimeout(function () { if (loading) loading.classList.add('hidden'); }, 8000);
    } catch (e) {
      if (loading) loading.classList.add('hidden');
      showError('Network error: ' + e.message);
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b) return;
    if (b.id === 'fullscreenBtn') {
      var c = document.getElementById('embedContainer');
      var p = c.requestFullscreen ? c.requestFullscreen() :
              c.webkitRequestFullscreen ? c.webkitRequestFullscreen() :
              c.mozRequestFullScreen ? c.mozRequestFullScreen() :
              c.msRequestFullscreen ? c.msRequestFullscreen() : null;
      if (p && p.catch) p.catch(function () {});
    } else if (b.id === 'refreshBtn') {
      var f = document.getElementById('gameFrame');
      var doc = f.getAttribute('srcdoc');
      if (doc) { f.removeAttribute('srcdoc'); setTimeout(function () { f.srcdoc = doc; }, 50); }
      else if (f.src) { var cur = f.src; f.src = 'about:blank'; setTimeout(function () { f.src = cur; }, 50); }
    }
  });

  var VS = ['Browse', 'Play', 'Dmca', 'Privacy'];
  function show(name) {
    VS.forEach(function (v) { var el = document.getElementById('view' + v); if (el) el.hidden = (v !== name); });
    document.querySelectorAll('header nav a').forEach(function (a) { a.classList.remove('active'); });
    var sel = name === 'Browse' ? 'home' : name.toLowerCase();
    var n = document.querySelector('nav a[data-route="' + sel + '"]');
    if (n) n.classList.add('active');
  }
  function setMode(m) {
    document.body.classList.toggle('mode-play', m === 'play');
    var f = document.querySelector('.site-footer');
    if (f) f.style.display = m === 'play' ? 'none' : '';
  }

  function route() {
    var h = location.hash || '#/';
    var m = h.match(/^#\/play\/(\d+)/);
    if (m) {
      var id = +m[1];
      var g = GAMES.find(function (x) { return x.id === id; });
      if (!g) { show('Browse'); setMode('browse'); return; }
      show('Play'); setMode('play'); loadGame(g); return;
    }
    setMode('browse');
    if (h.indexOf('#/dmca')    === 0) { show('Dmca');    return; }
    if (h.indexOf('#/privacy') === 0) { show('Privacy'); return; }
    show('Browse');
    var fr = document.getElementById('gameFrame');
    if (fr) { fr.removeAttribute('srcdoc'); fr.src = 'about:blank'; }
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
    var gallery = document.getElementById('imageGallery');
    if (gallery) gallery.classList.remove('visible');
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', scaleSidePanels);

  async function fetchManifest() {
    var hash = null;
    try {
      var meta = await fetch('https://data.jsdelivr.com/v1/packages/gh/ixl-math-learning/ixl-assets@main', { cache: 'no-store' });
      var d = await meta.json();
      hash = d && d.version;
    } catch (e) {}
    var base = hash
      ? 'https://cdn.jsdelivr.net/gh/ixl-math-learning/ixl-assets@' + hash + '/site'
      : (window.VNL_CDN || '.');
    var r = await fetch(base + '/games.json', { cache: 'no-store' });
    return r.json();
  }

  async function init() {
    try {
      GAMES = await fetchManifest();
    } catch (e) {
      document.getElementById('content').innerHTML =
        '<div class="empty">Failed to load games.json. Try refreshing.</div>';
      return;
    }
    var cs = new Set();
    GAMES.forEach(function (g) { (g.category || []).forEach(function (c) { cs.add(c); }); });
    CATS = [].concat([...cs]).sort();
    buildCats();
    document.getElementById('searchInput').addEventListener('input', function (e) {
      st.q = e.target.value;
      if (!location.hash || location.hash === '#/') paint();
      else location.hash = '#/';
    });
    paint();
    route();
    mountSticky();
    mountSideRails();
    if (IN_EDITOR) {
      var inlineAds = document.querySelectorAll('.ad-banner-top, .sp-container, .ad-sticky, .ad-side-rail, .ad-row');
      for (var i = 0; i < inlineAds.length; i++) inlineAds[i].style.display = 'none';
    }
    scaleSidePanels();

    document.addEventListener('click', function armOnce(e){
      if (document.body.classList.contains('mode-play')) return;
      armPopunder();
      document.removeEventListener('click', armOnce, true);
    }, true);
  }

  init();
})();
