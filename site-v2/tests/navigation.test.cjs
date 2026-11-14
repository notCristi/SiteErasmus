const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const read = name => readFileSync(path.join(root, name), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('Expected navigation did not finish');
}
async function setup(t, { file = 'journey.html', protocol = 'file:', query = '', reduced = false } = {}) {
  const errors = [], calls = { load: 0, play: 0, pause: 0 }, scripts = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  console.on('error', (...args) => errors.push(args.map(String).join(' ')));
  const source = read(file).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const url = (protocol === 'file:' ? 'file:///C:/site/' : 'https://example.test/site/') + file + query;
  const dom = new JSDOM(source, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window, d = w.document;
  // JSDOM 27 compares file URL path arrays by identity and rejects even the same URL.
  // Model the HTML standard's file rule (same path; query/fragment may change), while
  // keeping JSDOM's real history stack and traversal events for the routing tests.
  if (protocol === 'file:') for (const method of ['pushState', 'replaceState']) {
    const original = w.history[method].bind(w.history);
    w.history[method] = (state, title, href) => {
      const target = new URL(href || w.location.href, w.location.href);
      assert.equal(target.protocol, 'file:');
      assert.equal(target.pathname, w.location.pathname, 'Local routing must not rewrite the file path');
      original(state, title);
      dom.reconfigure({ url: target.href });
    };
  }
  t.after(() => { dom.window.close(); assert.deepEqual(errors, []); });
  w.matchMedia = () => ({ matches: reduced, addEventListener() {} });
  w.scrollTo = (options, y) => { w.scrollX = typeof options === 'object' ? options.left || 0 : options; w.scrollY = typeof options === 'object' ? options.top || 0 : y; };
  w.Element.prototype.scrollIntoView = function () { w.scrollY = this.id === 'detail' ? 1200 : 0; };
  w.Element.prototype.getAnimations = () => [];
  w.Element.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {} });
  const media = w.HTMLMediaElement.prototype;
  for (const [key, value] of Object.entries({ readyState: 3, duration: 30, seeking: false, paused: false })) Object.defineProperty(media, key, { get: () => value, configurable: true });
  media.load = () => calls.load++;
  media.play = () => { calls.play++; return Promise.resolve(); };
  media.pause = () => calls.pause++;
  w.DOMMatrixReadOnly = class { constructor() { this.d = 1; } };
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({
    measureText: () => ({ actualBoundingBoxLeft: 0, actualBoundingBoxRight: 20, actualBoundingBoxAscent: 20, actualBoundingBoxDescent: 0 }),
  }, { get: (obj, key) => key in obj ? obj[key] : () => {} });
  w.logoAnim = { ready: () => false, skip() {}, pause() {} };
  w.homeSeq = { stop() {}, pregateste() {} };
  w.ERASMUS_SKIP_INTRO = true;
  const evaluate = name => w.eval(read('assets/js/' + name + '.js') + '\n//# sourceURL=' + name + '.js');
  const append = d.body.appendChild.bind(d.body);
  d.body.appendChild = node => {
    const result = append(node);
    if (node.tagName === 'SCRIPT') {
      const name = node.src.split('/').pop().replace('.js', ''); scripts.push(name);
      if (name === 'home') evaluate(name);
      queueMicrotask(() => node.onload());
    }
    return result;
  };
  evaluate('page-templates'); evaluate('navigation');
  for (const name of ['data', 'layout', 'background-video', 'pages', 'europe', 'coast-dk', 'journey']) evaluate(name);
  if (file === 'index.html') evaluate('home');
  await tick(); await tick();
  const video = d.getElementById('bgv0'); video.currentTime = 12.25;
  return { w, d, video, calls, scripts, errors, go: href => w.SiteNavigation.go(href) };
}

test('all interior routes retain the exact video element, source and playback position', async t => {
  const app = await setup(t);
  const { d, video, calls } = app;
  const source = video.src, initialLoads = calls.load, initialPauses = calls.pause;
  const background = d.getElementById('bg'), nav = d.getElementById('section-nav');
  for (const page of ['about', 'partners', 'journey', 'journal', 'gallery', 'contact', 'legal', 'journey']) {
    const main = d.getElementById('main');
    await app.go(page + '.html');
    assert.equal(d.body.dataset.page, page);
    assert.notEqual(d.getElementById('main'), main);
    assert.equal(d.getElementById('bg'), background);
    assert.equal(d.getElementById('section-nav'), nav);
    assert.equal(d.getElementById('bgv0'), video);
    assert.equal(video.src, source);
    assert.equal(video.currentTime, 12.25);
  }
  assert.equal(calls.load, initialLoads);
  assert.equal(calls.pause, initialPauses);
  assert.equal(d.querySelectorAll('#bgv0').length, 1);
  assert.equal(d.querySelectorAll('#footer').length, 1);
});

test('file navigation uses reloadable query routes while HTTPS keeps page paths', async t => {
  for (const protocol of ['file:', 'https:']) {
    const app = await setup(t, { protocol });
    await app.go('about.html');
    assert.equal(app.w.SiteNavigation.currentURL().pathname, protocol === 'file:' ? '/C:/site/about.html' : '/site/about.html');
    if (protocol === 'file:') {
      assert.equal(app.w.location.pathname, '/C:/site/journey.html');
      assert.equal(app.w.location.search, '?_page=about.html');
    } else assert.equal(app.w.location.pathname, '/site/about.html');
  }
});

test('reloading a local routed address restores its page and deep link', async t => {
  const app = await setup(t, { file: 'about.html', query: '?_page=journey.html#dk' });
  await until(() => app.d.body.dataset.page === 'journey');
  assert.equal(app.d.querySelector('#mobTabs [aria-selected="true"]').dataset.mob, 'dk');
  assert.equal(app.w.scrollY, 1200);
});

test('normal Journey entry stays at top, explicit trip links still open detail', async t => {
  const app = await setup(t);
  await app.go('partners.html');
  await app.go('journey.html');
  assert.equal(app.w.scrollY, 0);
  assert.equal(app.w.location.hash, '');
  await app.go('partners.html');
  app.d.querySelector('a[href="journey.html#fr"]').click();
  await until(() => app.d.body.dataset.page === 'journey');
  assert.equal(app.w.location.hash, '#fr');
  assert.equal(app.w.scrollY, 1200);
  assert.equal(app.d.querySelector('#mobTabs [aria-selected="true"]').dataset.mob, 'fr');
});

test('Back and Forward restore route, scroll and controls without replacing video', async t => {
  const app = await setup(t);
  app.w.scrollTo(0, 450);
  await app.go('about.html');
  app.w.history.back();
  await until(() => app.d.body.dataset.page === 'journey');
  assert.equal(app.w.scrollY, 450);
  app.d.querySelector('#mobTabs [data-mob="dk"]').click();
  assert.equal(app.w.history.state.siteScroll[1], 450);
  app.w.history.forward();
  await until(() => app.d.body.dataset.page === 'about');
  assert.equal(app.d.getElementById('bgv0'), app.video);
});

test('Journey listeners are cleaned up and Journal routing works across repeated visits', async t => {
  const app = await setup(t);
  // Journal e gol pana urca elevii primul articol: testul isi pune unul
  if (!app.w.SITE.journal.length) app.w.SITE.journal.push({ id: 'test-entry', mob: 'ro', day: 'Monday', date: '16 Nov 2026', title: 'Test entry',
    excerpt: 'A test story.', author: '', min: '1', body: ['First paragraph.', 'Second paragraph.'] });
  for (let i = 0; i < 3; i++) {
    await app.go('journal.html');
    const article = app.d.querySelector('.entry');
    const title = article.querySelector('h3').textContent;
    article.click();
    await until(() => app.d.querySelector('.article'));
    assert.equal(app.d.querySelector('.article h1').textContent, title);
    await app.go('gallery.html');
    app.w.dispatchEvent(new app.w.Event('scroll'));
    app.w.dispatchEvent(new app.w.Event('resize'));
    await app.go('journey.html');
    assert.equal(app.d.querySelectorAll('#mobTabs button').length, 3);
  }
});

test('Home → section → Home reuses the home scene and keeps home scroll controls inactive elsewhere', async t => {
  const app = await setup(t, { file: 'index.html', reduced: true });
  const home = app.d.getElementById('main');
  await app.go('journey.html');
  const event = new app.w.WheelEvent('wheel', { deltaY: -100, cancelable: true });
  app.w.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(app.d.documentElement.classList.contains('lock'), false);
  await app.go('index.html');
  assert.equal(app.d.getElementById('main'), home);
  assert.equal(app.d.getElementById('bgv0'), app.video);
  assert.equal(app.d.querySelector('link[href="assets/css/home.css"]').media, 'all');
  await app.go('contact.html');
  assert.equal(app.d.querySelector('link[href="assets/css/home.css"]').media, 'not all');
});

test('opening Home from a direct section loads its controllers once and preserves video', async t => {
  const app = await setup(t, { reduced: true });
  await app.go('index.html');
  const home = app.d.getElementById('main');
  assert.ok(home.querySelector('#menu'));
  await app.go('contact.html');
  await app.go('index.html');
  assert.equal(app.d.getElementById('main'), home);
  assert.equal(app.scripts.filter(name => name === 'home').length, 1);
  assert.equal(app.d.getElementById('bgv0'), app.video);
});

test('modified clicks, downloads, external links and raw anchors remain native', async t => {
  const app = await setup(t);
  const link = app.d.querySelector('.section-link');
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const event = new app.w.MouseEvent('click', { bubbles: true, cancelable: true, ...options });
    // Suppress JSDOM's unimplemented actual navigation after checking our handler.
    let prevented; app.d.addEventListener('click', e => { prevented = e.defaultPrevented; e.preventDefault(); }, { once: true });
    link.dispatchEvent(event); assert.equal(prevented, false);
  }
  for (const [attribute, value] of [['target', '_blank'], ['download', 'file'], ['href', 'https://outside.test/about.html'], ['href', '#main']]) {
    const other = link.cloneNode(true); other.setAttribute(attribute, value); app.d.body.appendChild(other);
    let prevented; app.d.addEventListener('click', e => { prevented = e.defaultPrevented; e.preventDefault(); }, { once: true });
    other.click(); assert.equal(prevented, false); other.remove();
  }
});

test('every standalone page includes one copy of the route and controller assets', () => {
  for (const file of readdirSync(root).filter(name => name.endsWith('.html'))) {
    const html = read(file);
    for (const script of ['page-templates', 'navigation', 'data', 'layout', 'background-video', 'pages', 'europe', 'coast-dk', 'journey']) {
      assert.equal(html.split('src="assets/js/' + script + '.js"').length - 1, 1, file + ': ' + script);
    }
  }
});

test('hover expands only the pointed label, keeps it outlined and leaves Journey white', async t => {
  const app = await setup(t);
  // JSDOM has no pointer/layout. Turn the real CSS pseudo-state into a test class,
  // and select desktop/hover media rules, then use its CSS cascade implementation.
  const styles = app.d.createElement('style');
  styles.textContent = read('assets/css/site.css') + '\n' + read('assets/css/navigation.css');
  app.d.head.appendChild(styles);
  function desktop(rules) {
    return [...rules].flatMap(rule => {
      if (rule.type === 4) return /max-width|max-aspect-ratio|reduced-motion/.test(rule.conditionText) ? [] : desktop(rule.cssRules);
      return rule.type === 1 ? [rule.cssText] : [];
    });
  }
  const css = desktop(styles.sheet.cssRules).join('\n').replaceAll(':hover', '.test-hover').replaceAll(':focus-visible', '.test-focus');
  styles.remove();
  const activeStyles = app.d.createElement('style'); activeStyles.textContent = css; app.d.head.appendChild(activeStyles);
  const journey = app.d.querySelector('.section-link[href="journey.html"]');
  const about = app.d.querySelector('.section-link[href="about.html"]');
  const computed = element => app.w.getComputedStyle(element);
  assert.equal(computed(journey).flexGrow, '2.15');
  about.classList.add('test-hover');
  assert.equal(computed(about).flexGrow, '2.15');
  assert.equal(computed(journey).flexGrow, '1');
  assert.equal(computed(about.firstElementChild).color, 'rgba(0, 0, 0, 0)');
  assert.notEqual(computed(journey.firstElementChild).color, 'rgba(0, 0, 0, 0)');
  assert.notEqual(computed(about.firstElementChild).letterSpacing, computed(journey.firstElementChild).letterSpacing);
  about.classList.remove('test-hover');
  assert.equal(computed(journey).flexGrow, '2.15');
  about.classList.add('test-focus');
  assert.equal(computed(about).flexGrow, '2.15');
  assert.equal(computed(journey).flexGrow, '1');
});

test('Back during an outgoing animation supersedes the pending destination', async t => {
  const app = await setup(t);
  await app.go('about.html');
  let release;
  app.w.Element.prototype.animate = () => ({ finished: new Promise(resolve => { release = resolve; }) });
  const pending = app.go('partners.html');
  app.w.history.back();
  await until(() => app.w.SiteNavigation.currentURL().pathname.endsWith('/journey.html'));
  app.w.Element.prototype.animate = () => ({ finished: Promise.resolve() });
  release(); await pending;
  await until(() => app.d.body.dataset.page === 'journey');
  assert.equal(app.d.getElementById('bgv0'), app.video);
});
