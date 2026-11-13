/* Meniul de sus, meniul de pe telefon, subsolul, lightbox-ul si lucruri mici folosite pe toate paginile */
(() => {
const S = window.SITE;
const page = document.body.dataset.page || '';

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function resetPageScroll() {
  if (!location.hash) window.scrollTo(0, 0);
}
resetPageScroll();
window.addEventListener('pageshow', resetPageScroll);
window.addEventListener('hashchange', resetPageScroll);
// html.scrolled = pagina nu mai e sus de tot (meniul de sus primeste fundal, vezi site.css)
const markScrolled = () => document.documentElement.classList.toggle('scrolled', window.scrollY > 12);
window.addEventListener('scroll', markScrolled, { passive: true });
markScrolled();

/* ---------- iconite ---------- */
const I = {
  arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ext: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3.5A.5.5 0 0 0 3 3.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10M9 3h4v4M13 3L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11L13.5 8z" fill="currentColor"/></svg>',
  photo: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="10" r="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  video: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5s4.5-4.2 4.5-7.8a4.5 4.5 0 0 0-9 0c0 3.6 4.5 7.8 4.5 7.8z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6.6" r="1.6" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 4.5L8 9l5.5-4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  insta: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11.4" cy="4.6" r=".8" fill="currentColor"/></svg>',
};

/* ---------- steagul UE ---------- */
// rotund (in meniu): acelasi desen ca la finalul animatiei de pe prima pagina
function starPath(x, y, R) {
  const r = R * 0.382; let d = `M${x.toFixed(2)} ${(y - R).toFixed(2)}`;
  for (let i = 1; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
    d += `L${(x + rr * Math.cos(a)).toFixed(2)} ${(y + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}
function euDisc() {
  const R = 50 / 1.389; let d = '';
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6; d += starPath(R * Math.cos(a), R * Math.sin(a), R / 6); }
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="50" fill="#003399"/><path d="${d}" fill="#FFCC00"/></svg>`;
}
// dreptunghiular (emblema oficiala din subsol)
function euRect() {
  let d = '';
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6; d += starPath(405 + 180 * Math.cos(a), 270 + 180 * Math.sin(a), 30); }
  return `<svg viewBox="0 0 810 540" role="img" aria-label="Flag of the European Union"><rect width="810" height="540" fill="#003399"/><path d="${d}" fill="#FFCC00"/></svg>`;
}

/* ---------- texte: [ ... ] apar colorate, ca sa se vada ce mai e de completat ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tx = s => esc(s).replace(/\[[^\]]+\]/g, m => `<span class="ph-txt">${m}</span>`);
const hash = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/* ---------- poza / video sau locul gol pentru ele ---------- */
function tile(m, cls = '') {
  const h = hash(m.caption + m.stop);
  const label = m.type === 'video' ? 'Video' : 'Photo';
  if (m.src && m.type === 'photo') return `<div class="media ${cls}"><img src="${esc(m.src)}" alt="${esc(m.caption)}" loading="lazy" decoding="async"></div>`;
  if (m.src && m.type === 'video') return `<div class="media ${cls}"><video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} muted playsinline preload="metadata"></video><span class="play-badge">${I.play}</span></div>`;
  return `<div class="ph ${cls}" style="--px:${15 + h % 70}%;--py:${5 + (h >> 7) % 50}%">${m.type === 'video' ? I.video : I.photo}<span>${esc(label)} · ${esc(m.place || '')}</span>${m.embed ? `<span class="play-badge">${I.play}</span>` : ''}</div>`;
}

/* ---------- meniul ---------- */
const LINKS = [
  ['about', 'About', 'about.html'], ['partners', 'Partners', 'partners.html'], ['journey', 'Journey', 'journey.html'],
  ['journal', 'Journal', 'journal.html'], ['gallery', 'Gallery', 'gallery.html'], ['contact', 'Contact', 'contact.html'],
];
const cur = id => (id === page ? ' aria-current="page"' : '');
const lnk = ([id, t, href]) => `<a class="lnk" href="${href}"${cur(id)}>${t}</a>`;
const sectionPage = LINKS.some(([id]) => id === page);
const sectionLink = ([id, title, href]) => `<a class="section-link" href="${href}"${cur(id)} style="view-transition-name:menu-${id}"><span>${title}</span></a>`;
const sectionNav = `
<header class="section-nav" id="section-nav"${page === 'home' ? ' inert' : ''}>
  <nav aria-label="Main">
    ${LINKS.slice(0, 3).map(sectionLink).join('')}
    <a class="section-home" href="index.html" aria-label="Erasmus+ home">${euDisc()}</a>
    ${LINKS.slice(3).map(sectionLink).join('')}
  </nav>
</header>`;
document.body.insertAdjacentHTML('afterbegin', `
<a class="skip-link" href="#main">Skip to content</a>
${sectionNav}
<header class="nav" id="nav">
  <div class="nav-glass glass"></div>
  <nav class="nav-in" aria-label="Main">
    <div class="nav-side l" id="navL">
      <a class="brand" href="index.html" aria-label="Erasmus+ home">Erasmus<b>+</b></a>
      ${LINKS.slice(0, 3).map(lnk).join('')}
    </div>
    <a class="flag" id="flagslot" href="index.html" aria-label="Home"${page === 'home' ? ' aria-current="page"' : ''}>${euDisc()}</a>
    <div class="nav-side r" id="navR">
      ${LINKS.slice(3).map(lnk).join('')}
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="sheet"><i></i>Menu</button>
    </div>
  </nav>
</header>
<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <button class="close" type="button" aria-label="Close menu">${I.x}</button>
  <nav aria-label="Menu">
    <a href="index.html"${cur('home')}><small>00</small>Home</a>
    ${LINKS.map(([id, t, href], i) => `<a href="${href}"${cur(id)} style="transition-delay:${0.04 * (i + 1)}s"><small>0${i + 1}</small>${t}</a>`).join('')}
  </nav>
  <div class="sheet-foot">${esc(S.project.name)}</div>
</div>`);

const sheet = document.getElementById('sheet'), menuBtn = document.querySelector('.menu-btn');
let lastFocus = null;
function menu(open) {
  if (open) { sheet.hidden = false; lastFocus = document.activeElement; requestAnimationFrame(() => requestAnimationFrame(() => { sheet.classList.add('open'); sheet.querySelector('.close').focus(); })); }
  else { sheet.classList.remove('open'); setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 320); }
  document.documentElement.classList.toggle('sheet-open', open);
  menuBtn.setAttribute('aria-expanded', open);
  if (!open && lastFocus) lastFocus.focus();
}
if (sheet) {
  menuBtn.addEventListener('click', () => menu(true));
  sheet.querySelector('.close').addEventListener('click', () => menu(false));
  document.addEventListener('keydown', e => {
    if (!sheet.classList.contains('open')) return;
    if (e.key === 'Escape') menu(false);
    if (e.key === 'Tab') {   // focusul ramane in meniu
      const f = [...sheet.querySelectorAll('a,button')]; const a = f[0], b = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    }
  });
  matchMedia('(min-width:901px)').addEventListener('change', e => { if (e.matches && sheet.classList.contains('open')) menu(false); });
}

/* ---------- subsolul ---------- */
{
  const P = S.project;
  const footHTML = `
<footer class="foot" id="footer">
  <div class="wrap">
    <div class="glass foot-card">
      <div class="foot-top">
        <div>
          <div class="eu">${euRect()}<b>Co-funded by<br>the European Union</b></div>
          <p class="disc">Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or ${tx(P.grantAuthority)}. Neither the European Union nor the granting authority can be held responsible for them.<br>Project code: ${tx(P.code)}</p>
        </div>
        <div><h4>Project</h4><ul>${LINKS.slice(0, 5).map(([, t, h]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>
        <div><h4>Legal</h4><ul><li><a href="legal.html#privacy">Privacy policy</a></li><li><a href="legal.html#photos">Photo consent</a></li><li><a href="legal.html#credits">Credits</a></li></ul></div>
        <div><h4>Follow</h4><ul><li><a href="contact.html">Contact</a></li></ul></div>
      </div>
      <div class="foot-schools">${S.schools.map(s => `<span class="tag">${esc(s.name)} · ${esc(s.country)}</span>`).join('')}</div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 · Made by the students of the website team</span>
      <a href="#top" id="toTop">Back to top ↑</a>
    </div>
  </div>
</footer>`;
  const fslot = document.getElementById('foot');
  if (fslot) fslot.outerHTML = footHTML; else document.body.insertAdjacentHTML('beforeend', footHTML);
  document.getElementById('toTop').addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
}

/* ---------- aparitie la scroll ---------- */
function reveal(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = reveal.io || (reveal.io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }));
  els.forEach(e => io.observe(e));
}

/* ---------- lightbox (poze si video pe tot ecranul) ---------- */
document.body.insertAdjacentHTML('beforeend', `
<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
  <span class="count" id="lbCount"></span>
  <div class="lb-stage" id="lbStage"></div>
  <p class="lb-cap glass" id="lbCap" aria-live="polite"></p>
  <button class="x glass" type="button" aria-label="Close">${I.x}</button>
  <button class="prev glass" type="button" aria-label="Previous">${I.prev}</button>
  <button class="next glass" type="button" aria-label="Next">${I.next}</button>
</div>`);
const lb = document.getElementById('lb'), lbStage = document.getElementById('lbStage');
let lbItems = [], lbI = 0, lbBack = null;
function lbShow(i) {
  lbI = (i + lbItems.length) % lbItems.length;
  const m = lbItems[lbI];
  let h;
  if (m.embed) h = `<iframe src="${esc(m.embed)}" allow="autoplay; fullscreen" allowfullscreen title="${esc(m.caption)}"></iframe>`;
  else if (m.src && m.type === 'video') h = `<video src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} controls autoplay playsinline></video>`;
  else if (m.src) h = `<img src="${esc(m.src)}" alt="${esc(m.caption)}">`;
  else h = tile(m);
  lbStage.innerHTML = h;
  document.getElementById('lbCap').innerHTML = tx(m.caption) + (m.city ? ` <span class="small">· ${esc(m.city)}</span>` : '');
  document.getElementById('lbCount').textContent = `${lbI + 1} / ${lbItems.length}`;
  lb.querySelector('.prev').hidden = lb.querySelector('.next').hidden = lbItems.length < 2;
}
function lbOpen(items, i) {
  lbItems = items; lbBack = document.activeElement;
  lb.hidden = false; lbShow(i);
  requestAnimationFrame(() => { lb.classList.add('open'); lb.querySelector('.x').focus(); });
  document.documentElement.classList.add('sheet-open');
}
function lbClose() {
  lb.classList.remove('open'); lbStage.innerHTML = '';
  document.documentElement.classList.remove('sheet-open');
  setTimeout(() => { if (!lb.classList.contains('open')) lb.hidden = true; }, 260);
  if (lbBack) lbBack.focus();
}
lb.querySelector('.x').addEventListener('click', lbClose);
lb.querySelector('.prev').addEventListener('click', () => lbShow(lbI - 1));
lb.querySelector('.next').addEventListener('click', () => lbShow(lbI + 1));
lb.addEventListener('click', e => { if (e.target === lb || e.target === lbStage) lbClose(); });
document.addEventListener('keydown', e => {
  if (lb.hidden || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') lbClose();
  else if (e.key === 'ArrowLeft') lbShow(lbI - 1);
  else if (e.key === 'ArrowRight') lbShow(lbI + 1);
  else if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button:not([hidden])')]; const k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
});
let sx = null;
lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) > 50) lbShow(lbI + (dx < 0 ? 1 : -1));
}, { passive: true });

/* ---------- selectoarele (.seg): pastila care aluneca intre optiuni ---------- */
// Selectorul ramane pe loc cand alegi altceva; se muta doar pastila din spatele optiunii alese (stilul e in site.css).
const segRO = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => segPill(e.target, false))) : null;
function segPill(seg, animate = true) {
  if (!seg) return;
  let pill = seg.querySelector(':scope > .seg-pill');
  const fresh = !pill;
  if (fresh) {
    pill = document.createElement('i'); pill.className = 'seg-pill'; pill.setAttribute('aria-hidden', 'true');
    seg.prepend(pill); seg.classList.add('has-pill'); segRO?.observe(seg);
  }
  const on = seg.querySelector('button[aria-pressed="true"],button[aria-selected="true"]');
  if (!on) { pill.style.opacity = 0; return; }
  const jump = fresh || !animate;   // prima asezare si redimensionarea: pe loc, fara alunecare
  if (jump) pill.style.transition = 'none';
  pill.style.opacity = 1;
  pill.style.width = on.offsetWidth + 'px'; pill.style.height = on.offsetHeight + 'px';
  pill.style.transform = `translate(${on.offsetLeft}px,${on.offsetTop}px)`;
  if (jump) { void pill.offsetWidth; pill.style.transition = ''; }
}
// marcheaza optiunea aleasa (attr = 'aria-pressed' sau 'aria-selected') si muta pastila la ea
function segSet(seg, attr, isOn) {
  if (!seg) return;
  seg.querySelectorAll('button').forEach(b => b.setAttribute(attr, !!isOn(b)));
  segPill(seg);
}

window.UI = { I, esc, tx, tile, euDisc, euRect, reveal, lightbox: lbOpen, hash, segPill, segSet,
  closeOverlays() { if (sheet?.classList.contains('open')) menu(false); if (!lb.hidden) lbClose(); },
};
document.addEventListener('DOMContentLoaded', () => reveal());
if (document.readyState !== 'loading') reveal();
})();
