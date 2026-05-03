(function () {
  var LS = { fav: 'vnl.favs', rec: 'vnl.recent', cat: 'vnl.cat' };
  var RECENT_MAX = 24;

  function rd(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var DETECTED_PATTERN = (function () {
    try {
      var h = location.host;
      if (/cdn\.statically\.io/i.test(h))         return 'https://cdn.statically.io/gh/{user}/{repo}/{tag}/{rest}';
      if (/fastly\.jsdelivr\.net/i.test(h))       return 'https://fastly.jsdelivr.net/gh/{user}/{repo}@{tag}/{rest}';
      if (/rawcdn\.githack\.com/i.test(h))        return 'https://rawcdn.githack.com/{user}/{repo}/{tag}/{rest}';
      if (/raw\.githubusercontent\.com/i.test(h)) return 'https://raw.githubusercontent.com/{user}/{repo}/{tag}/{rest}';
    } catch (e) {}
    return null;
  })();
  function rewriteUrl(url) {
    if (!url) return url;
    var pat = window.VNL_REWRITE_PATTERN || DETECTED_PATTERN;
    if (!pat) return url;
    return url.replace(
      /^https:\/\/cdn\.jsdelivr\.net\/gh\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)@([A-Za-z0-9_.-]+)\/(.*)$/,
      function (_, u, r, t, rest) {
        return pat.replace('{user}', u).replace('{repo}', r).replace('{tag}', t).replace('{rest}', rest);
      }
    );
  }

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
    img.src = rewriteUrl(g.thumb);
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
      if (!SUPPRESS_ALL_ADS) {
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
  var IN_IFRAME = (function () { try { return window.top !== window.self; } catch (e) { return true; } })();
  var TOP_BLOCKED = (function () { try { void window.top.location.href; return false; } catch (e) { return true; } })();
  var IN_EDITOR = (function () {
    try {
      var qs = (location.search || '') + (location.hash || '');
      if (/[?&#](preview|edit|editor)=1\b/i.test(qs)) return true;
      var ref = document.referrer || '';
      if (/(sites|docs)\.google\.com.*\/(edit|d\/)/i.test(ref)) return true;
      if (!TOP_BLOCKED && IN_IFRAME) {
        if (/\/edit\b/i.test(window.top.location.href)) return true;
      }
    } catch (e) {}
    return false;
  })();
  var SUPPRESS_POPUNDER = IN_EDITOR;
  var SUPPRESS_ALL_ADS = IN_EDITOR;
  window.addEventListener('error', function (e) {
    var src = e && e.filename || '';
    if (/highperformanceformat|profitablecpmratenetwork|researchingsweatexit/i.test(src)) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
  }, true);

  function showError(msg) {
    var w = document.querySelector('#viewPlay .embed-container');
    if (!w) return;
    w.innerHTML = '<div class="play-error"><h2>Couldn\'t load this game</h2><p>' + msg + '</p><p><a href="#/">Back to all games</a></p></div>';
  }

  function armPopunder() {
    if (popArmed || SUPPRESS_POPUNDER) return;
    popArmed = true;
    try {
      var s1 = document.createElement('script');
      s1.async = true;
      s1.src = 'https://researchingsweatexit.com/1f/d8/42/1fd842e6dd4ea983a8427ab669c19fb1.js';
      s1.onerror = function () {};
      document.head.appendChild(s1);
      var s2 = document.createElement('script');
      s2.async = true;
      s2.src = 'https://pl29120646.profitablecpmratenetwork.com/88/07/0b/88070babdbb1232d86b1367690d76975.js';
      s2.onerror = function () {};
      document.head.appendChild(s2);
    } catch (e) {}
  }

  function mountSticky() {
    if (stickyMounted || SUPPRESS_ALL_ADS) return;
    stickyMounted = true;
    try {
      var d = document.createElement('div');
      d.className = 'ad-sticky';
      d.appendChild(banner(window.innerWidth < 740 ? '320x50' : '728x90'));
      document.body.appendChild(d);
    } catch (e) {}
  }

  function mountSideRails() {
    if (sideMounted || SUPPRESS_ALL_ADS) return;
    sideMounted = true;
    if (window.innerWidth < 1400) return;
    try {
      ['left', 'right'].forEach(function (s) {
        var w = document.createElement('div');
        w.className = 'ad-side-rail ' + s;
        w.appendChild(banner('160x600'));
        document.body.appendChild(w);
      });
    } catch (e) {}
  }

  function mountStaticBanners() {
    if (SUPPRESS_ALL_ADS) return;
    try {
      var top = document.getElementById('adBannerTop');
      if (top && !top.firstChild) top.appendChild(banner('728x90'));
      var sp = document.getElementById('spInner');
      if (sp && !sp.firstChild) sp.appendChild(banner('300x250'));
    } catch (e) {}
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
    if (ico && g.thumb) ico.src = rewriteUrl(g.thumb);
    if (url) url.textContent = location.origin;
    pushRecent(g.id);
    scaleSidePanels();
    fillRelated(g.id);

    var iframe = document.getElementById('gameFrame');
    var loading = document.getElementById('loadingOverlay');
    if (loading) loading.classList.remove('hidden');
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }

    try {
      var gameUrl = rewriteUrl(g.jsdelivrUrl);
      var r = await fetch(gameUrl + '?cb=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var html = await r.text();
      var pat = window.VNL_REWRITE_PATTERN || DETECTED_PATTERN;
      if (pat) {
        html = html.replace(
          /https:\/\/cdn\.jsdelivr\.net\/gh\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)@([A-Za-z0-9_.-]+)\/([^"'<>) ]+)/g,
          function (_, u, repo, t, rest) {
            return pat.replace('{user}', u).replace('{repo}', repo).replace('{tag}', t).replace('{rest}', rest);
          }
        );
      }
      var autoBase = gameUrl.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
      var effectiveBase = g.cdnBase || autoBase;
      if (effectiveBase && !/<base[\s>]/i.test(html)) {
        var baseTag = '<base href="' + effectiveBase + '">';
        if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1>' + baseTag);
        else html = baseTag + html;
      }
      var stripSels =
        'button[aria-label*="ullscreen" i],button[title*="ullscreen" i],' +
        'button.fullscreen,button.fullscreen-btn,button.fs-btn,button.fullscreenBtn,' +
        'button.fullscreenButton,button.fullscreen-button,button.fullscreen-toggle,' +
        'button[onclick*="ullscreen"],button[onclick*="screenfulRequest"],' +
        'button.cordialfullscreen,button.fullscreenIcon,button.gd-fullscreen-button,' +
        'button.crazy-fullscreen,#sidebarad1,#sidebarad2,#sidebar-ad-1,#sidebar-ad-2,' +
        '.sidebar-ad,.ads-side,.gameTitleBar,.cm-titlebar,' +
        '#dialog-wrapper,#dialog_wrapper,#sound-on-confirmation-dialog,' +
        '#close_confirmation_dialog,#close-confirmation-dialog,' +
        '#reward_close_button_widget,#reward-close-button-widget,' +
        '#ad_position_box,#ad-position-box,#ad_iframe_container,#card,#creative,' +
        '#count_down_container,#count-down-container,' +
        '#close_video_button,#resume_video_button,' +
        '#cancel-video-button,#continue-video-button,' +
        'iframe[id="ad_iframe"],iframe[name="ad_iframe"],' +
        'iframe[id^="ad_"],iframe[name^="google_ads"],' +
        '[id^="google_ads_iframe"],[id^="aswift_"],[class*="GoogleActiveView"],' +
        '[data-google-av-cxn],[data-google-av-adk],[data-ad-slot],[data-ad-client],' +
        '[data-magicword],[data-jc],' +
        'ins.adsbygoogle,.adsbygoogle,' +
        '.skip-button,.ad-overlay,.ad-container,.ad-banner,#ad-container,#ad-banner,' +
        '[id*="advert" i],[id*="adsense" i],[class*="adsense" i],' +
        'div[id^="ad-"],div[class^="ad-"],div[id*="-ad-"],' +
        '.VLoccc,.K5Zlne,.QDWEj,.U8eYrb';
      var stripJs =
        '<script>(function(){try{' +
          'var SELS=' + JSON.stringify(stripSels) + ';' +
          'function nuke(){try{document.querySelectorAll(SELS).forEach(function(n){try{n.parentNode&&n.parentNode.removeChild(n);}catch(e){}});}catch(e){}}' +
          'function fixFrame(f){try{var s=f.getAttribute("src");if(!s||/^(?:about:|data:|blob:|javascript:|#)/.test(s))return;if(f._vnlFixed)return;f._vnlFixed=true;var u;try{u=new URL(s,document.baseURI||location.href).href;}catch(e){return;}fetch(u).then(function(r){return r.ok?r.text():null;}).then(function(h){if(h==null)return;try{f.removeAttribute("src");f.srcdoc=h;}catch(e){}}).catch(function(){});}catch(e){}}' +
          'function fixAllFrames(){try{document.querySelectorAll("iframe[src]").forEach(fixFrame);}catch(e){}}' +
          'var BAD=/googlesyndication\\.com|doubleclick\\.net|googleads\\.g\\.doubleclick|google-analytics\\.com|googletagmanager\\.com|adservice\\.google|adsbygoogle|pagead2|adinplay\\.com|adsby|adnxs|amazon-adsystem|criteo|outbrain|taboola|mochiads\\.com|mochibot\\.com|mochi\\.com|mochimedia/i;' +
          'function isBad(u){try{return BAD.test(String(u||""));}catch(e){return false;}}' +
          'var op=Element.prototype.appendChild;Element.prototype.appendChild=function(c){try{if(c&&(c.tagName==="SCRIPT"||c.tagName==="IFRAME")&&c.src&&isBad(c.src))return c;}catch(e){}return op.call(this,c);};' +
          'var oi=Element.prototype.insertBefore;Element.prototype.insertBefore=function(c,r){try{if(c&&(c.tagName==="SCRIPT"||c.tagName==="IFRAME")&&c.src&&isBad(c.src))return c;}catch(e){}return oi.call(this,c,r);};' +
          'try{var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){try{if((n==="src"||n==="href")&&isBad(v)){return;}}catch(e){}return sa.call(this,n,v);};}catch(e){}' +
          'try{var XO=window.XMLHttpRequest&&window.XMLHttpRequest.prototype.open;if(XO){window.XMLHttpRequest.prototype.open=function(m,u){if(isBad(u)){this._vnl_blocked=true;return XO.call(this,m,"about:blank");}return XO.apply(this,arguments);};}}catch(e){}' +
          'try{var OF=window.fetch;if(OF){window.fetch=function(req,init){var u=req&&req.url||req;if(isBad(u))return Promise.reject(new Error("blocked"));return OF.apply(this,arguments);};}}catch(e){}' +
          'nuke();fixAllFrames();' +
          'if(window.MutationObserver){try{new MutationObserver(function(){nuke();fixAllFrames();}).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}}' +
          'setInterval(function(){nuke();fixAllFrames();},1500);' +
        '}catch(e){}})();<\/script>';
      var fallbackCss = '<style id="vn-base">html,body{margin:0;padding:0;height:100%;min-height:100vh;background:#000;color:#fff;font-family:system-ui,sans-serif}body>embed,body>object,body>iframe,body>canvas{width:100% !important;height:100% !important;display:block}embed[src*=".swf"],object[data*=".swf"]{width:100% !important;height:100% !important;min-height:100vh}ruffle-object,ruffle-embed,ruffle-player{width:100% !important;height:100% !important;display:block}</style>';
      var inject = fallbackCss + '<style id="vn-strip">' + stripSels + '{display:none !important;visibility:hidden !important;pointer-events:none !important;width:0 !important;height:0 !important;}</style>' + stripJs;
      var realUrl = gameUrl.replace(/[?#].*$/, '');
      var urlPolyfill = '<script>(function(){var R=' + JSON.stringify(realUrl) + ';' +
        'try{Object.defineProperty(document,"URL",{get:function(){return R;},configurable:true});}catch(e){}' +
        'try{Object.defineProperty(document,"documentURI",{get:function(){return R;},configurable:true});}catch(e){}' +
        'try{Object.defineProperty(window.location,"href",{get:function(){return R;},set:function(v){try{window.parent.postMessage({type:"vnl-nav",href:v},"*");}catch(e){}},configurable:true});}catch(e){}' +
        '})();<\/script>';
      var combined = urlPolyfill + inject;
      function injectIntoHead(h, content) {
        if (/<head[^>]*>/i.test(h)) return h.replace(/<head([^>]*)>/i, '<head$1>' + content);
        if (/<html[^>]*>/i.test(h)) return h.replace(/<html([^>]*)>/i, '<html$1><head>' + content + '</head>');
        if (/<!doctype[^>]*>/i.test(h)) return h.replace(/<!doctype[^>]*>/i, function (m) { return m + '<html><head>' + content + '</head>'; });
        return '<!doctype html><html><head>' + content + '</head>' + h;
      }
      html = injectIntoHead(html, combined);
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
      function applyPseudo() {
        c.classList.toggle('vnl-pseudo-fs');
        document.body.classList.toggle('vnl-pseudo-fs-active');
      }
      var fsApi = c.requestFullscreen || c.webkitRequestFullscreen || c.mozRequestFullScreen || c.msRequestFullscreen;
      if (fsApi) {
        try {
          var p = fsApi.call(c);
          if (p && p.catch) p.catch(function () { applyPseudo(); });
        } catch (e) { applyPseudo(); }
      } else {
        applyPseudo();
      }
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

  function deriveBaseFromLocation() {
    try {
      var u = new URL(location.href);
      var h = u.host;
      if (!/cdn\.statically\.io|fastly\.jsdelivr\.net|cdn\.jsdelivr\.net|rawcdn\.githack\.com|raw\.githubusercontent\.com|gitcdn\.link/i.test(h)) return null;
      var m = u.pathname.match(/^(.*\/site)(?:\/|$)/);
      if (m) return u.origin + m[1];
    } catch (e) {}
    return null;
  }
  function resolveBase() {
    var derived = deriveBaseFromLocation();
    if (derived) return derived;
    if (window.VNL_CDN) return window.VNL_CDN;
    return 'https://cdn.jsdelivr.net/gh/ixl-math-learning/ixl-assets@main/site';
  }
  async function fetchManifest() {
    var base = resolveBase();
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
    mountStaticBanners();
    mountSticky();
    mountSideRails();

    try {
      var v = window.VNL_TAG;
      if (!v) {
        var m = (window.VNL_CDN || '').match(/@([^/]+)\/site/);
        v = m ? m[1] : 'main';
      }
      var badge = document.createElement('div');
      badge.id = 'vnl-version';
      badge.textContent = 'v' + v;
      badge.style.cssText = 'position:fixed;top:.45rem;right:.55rem;z-index:99;background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);font:11px ui-monospace,SFMono-Regular,Menlo,monospace;padding:2px 8px;border-radius:4px;pointer-events:none;letter-spacing:.3px;';
      document.body.appendChild(badge);
    } catch (e) {}
    if (SUPPRESS_ALL_ADS) {
      var inlineAds = document.querySelectorAll('.ad-banner-top, .sp-container, .ad-sticky, .ad-side-rail, .ad-row');
      for (var i = 0; i < inlineAds.length; i++) inlineAds[i].style.display = 'none';
    }
    scaleSidePanels();

    if (!SUPPRESS_POPUNDER) armPopunder();
  }

  init();
})();
