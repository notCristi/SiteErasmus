/* Keep the video, menu and page controllers in one document, including on file://. */
(() => {
const html = document.documentElement;
// Culoarea zonelor pe care telefonul le deseneaza singur (sub ceas si sub bara cu adresa): negru pe iPhone, ca sa se
// continue cu marginea telefonului si cu Dynamic Island; albastrul site-ului in rest. Aceeasi culoare e si in site.css (--bar).
window.SITE_BAR = window.CSS?.supports?.('-webkit-touch-callout', 'none') ? '#000000' : '#0B1638';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const entryURL = new URL(location.href);
const directory = new URL('.', document.baseURI);
const local = location.protocol === 'file:';
let mountedURL, controller, homeMain, leaving = false, queuedPop = null;
const scriptLoads = new Map();
const templates = () => window.SITE_PAGES || {};
// Cloudflare Pages scoate ".html" din adresa (journey.html devine /journey): pagina e aceeasi.
const filename = url => { const name = url.pathname.split('/').pop() || 'index.html'; return !name.includes('.') && templates()[name + '.html'] ? name + '.html' : name; };

function currentURL() {
  const url = new URL(location.href);
  if (local) {
    const page = url.searchParams.get('_page');
    url.searchParams.delete('_page');
    if (page && templates()[page]) url.pathname = new URL(page, directory).pathname;
  }
  return url;
}
function address(url) {
  if (!local) return url.href;
  // File origins cannot rewrite the document path. A query keeps reload and Back valid.
  const shown = new URL(entryURL.href);
  shown.search = url.search; shown.hash = url.hash;
  if (url.pathname !== entryURL.pathname) shown.searchParams.set('_page', filename(url));
  else shown.searchParams.delete('_page');
  return shown.href;
}
function destination(href) {
  const url = new URL(href, document.baseURI);
  if (url.origin !== directory.origin || url.protocol !== directory.protocol ||
      new URL('.', url).pathname !== directory.pathname || !templates()[filename(url)]) return null;
  return url;
}
function routeKey(url) { return url.pathname + url.search; }
function rememberScroll() {
  if (!mountedURL || leaving || routeKey(currentURL()) !== routeKey(mountedURL)) return;
  history.replaceState({ ...history.state, siteScroll: [scrollX, scrollY] }, '', location.href);
}
function syncShell(page) {
  document.body.dataset.page = page;
  document.querySelector('link[href="assets/css/home.css"]').media = page === 'home' ? 'all' : 'not all';
  html.classList.remove('lock', 'opening-section', 'sheet-open');
  if (page !== 'home') {
    html.style.backgroundColor = window.SITE_BAR;
    document.querySelector('meta[name="theme-color"]').content = window.SITE_BAR;
  }
  document.getElementById('section-nav').inert = page === 'home';
  // On the way back to Home the current label stays marked: HomeController flies the labels down, then clears it.
  if (page !== 'home') document.querySelectorAll('.section-link').forEach(link => {
    if (link.getAttribute('href') === page + '.html') link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  window.backgroundVideo?.setPage(page);
}
function loadScript(src) {
  if (!scriptLoads.has(src)) scriptLoads.set(src, new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve;
    script.onerror = () => { scriptLoads.delete(src); script.remove(); reject(new Error('Cannot load ' + src)); };
    document.body.appendChild(script);
  }));
  return scriptLoads.get(src);
}
async function initPage(page) {
  controller = new AbortController();
  if (page === 'home') {
    if (!window.HomeController) {
      // Home's scripts are not loaded yet: keep its raw markup out of sight until they are.
      const main = document.getElementById('main');
      main.style.visibility = 'hidden';
      window.ERASMUS_SKIP_INTRO = true;
      html.classList.add('skip-intro');
      if (!document.getElementById('cream')) document.body.insertAdjacentHTML('beforeend', '<div class="cream" id="cream" aria-hidden="true"></div>');
      if (local && !document.querySelector('link[href="assets/css/fonts-home-file.css"]')) {
        const fonts = document.createElement('link'); fonts.rel = 'stylesheet'; fonts.href = 'assets/css/fonts-home-file.css'; document.head.appendChild(fonts);
      }
      try { for (const name of ['logo-data', 'logo-anim', 'home-seq', 'home']) await loadScript('assets/js/' + name + '.js'); }
      finally { main.style.visibility = ''; }
    }
    window.HomeController.resume();
  } else {
    window.PageControllers.content(controller.signal);
    if (page === 'journey') window.PageControllers.journey(controller.signal);
    if (page === 'upload') {   // pagina UPLOAD isi incarca programul doar cand e deschisa
      if (!window.PageControllers.upload) await loadScript('assets/js/upload.js');
      window.PageControllers.upload(controller.signal);
    }
  }
}
function position(url, saved) {
  if (saved) { scrollTo({ left: saved[0], top: saved[1], behavior: 'instant' }); return; }
  scrollTo({ left: 0, top: 0, behavior: 'instant' });
  if (!url.hash) return;
  let id; try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
  const target = document.body.dataset.page === 'journey' && window.SITE.mob(id.split('-')[0])
    ? document.getElementById('detail') : document.getElementById(id);
  target?.scrollIntoView({ behavior: 'instant' });
}
function animateMain(element, entering) {
  if (reduced.matches || !element?.animate) return Promise.resolve();
  return element.animate(entering
    ? [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }]
    : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }],
  { duration: entering ? 480 : 160, easing: entering ? 'cubic-bezier(.22,1,.36,1)' : 'ease', fill: 'none' }).finished.catch(() => {});
}
async function go(href, { fromHome = false, pop = false, saved = null } = {}) {
  const url = destination(href);
  if (!url) { location.assign(href); return; }
  if (leaving) { if (pop) queuedPop = { url, saved }; return; }
  if (mountedURL && currentURL().href === url.href && !pop) { position(url); return; }
  if (!pop) rememberScroll();
  leaving = true;
  try {
    const data = templates()[filename(url)];
    const oldMain = document.getElementById('main');
    window.UI.closeOverlays();
    // The background starts easing toward the destination's look now, while the old content leaves.
    window.backgroundVideo?.setPage(data.page);
    if (!fromHome) await animateMain(oldMain, false);
    if (queuedPop) return;
    if (!pop) history.pushState({ siteScroll: [0, 0] }, '', address(url));
    controller?.abort();
    window.UI.reveal.io?.disconnect();
    if (document.body.dataset.page === 'home') {
      homeMain = oldMain;
      window.HomeController?.suspend();
    }
    const template = document.createElement('template');
    template.innerHTML = data.main;
    const main = data.page === 'home' && homeMain ? homeMain : template.content.firstElementChild;
    oldMain.replaceWith(main);
    syncShell(data.page);
    document.title = data.title;
    document.querySelector('meta[name="description"]').content = data.description;
    mountedURL = url;
    await initPage(data.page);
    // Mark newly visible cards before starting the entrance, avoiding a second delayed fade.
    position(url, saved);
    main.querySelectorAll('[data-reveal]').forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) element.classList.add('in');
    });
    if (!pop) {
      const heading = [...main.querySelectorAll('h1')].find(h => !h.closest('[hidden]'));
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    await animateMain(main, true);
  } catch (error) {
    console.error('Page navigation failed; opening the standalone page.', error);
    location.assign(url.href);
  } finally {
    leaving = false;
    if (queuedPop) {
      const next = queuedPop; queuedPop = null;
      go(next.url.href, { pop: true, saved: next.saved });
    }
  }
}
window.SiteNavigation = { go, currentURL };

function linkDestination(event) {
  const link = event.target.closest?.('a[href]');
  if (!link || link.getAttribute('href').startsWith('#') || link.hasAttribute('download') ||
      (link.target && link.target !== '_self') || link.relList.contains('external')) return null;
  return destination(link.href);
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = linkDestination(event);
  if (!url || !mountedURL) return;
  event.preventDefault();
  go(url.href);
});
addEventListener('popstate', event => {
  const url = currentURL();
  if (!mountedURL) return;
  if (!leaving && routeKey(url) === routeKey(mountedURL)) {
    mountedURL = url; position(url, event.state?.siteScroll);
  } else go(url.href, { pop: true, saved: event.state?.siteScroll });
});
let scrollTimer;
addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(rememberScroll, 150); }, { passive: true });
addEventListener('pagehide', rememberScroll);
addEventListener('hashchange', () => { if (!leaving) mountedURL = currentURL(); });
document.addEventListener('DOMContentLoaded', async () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const url = currentURL();
  const data = templates()[filename(url)];
  if (!data) return;
  if (document.body.dataset.page === 'home') homeMain = document.getElementById('main');
  if (data.page !== document.body.dataset.page) { await go(url.href, { pop: true, saved: history.state?.siteScroll }); return; }
  mountedURL = url;
  controller = new AbortController();
  if (data.page !== 'home') {
    syncShell(data.page);
    window.PageControllers.content(controller.signal);
    if (data.page === 'journey') window.PageControllers.journey(controller.signal);
    if (data.page === 'upload') window.PageControllers.upload?.(controller.signal);
    position(url, history.state?.siteScroll);
  }
  history.replaceState({ ...history.state, siteScroll: [scrollX, scrollY] }, '', location.href);
});
})();
