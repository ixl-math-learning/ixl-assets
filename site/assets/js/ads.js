// Void Network Lite — ad code helpers (codes from ad-codes.txt)

const AD = {
  popunder:  'https://pl29120638.profitablecpmratenetwork.com/8f/fd/51/8ffd5148e5028e9b0ee3262230fa41fe.js',
  socialBar: 'https://pl29120646.profitablecpmratenetwork.com/88/07/0b/88070babdbb1232d86b1367690d76975.js',
  banners: {
    '468x60':  '42a42273d6bbea160a4ccc3ca8196102',
    '300x250': '9761ebbef2d249e513184c2ab69ef7f7',
    '160x300': 'b5de3f0d0644e59a31b20b36ff5f3665',
    '160x600': '2ac1c6c752977adc4b48460d3431a849',
    '320x50':  '66d51b026d1791296c2f405dc7c88e7d',
    '728x90':  'bb49d3eb30b6f59a5b1d34cff5e4678a',
  },
};

// Each banner uses a global `atOptions` that gets overwritten between
// instances, so we have to isolate every placement in its own iframe (srcdoc).
function bannerIframe(size) {
  const [w, h] = size.split('x').map(Number);
  const key = AD.banners[size];
  if (!key) return null;
  const f = document.createElement('iframe');
  f.scrolling = 'no';
  f.frameBorder = '0';
  f.width = w;
  f.height = h;
  f.style.border = '0';
  f.style.display = 'block';
  f.style.background = 'transparent';
  f.loading = 'lazy';
  f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>
<script>atOptions={'key':'${key}','format':'iframe','height':${h},'width':${w},'params':{}};<\/script>
<script src="https://www.highperformanceformat.com/${key}/invoke.js"><\/script>
</body></html>`;
  return f;
}

function placeBanner(target, size, opts = {}) {
  if (!target) return;
  const wrap = document.createElement('div');
  wrap.className = 'ad-slot';
  if (opts.label !== false) {
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:9px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;text-align:center';
    lbl.textContent = 'advertisement';
    wrap.appendChild(lbl);
  }
  const f = bannerIframe(size);
  if (f) wrap.appendChild(f);
  target.appendChild(wrap);
}

// Inject popunder + social bar into the head once per page-load
function loadGlobalAds() {
  if (window.__vnAdsLoaded) return;
  window.__vnAdsLoaded = true;
  const s1 = document.createElement('script');
  s1.async = true;
  s1.src = AD.popunder;
  document.head.appendChild(s1);
  const s2 = document.createElement('script');
  s2.async = true;
  s2.src = AD.socialBar;
  document.head.appendChild(s2);
}

// Side rail — desktop only, dismissible
function placeSideRails() {
  if (window.innerWidth < 1400) return;
  ['left', 'right'].forEach((side) => {
    if (document.querySelector('.ad-side.' + side)) return;
    const w = document.createElement('div');
    w.className = 'ad-side ' + side;
    const close = document.createElement('button');
    close.className = 'ad-side-close';
    close.textContent = 'close ✕';
    close.onclick = () => w.remove();
    w.appendChild(close);
    const f = bannerIframe('160x600');
    if (f) w.appendChild(f);
    document.body.appendChild(w);
  });
}

// Sticky footer banner (responsive size)
function placeStickyFooter() {
  if (document.querySelector('.ad-sticky-footer')) return;
  const w = document.createElement('div');
  w.className = 'ad-sticky-footer';
  const size = window.innerWidth < 740 ? '320x50' : '728x90';
  const f = bannerIframe(size);
  if (f) w.appendChild(f);
  document.body.appendChild(w);
}

window.AD = AD;
window.placeBanner = placeBanner;
window.loadGlobalAds = loadGlobalAds;
window.placeSideRails = placeSideRails;
window.placeStickyFooter = placeStickyFooter;
