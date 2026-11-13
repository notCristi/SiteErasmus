/* Prima pagina, un singur ecran in patru pasi:
     1. logoul animat
     2. un scroll: totul se strange in steagul UE, care urca sus; literele "Erasmus+" din logo raman si devin ERASMUS+ din contur
     3. inca un scroll: textul care se scrie singur (home-seq.js), o data pe sesiune
     4. coloanele (meniul). La click, titlurile urca in meniul paginii alese.
   Scroll in sus face pasii inapoi. */
(() => {
const $ = id => document.getElementById(id);
const html = document.documentElement;
const onHome = () => document.body.dataset.page === 'home';
const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = t => t * t * (3 - 2 * t);
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const overlayOpen = () => html.classList.contains('sheet-open');
const store = () => { try { sessionStorage.setItem('erasmus-intro', '1'); } catch (e) {} };
let textVazut = false;   // textul care se scrie singur apare o data pe sesiune
try { textVazut = sessionStorage.getItem('erasmus-text') === '1'; } catch (e) {}

/* ---------- elementele ---------- */
const hero = $('hero'), logoEl = $('logo'), fx = $('fx'), fctx = fx.getContext('2d');
const cream = $('cream'), heroTxt = $('heroTxt'), nav = $('nav'), slot = $('flagslot');
const hint = $('hint'), skipBtn = $('skip'), explore = $('explore'), dim = $('dim');
const megaIn = $('megaIn'), motto = $('motto'), colsFlag = $('colsFlag'), seqSkip = $('seqSkip');
const lit = [...megaIn.children];   // E R A S M U S +
lit.forEach(sp => { sp.dataset.ch = sp.textContent; sp.appendChild(document.createElement('i')); });
colsFlag.innerHTML = window.UI.euDisc();
const SEQ = window.homeSeq;
const W = 1536, H = 1024, DISC = 1.389;
const la = () => window.logoAnim;

// culoarea barelor din Safari: html pentru iOS 26, theme-color pentru iOS mai vechi
const themeMeta = document.querySelector('meta[name="theme-color"]');
let culoareBara = '';
function barColor(c) {
  if (c === culoareBara) return;
  culoareBara = c; html.style.backgroundColor = c; if (themeMeta) themeMeta.content = c;
}
barColor('#FCF9F2');

/* ---------- bucatile logoului ---------- */
let P = null;
function keyCream(image, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(image, 0, 0);
  const d = x.getImageData(0, 0, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const dr = a[i] - 252, dg = a[i + 1] - 249, db = a[i + 2] - 242;
    const k = (Math.sqrt(dr * dr + dg * dg + db * db) - 10) / 14;
    const al = k <= 0 ? 0 : k >= 1 ? 255 : k * 255;
    if (al < a[i + 3]) a[i + 3] = al;
  }
  x.putImageData(d, 0, 0);
  return { c, d };
}
function prepare() {
  const L = la(), img = L.img(), S = L.sprites, meta = L.meta;
  const stars = S.star;
  const cx = stars.reduce((s, t) => s + t.ax, 0) / stars.length;
  const cy = stars.reduce((s, t) => s + t.ay, 0) / stars.length;
  const ringR = stars.reduce((s, t) => s + Math.hypot(t.ax - cx, t.ay - cy), 0) / stars.length;
  const els = [], T = 64;
  const addTiles = (canvas, data, w, h, ox, oy) => {
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      const tw = Math.min(T, w - tx), th = Math.min(T, h - ty);
      let cov = 0, n = 0;
      for (let y = ty; y < ty + th; y += 4) for (let x = tx; x < tx + tw; x += 4) { cov += data.data[(y * w + x) * 4 + 3]; n++; }
      if (cov / n < 4) continue;
      const sx = Math.max(0, tx - 1), sy = Math.max(0, ty - 1);
      const sw = Math.min(w, tx + tw + 1) - sx, sh = Math.min(h, ty + th + 1) - sy;
      els.push({ src: canvas, sx, sy, sw, sh, x: ox + sx, y: oy + sy, ax: ox + tx + tw / 2, ay: oy + ty + th / 2 });
    }
  };
  const A = keyCream(img.A, W, H);
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const cx2 = comp.getContext('2d'); cx2.drawImage(A.c, 0, 0); cx2.drawImage(img.B, meta.B[0], meta.B[1]);
  const glOK = setupGL(comp);
  if (!glOK) {
    addTiles(A.c, A.d, W, H, 0, 0);
    const bc = document.createElement('canvas'); bc.width = img.B.width; bc.height = img.B.height;
    const bx = bc.getContext('2d', { willReadFrequently: true }); bx.drawImage(img.B, 0, 0);
    addTiles(bc, bx.getImageData(0, 0, bc.width, bc.height), bc.width, bc.height, meta.B[0], meta.B[1]);
  }
  const tag = keyCream(img.tag, img.tag.width, img.tag.height).c;
  const srcOf = s => (s.src === 'flags' ? img.flags : s.src === 'tag' ? tag : img.atlas);
  for (const k of ['head', 'splash', 'tag']) {   // literele "Erasmus+" nu intra in vartej: raman si devin titlul
    for (const s of S[k]) els.push({ src: srcOf(s), sx: s.sx, sy: s.sy, sw: s.w, sh: s.h, x: s.x, y: s.y, ax: s.ax ?? s.x + s.w / 2, ay: s.ay ?? s.y + s.h / 2 });
  }
  const dmax = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
  for (const e of els) e.d = Math.hypot(e.ax - cx, e.ay - cy);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const e of els) { e.start = 0.30 * (1 - e.d / dmax) + 0.04 * rnd(); e.spin = 0.9 + 0.6 * rnd(); e.tilt = (rnd() - 0.5) * 1.2; }
  // aceleasi litere, vopsite crem (pentru cand fundalul devine inchis)
  const crem = document.createElement('canvas'); crem.width = img.atlas.width; crem.height = img.atlas.height;
  const kx = crem.getContext('2d'); kx.drawImage(img.atlas, 0, 0); kx.globalCompositeOperation = 'source-in'; kx.fillStyle = '#FCF9F2'; kx.fillRect(0, 0, crem.width, crem.height);
  P = { els, stars, cx, cy, ringR, dmax, glOK, atlas: img.atlas, final: img.final, tag, tagSprites: S.tag, letters: S.letter, atlasCrem: crem,
        starRatio0: (stars.reduce((s, t) => s + t.w, 0) / stars.length) / 2 / ringR };
}

/* ---------- vartejul (WebGL) ---------- */
const glc = $('gl');
let G = null;
const NX = 64, NY = 43;
function setupGL(tex) {
  const gl = glc.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return false;
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, `attribute vec2 aPos; attribute vec2 aUV; attribute float aA;
    uniform vec2 uOff; uniform float uS; uniform vec2 uRes; varying vec2 vUV; varying float vA;
    void main(){ vec2 p = uOff + aPos * uS; gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0); vUV = aUV; vA = aA; }`));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, `precision mediump float; uniform sampler2D uT; varying vec2 vUV; varying float vA;
    void main(){ gl_FragColor = texture2D(uT, vUV) * vA; }`));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
  gl.useProgram(pr);
  const nv = (NX + 1) * (NY + 1);
  const base = new Float32Array(nv * 2), uv = new Float32Array(nv * 2);
  for (let j = 0, i = 0; j <= NY; j++) for (let k = 0; k <= NX; k++, i++) { base[i * 2] = k / NX * W; base[i * 2 + 1] = j / NY * H; uv[i * 2] = k / NX; uv[i * 2 + 1] = j / NY; }
  const idx = new Uint16Array(NX * NY * 6);
  for (let j = 0, n = 0; j < NY; j++) for (let k = 0; k < NX; k++) { const a = j * (NX + 1) + k, b = a + 1, c = a + NX + 1, d = c + 1; idx.set([a, b, c, b, d, c], n); n += 6; }
  const buf = (data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); return b; };
  const pos = new Float32Array(nv * 2), alp = new Float32Array(nv);
  const bPos = buf(pos, gl.DYNAMIC_DRAW), bUV = buf(uv, gl.STATIC_DRAW), bA = buf(alp, gl.DYNAMIC_DRAW);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const attr = (name, b, size) => { const l = gl.getAttribLocation(pr, name); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); };
  attr('aPos', bPos, 2); attr('aUV', bUV, 2); attr('aA', bA, 1);
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  G = { gl, pr, base, pos, alp, bPos, bA, n: idx.length, uOff: gl.getUniformLocation(pr, 'uOff'), uS: gl.getUniformLocation(pr, 'uS'), uRes: gl.getUniformLocation(pr, 'uRes') };
  return true;
}
function drawGL(pA, s, ox, oy, cw, ch) {
  const { gl } = G;
  gl.viewport(0, 0, glc.width, glc.height);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (pA <= 0 || pA >= 1) return;
  const { base, pos, alp } = G;
  for (let i = 0, n = alp.length; i < n; i++) {
    const vx = base[i * 2] - P.cx, vy = base[i * 2 + 1] - P.cy;
    const dn = Math.hypot(vx, vy) / P.dmax;
    const q = clamp((pA - 0.30 * (1 - dn)) / 0.62);
    const ep = q * q, sq = smooth(q);
    const phi = -(0.9 + 0.5 * dn) * sq * 1.1, cs = Math.cos(phi), sn = Math.sin(phi), kk = 1 - ep;
    pos[i * 2] = P.cx + (vx * cs - vy * sn) * kk;
    pos[i * 2 + 1] = P.cy + (vx * sn + vy * cs) * kk;
    alp[i] = 1 - smooth(clamp((q - 0.7) / 0.3));
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, G.bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.bA); gl.bufferSubData(gl.ARRAY_BUFFER, 0, alp);
  gl.uniform2f(G.uOff, ox, oy); gl.uniform1f(G.uS, s); gl.uniform2f(G.uRes, cw, ch);
  gl.drawElements(gl.TRIANGLES, G.n, gl.UNSIGNED_SHORT, 0);
}

/* ---------- starea paginii ---------- */
// faza: 'intro' = de la logo pana la ERASMUS+ ; 'hero' = ERASMUS+ pe ecran ; 'seq' = textul se scrie ; 'cols' = coloanele
let introGata = false, faza = 'intro';
const DURATA = reduce ? 1600 : 4500;   // ms, de la logo la ERASMUS+
let curP = 0, tinta = 0, ultim = 0, ruleaza = false, topSince = Infinity;
function terminaIntro() {
  if (introGata) return;
  introGata = true;
  $('bgv0').preload = 'auto';
  hint.classList.add('on');
  cere();
}
function clasa(f) {
  for (const k of ['hero', 'seq', 'cols']) hero.classList.toggle('is-' + k, k === f);
  $('bg').classList.toggle('is-cols', f === 'cols');   // blurul de sub coloane e un strat al fundalului
}
function ajunsHero() {
  faza = 'hero'; clasa('hero');
  store();
  if (SEQ && !textVazut) SEQ.pregateste();   // fonturile pentru textul care urmeaza
}
function mergi(dir) {
  if (!introGata || faza === 'seq' || faza === 'cols') return;
  tinta = dir > 0 ? 1 : 0;
  if (tinta === 0 && faza === 'hero') { faza = 'intro'; clasa(''); }
  if (!ruleaza && curP !== tinta) { ruleaza = true; ultim = performance.now(); requestAnimationFrame(pas); }
}
function pas(now) {
  if (!onHome()) { ruleaza = false; return; }
  const pasP = Math.min(64, now - ultim) / DURATA; ultim = now;
  const d = tinta - curP;
  if (Math.abs(d) <= pasP) { curP = tinta; ruleaza = false; } else curP += Math.sign(d) * pasP;
  render();
  if (ruleaza) requestAnimationFrame(pas);
  else if (curP >= 1) ajunsHero();
}
// "Skip intro": direct la ERASMUS+, fara animatie
function sari() {
  const L = la();
  if (L && L.skip) L.skip(); else window.ERASMUS_SKIP_INTRO = true;
  introGata = true; hint.classList.remove('on');
  curP = tinta = 1; ruleaza = false;
  ajunsHero(); render();
  html.classList.remove('skip-intro');
}

/* ---------- ERASMUS+ -> textul care se scrie -> coloanele ---------- */
// steagul zboara intre locul de sus si linia din mijlocul coloanelor
const steag = slot;
let steagT = 0, vineT = 0;
// transformarea care duce steagul de sus peste cel din coloane.
// laMijloc = unde sta steagul cand nicio coloana nu e largita (mijlocul ecranului); altfel unde e chiar acum.
function steagPesteColoane(laMijloc) {
  const acum = getComputedStyle(steag).transform;
  steag.style.transition = 'none'; steag.style.transform = '';
  const a = steag.getBoundingClientRect(), b = colsFlag.getBoundingClientRect(), h = hero.getBoundingClientRect();
  steag.style.transform = acum === 'none' ? '' : acum;   // daca era in zbor, continua de unde a ajuns
  void steag.offsetWidth;
  const x = laMijloc ? h.left + h.width / 2 : b.left + b.width / 2, y = laMijloc ? h.top + h.height / 2 : b.top + b.height / 2;
  const scale = b.width / a.width;
  // La aterizare, conturul steagului in zbor are aceeasi grosime ca cel din coloane.
  steag.style.setProperty('--flag-rim-scale', 1 / scale);
  return `translate(${x - a.left - a.width / 2}px,${y - a.top - a.height / 2}px) scale(${scale})`;
}
function steagJos(repede) {
  clearTimeout(steagT);
  const gata = () => { colsFlag.classList.add('on'); steag.style.visibility = 'hidden'; };
  const t = steagPesteColoane(true);
  if (repede) { steag.style.transform = t; gata(); return; }
  steag.classList.add('with-rim');
  steag.style.transition = 'transform .95s cubic-bezier(.5,0,.15,1)';
  steag.style.transform = t;
  steagT = setTimeout(gata, 960);
}
function steagSus() {
  clearTimeout(steagT);
  if (steag.style.visibility === 'hidden') {   // porneste de unde e steagul din coloane
    const t = steagPesteColoane();
    steag.style.transform = t; steag.style.visibility = '';
    void steag.offsetWidth;
  }
  colsFlag.classList.remove('on');
  steag.classList.remove('with-rim');
  steag.style.transition = 'transform .8s cubic-bezier(.5,0,.15,1)';
  steag.style.transform = '';
}
function laColoane(direct) {   // direct = fara zborul steagului (cand ne intoarcem dintr-o pagina)
  if (faza === 'cols') return;
  if (SEQ) SEQ.stop();
  faza = 'cols'; clasa('cols');
  textVazut = true; try { sessionStorage.setItem('erasmus-text', '1'); } catch (e) {}
  steagJos(reduce || direct === true);
  // cat timp cad coloanele si zboara steagul, mouse-ul nu le largeste (altfel steagul ar ateriza alaturi)
  hero.classList.add('vine'); clearTimeout(vineT); vineT = setTimeout(() => hero.classList.remove('vine'), reduce ? 0 : 1000);
  html.classList.remove('lock');
  topSince = performance.now();
  cere();
}
function laHero() {   // inapoi la ERASMUS+
  if (faza !== 'cols' && faza !== 'seq') return;
  if (SEQ) SEQ.stop();
  scrollTo(0, 0); html.classList.add('lock');
  if (faza === 'cols') steagSus();
  faza = 'hero'; clasa('hero');
  cere();
}
function inainte() {   // de la ERASMUS+ mai departe
  if (faza !== 'hero') return;
  if (textVazut || reduce || !SEQ) { laColoane(); return; }
  faza = 'seq'; clasa('seq');
  cere();
  SEQ.play().then(pana => { if (pana && faza === 'seq') laColoane(); });
}
['pointerdown', 'keydown'].forEach(ev => skipBtn.addEventListener(ev, e => e.stopPropagation()));   // sa nu porneasca sunetul
skipBtn.addEventListener('click', sari);
seqSkip.addEventListener('click', laColoane);
hint.addEventListener('click', () => mergi(1));
explore.addEventListener('click', e => { e.preventDefault(); inainte(); });
colsFlag.addEventListener('click', () => { if (scrollY > 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); else laHero(); });

/* Titlurile din coloane urca in acelasi meniu care apare pe pagina urmatoare. */
const columns = $('menu'), sectionNav = $('section-nav');
const sectionLinks = new Map([...sectionNav.querySelectorAll('.section-link')].map(link => [link.getAttribute('href'), link]));
let openingLink = null;

function flyToHeader(element, from, appearance = {}) {
  const to = element.getBoundingClientRect();
  if (!from.width || !from.height || !to.width || !to.height) return;
  const x = from.left + from.width / 2 - to.left - to.width / 2;
  const y = from.top + from.height / 2 - to.top - to.height / 2;
  const transform = `translate(${x}px,${y}px) scale(${from.height / to.height})`;
  return element.animate([{ transform, ...appearance }, { transform: 'none' }], {
    duration: 560, easing: 'cubic-bezier(.22,.8,.2,1)', fill: 'backwards',
  }).finished;
}

columns.addEventListener('click', async event => {
  const link = event.target.closest('a.col');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const current = sectionLinks.get(link.getAttribute('href'));
  if (!current || reduce || !Element.prototype.animate) return;
  event.preventDefault();
  if (openingLink) return;
  openingLink = link;

  try {
    const labels = [...columns.querySelectorAll('.col')].map(col => {
      const label = col.querySelector('.col-t');
      const target = sectionLinks.get(col.getAttribute('href')).querySelector('span');
      const style = getComputedStyle(label);
      const letterSpacing = `${(parseFloat(style.letterSpacing) || 0) / parseFloat(style.fontSize)}em`;
      return { target, from: label.getBoundingClientRect(), appearance: { color: style.color, opacity: style.opacity, letterSpacing } };
    });
    const flagFrom = (colsFlag.classList.contains('on') ? colsFlag : slot).getBoundingClientRect();
    current.setAttribute('aria-current', 'page');
    columns.inert = true;
    html.classList.add('opening-section');
    // fundalul incepe sa treaca spre cel al paginilor chiar de acum, cat urca titlurile
    window.backgroundVideo?.setPage(link.getAttribute('href').replace('.html', ''));
    const flights = labels.map(({ target, from, appearance }) => flyToHeader(target, from, appearance));
    flights.push(flyToHeader(sectionNav.querySelector('.section-home'), flagFrom));
    await Promise.allSettled(flights);
  } finally {
    if (openingLink === link) {
      if (window.SiteNavigation) window.SiteNavigation.go(link.href, { fromHome: true });
      else {
        window.backgroundVideo?.remember();
        location.assign(link.href);
      }
    }
  }
});

/* Drumul inapoi: cand te intorci dintr-o pagina, titlurile coboara din meniul de sus la locul lor din coloane. */
const flyEase = 'cubic-bezier(.22,.8,.2,1)';
function flyFromHeader() {
  const done = () => {
    html.classList.remove('closing-section');
    sectionLinks.forEach(link => link.removeAttribute('aria-current'));
  };
  if (reduce || !Element.prototype.animate) { done(); return Promise.resolve(); }
  html.classList.add('closing-section');   // meniul de sus ramane vizibil cat zboara; titlurile din coloane apar la final
  const flights = [];
  const fly = (element, to, appearance = {}) => {
    const from = element.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) return;
    const x = to.left + to.width / 2 - from.left - from.width / 2, y = to.top + to.height / 2 - from.top - from.height / 2;
    flights.push(element.animate([{ transform: 'none' }, { transform: `translate(${x}px,${y}px) scale(${to.height / from.height})`, ...appearance }],
      { duration: 560, easing: flyEase, fill: 'forwards' }));
  };
  for (const col of columns.querySelectorAll('.col')) {
    const label = col.querySelector('.col-t'), span = sectionLinks.get(col.getAttribute('href'))?.querySelector('span');
    if (!label || !span) continue;
    const style = getComputedStyle(label);
    fly(span, label.getBoundingClientRect(), { color: style.color, opacity: style.opacity,
      letterSpacing: `${(parseFloat(style.letterSpacing) || 0) / parseFloat(style.fontSize)}em` });
  }
  fly(sectionNav.querySelector('.section-home'), colsFlag.getBoundingClientRect());
  return Promise.allSettled(flights.map(flight => flight.finished)).then(() => {
    done();
    flights.forEach(flight => flight.cancel?.());
  });
}

addEventListener('pageshow', event => {
  if (!event.persisted || !openingLink) return;
  sectionLinks.get(openingLink.getAttribute('href')).removeAttribute('aria-current');
  openingLink = null;
  columns.inert = false;
  html.classList.remove('opening-section');
  window.backgroundVideo?.setPage('home');
});

// un gest de scroll (o miscare pe rotita / trackpad) face un singur pas
let rotita = 0, gest = false, gestSus = false;
addEventListener('wheel', e => {
  if (!onHome()) return;
  if (openingLink) { e.preventDefault(); return; }
  if (overlayOpen()) return;
  const acum = performance.now(), nou = acum - rotita > 220;
  rotita = acum;
  if (nou) { gest = false; gestSus = scrollY <= 0; }
  if (faza === 'cols') {   // pagina se deruleaza normal; doar sus de tot, scroll in sus = inapoi la ERASMUS+
    if (scrollY > 0 || e.deltaY >= 0) return;
    e.preventDefault();
    if (e.deltaY < -3 && gestSus && !gest && acum - topSince > 400) { gest = true; laHero(); }
    return;
  }
  e.preventDefault();
  if (Math.abs(e.deltaY) < 3) return;
  const jos = e.deltaY > 0;
  if (faza === 'intro') { gest = true; mergi(jos ? 1 : -1); return; }
  if (gest) return;
  gest = true;
  if (faza === 'hero') { if (jos) inainte(); else mergi(-1); }
  else if (!jos) laHero();   // in timpul textului: scroll in sus = inapoi
}, { passive: false });
let atingY = null, atingSus = false;
addEventListener('touchstart', e => { if (!onHome()) return; atingY = e.touches[0].clientY; atingSus = scrollY <= 0; }, { passive: true });
addEventListener('touchmove', e => {
  if (!onHome()) return;
  if (openingLink) { e.preventDefault(); return; }
  if (atingY === null || overlayOpen()) return;
  const dy = e.touches[0].clientY - atingY;
  if (faza === 'cols') {
    if (atingSus && scrollY <= 0 && dy > 36) { e.preventDefault(); laHero(); atingY = null; }
    return;
  }
  e.preventDefault();   // pagina nu se misca in timpul animatiilor
  if (Math.abs(dy) <= 24) return;
  const jos = dy < 0;
  if (faza === 'intro') mergi(jos ? 1 : -1);
  else if (faza === 'hero') { if (jos) inainte(); else mergi(-1); }
  else if (!jos) laHero();
  atingY = null;
}, { passive: false });
addEventListener('keydown', e => {
  if (!onHome()) return;
  if (openingLink || overlayOpen() || e.target.closest('input,textarea,select')) return;
  const jos = ['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key), sus = ['ArrowUp', 'PageUp', 'Home'].includes(e.key);
  if (faza === 'cols') { if (sus && scrollY <= 0) { e.preventDefault(); laHero(); } return; }
  if (faza === 'seq') {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); laColoane(); }
    else if (sus) { e.preventDefault(); laHero(); }
    else if (jos) e.preventDefault();
    return;
  }
  if (!jos && !sus) return;
  if (e.key === ' ' && e.target.closest('button,a')) return;
  if (introGata) e.preventDefault();
  if (faza === 'hero') { if (jos) inainte(); else mergi(-1); }
  else mergi(jos ? 1 : -1);
});
addEventListener('scroll', () => {
  if (!onHome()) return;
  if (scrollY > 0) topSince = Infinity; else if (topSince === Infinity) topSince = performance.now();
  cere();
}, { passive: true });

function watch() {
  if (!onHome()) return;
  const L = la();
  if (L && L.ready()) {
    if (!P) { try { prepare(); } catch (e) { console.error(e); } }
    if (!L.clock.playing && L.clock.t >= L.timeline.end - 1e-3) { terminaIntro(); return; }
  }
  requestAnimationFrame(watch);
}
requestAnimationFrame(watch);
setTimeout(() => { if (!la() || !la().ready()) terminaIntro(); }, 12000);   // plasa de siguranta

/* ---------- desenul ---------- */
function star(ctx, x, y, R) {
  const r = R * 0.382;
  ctx.moveTo(x, y - R);
  for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  ctx.closePath();
}
let dpr = 1;
// unde sta fiecare litera din ERASMUS+ (dreptunghiul desenului ei, fata de erou). Literele din logo zboara spre locurile astea.
let tinte = null;
const mctx = document.createElement('canvas').getContext('2d');
function masoaraLitere() {
  // pozitia in pagina fara transformari: adunam offset-urile pana la erou
  const loc = el => { let x = 0, y = 0; for (let e = el; e && e !== hero; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return [x, y]; };
  const cs = getComputedStyle(megaIn), fs = parseFloat(cs.fontSize);
  const SY = new DOMMatrixReadOnly(cs.transform).d || 1;   // titlul e intins pe verticala (scaleY)
  mctx.font = `800 ${fs}px ${cs.fontFamily}`;
  const jos = loc(megaIn)[1] + megaIn.offsetHeight;        // intinderea se face de la marginea de jos
  tinte = lit.map(sp => {
    const m = mctx.measureText(sp.dataset.ch), [sx, sy] = loc(sp), baza = loc(sp.lastChild)[1];
    const x0 = sx - m.actualBoundingBoxLeft, x1 = sx + m.actualBoundingBoxRight;
    const y0 = baza - m.actualBoundingBoxAscent, y1 = baza + m.actualBoundingBoxDescent;
    sp.style.transformOrigin = `${(x0 + x1) / 2 - sx}px ${(y0 + y1) / 2 - sy}px`;
    const b = sp.querySelector('b');   // plusul: nu e intins ca literele (cat de inalt e se alege in home.css, --plus), cu centrul in acelasi loc
    if (b) {
      const [bx, by] = loc(b), h = (y1 - y0) * SY * (new DOMMatrixReadOnly(getComputedStyle(b).transform).d || 1 / SY);
      b.style.transformOrigin = `${(x0 + x1) / 2 - bx}px ${(y0 + y1) / 2 - by}px`;
      return { x: x0, y: jos - (jos - (y0 + y1) / 2) * SY - h / 2, w: x1 - x0, h, SY };
    }
    return { x: x0, y: jos - (jos - y0) * SY, w: x1 - x0, h: (y1 - y0) * SY, SY };
  });
}
function resize() {
  if (!onHome()) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = hero.getBoundingClientRect();
  fx.width = glc.width = Math.round(r.width * dpr); fx.height = glc.height = Math.round(r.height * dpr);
  const nb = nav.getBoundingClientRect().bottom;
  heroTxt.style.top = Math.round(Math.max(0, nb - (r.top + scrollY)) + 8) + 'px';
  masoaraLitere();
  cere();
}

function render() {
  pending = false;
  if (!onHome()) return;
  const p = curP;
  const pA = clamp(p / 0.40), pB = clamp((p - 0.40) / 0.20), pC = clamp((p - 0.60) / 0.28);
  const gata = p >= 1 && !ruleaza;

  logoEl.style.visibility = p > 0 ? 'hidden' : 'visible';
  const nightK = smooth(clamp((pB - 0.35) / 0.65));
  barColor(nightK > 0.5 ? '#0B1638' : '#FCF9F2');
  // fundalul se intuneca putin sub text si sub coloane, si de tot spre subsol
  const dimK = faza === 'cols' ? 0.5 + 0.5 * clamp(scrollY / (innerHeight * 0.85)) : faza === 'seq' ? 0.35 : 0;
  dim.style.setProperty('--dim', dimK.toFixed(3));
  window.backgroundVideo?.play(pB > 0 && dimK < 0.995);

  hint.style.opacity = introGata ? 1 - clamp(p / 0.04) : 0;
  hint.style.visibility = introGata && p < 0.04 ? 'visible' : 'hidden';
  skipBtn.style.opacity = 1 - clamp(p / 0.2);
  skipBtn.style.visibility = p < 0.2 ? 'visible' : 'hidden';

  // sus e doar steagul: cel adevarat il inlocuieste pe cel desenat cand animatia s-a terminat
  nav.style.visibility = gata ? 'visible' : 'hidden';
  nav.classList.toggle('flag-on', p >= 1);
  const mo = smooth(clamp((p - 0.84) / 0.16));
  motto.style.opacity = mo; motto.style.transform = mo >= 1 ? '' : `translateY(${(1 - mo) * 16}px)`;

  // literele: cat timp zboara din logo spre locul lor, <span>-urile din titlu sunt mutate peste ele
  const sr = hero.getBoundingClientRect();
  const lr = logoEl.getBoundingClientRect();
  const s = lr.width / W, ox = lr.left - sr.left, oy = lr.top - sr.top;
  const pL = clamp((p - 0.56) / 0.42);
  const zbor = lit.map((sp, i) => {
    const T = tinte && tinte[i], t = P && P.letters[i];
    if (p >= 1 || !T) { sp.style.opacity = p >= 1 ? 1 : 0; sp.style.transform = ''; return null; }
    const k = inOut(clamp((pL - i * 0.045) / 0.68));
    const S = t ? { x: ox + t.x * s, y: oy + t.y * s, w: t.w * s, h: t.h * s } : T;
    const R = { x: lerp(S.x, T.x, k), y: lerp(S.y, T.y, k), w: lerp(S.w, T.w, k), h: lerp(S.h, T.h, k) };
    const aD = smooth(clamp((k - 0.12) / 0.5));
    sp.style.opacity = aD;
    sp.style.transform = aD <= 0 ? '' : `translate(${R.x + R.w / 2 - T.x - T.w / 2}px,${(R.y + R.h / 2 - T.y - T.h / 2) / T.SY}px) scale(${R.w / T.w},${R.h / T.h})`;
    return { t, S, R, a: 1 - smooth(clamp((k - 0.18) / 0.5)) };
  });

  fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.clearRect(0, 0, fx.width, fx.height);
  if (p >= 1) {   // final: nimic de desenat, crem ascuns
    if (G) drawGL(0);
    cream.style.display = 'none';
    return;
  }
  if (p <= 0 || !P) {
    if (G) drawGL(0);
    cream.style.display = ''; cream.style.webkitMaskImage = cream.style.maskImage = '';
    return;
  }

  const toLogo = () => fctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  const toScreen = () => fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rot = (Math.PI / 6) * inOut(clamp((pB - 0.15) / 0.85));

  // 1. panglicile si cladirile se invart spre stele; literele, siluetele si stropii zboara separat
  if (G) drawGL(pA, s, ox, oy, sr.width, sr.height);
  toLogo();
  if (pA < 1) {
    for (const e of P.els) {
      const q = clamp((pA - e.start) / 0.62);
      if (q >= 1) continue;
      if (q <= 0) { fctx.globalAlpha = 1; fctx.drawImage(e.src, e.sx, e.sy, e.sw, e.sh, e.x, e.y, e.sw, e.sh); continue; }
      const ep = q * q, sq = smooth(q);
      const phi = -e.spin * sq * 1.1;
      const vx = e.ax - P.cx, vy = e.ay - P.cy, cs = Math.cos(phi), sn = Math.sin(phi), kk = 1 - ep;
      fctx.save();
      fctx.globalAlpha = 1 - smooth(clamp((q - 0.7) / 0.3));
      fctx.translate(P.cx + (vx * cs - vy * sn) * kk, P.cy + (vx * sn + vy * cs) * kk);
      fctx.rotate(phi + e.tilt * sq);
      const sc = Math.max(0.02, 1 - 0.95 * ep);
      fctx.scale(sc, sc);
      fctx.drawImage(e.src, e.sx, e.sy, e.sw, e.sh, e.x - e.ax, e.y - e.ay, e.sw, e.sh);
      fctx.restore();
    }
    const a0 = 1 - clamp(pA / 0.03);
    if (a0 > 0) {
      fctx.globalAlpha = a0;
      fctx.drawImage(P.final, 0, 0, W, H);
      for (const t of P.tagSprites) fctx.drawImage(P.tag, t.sx, t.sy, t.w, t.h, t.x, t.y, t.w, t.h);
    }
    fctx.globalAlpha = 1;
  }

  // 2. steagul UE: discul creste, inelul se roteste, apoi urca in meniu
  const fr = slot.getBoundingClientRect();
  const m = inOut(pC);
  const C0x = ox + P.cx * s, C0y = oy + P.cy * s, R0 = P.ringR * s;
  const fcx = lerp(C0x, fr.left - sr.left + fr.width / 2, m);
  const fcy = lerp(C0y, fr.top - sr.top + fr.height / 2, m);
  const R = lerp(R0, fr.width / 2 / DISC, m);
  const disc = outCubic(clamp(pB / 0.7)) * DISC;
  const cx = C0x + sr.left, cy = C0y + sr.top, vw = innerWidth, vh = innerHeight;
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(vw - cx, cy), Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy));
  const rr = R0 * DISC + nightK * (far + 80);   // pana unde a ajuns "noaptea"
  if (nightK <= 0) { cream.style.display = ''; cream.style.webkitMaskImage = cream.style.maskImage = ''; }
  else if (nightK >= 1) cream.style.display = 'none';
  else {
    const mk = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${rr}px, #000 ${rr + 70}px)`;
    cream.style.display = ''; cream.style.webkitMaskImage = mk; cream.style.maskImage = mk;
  }
  toScreen();
  // literele din logo: albastre pe crem, crem cand trece noaptea peste ele, apoi se topesc in conturul titlului
  for (const z of zbor) {
    if (!z || !z.t || z.a <= 0) continue;
    const { t, S, R } = z;
    const crem = nightK <= 0 ? 0 : nightK >= 1 ? 1 : clamp((rr + 35 - Math.hypot(S.x + S.w / 2 - C0x, S.y + S.h / 2 - C0y)) / 70);
    if (crem < 1) { fctx.globalAlpha = z.a * (1 - crem); fctx.drawImage(P.atlas, t.sx, t.sy, t.w, t.h, R.x, R.y, R.w, R.h); }
    if (crem > 0) { fctx.globalAlpha = z.a * crem; fctx.drawImage(P.atlasCrem, t.sx, t.sy, t.w, t.h, R.x, R.y, R.w, R.h); }
  }
  fctx.globalAlpha = 1;
  if (disc > 0.001) {
    fctx.save();
    fctx.shadowColor = `rgba(0,0,0,${0.45 * nightK})`;
    fctx.shadowBlur = R * 0.8 * dpr;
    fctx.shadowOffsetY = R * 0.22 * dpr;
    fctx.fillStyle = '#003399';
    fctx.beginPath(); fctx.arc(fcx, fcy, R * disc, 0, Math.PI * 2); fctx.fill();
    fctx.restore();
  }
  const aLogo = 1 - clamp(pB / 0.35);
  if (aLogo > 0 && pC <= 0) {
    toLogo();
    fctx.globalAlpha = aLogo;
    const cr = Math.cos(rot), sr2 = Math.sin(rot);
    for (const t of P.stars) {
      const vx = t.ax - P.cx, vy = t.ay - P.cy;
      const nx = P.cx + vx * cr - vy * sr2, ny = P.cy + vx * sr2 + vy * cr;
      fctx.drawImage(P.atlas, t.sx, t.sy, t.w, t.h, nx - (t.ax - t.x), ny - (t.ay - t.y), t.w, t.h);
    }
    fctx.globalAlpha = 1;
    toScreen();
  }
  const aEU = clamp(pB / 0.3);
  if (aEU > 0) {
    const ratio = lerp(P.starRatio0, 1 / 6, smooth(clamp(pB / 0.6)));
    fctx.globalAlpha = aEU;
    fctx.fillStyle = '#FFCC00';
    fctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i * Math.PI / 6 + rot; star(fctx, fcx + R * Math.cos(a), fcy + R * Math.sin(a), R * ratio); }
    fctx.fill();
    fctx.globalAlpha = 1;
  }
}
let pending = false;
function cere() { if (!pending) { pending = true; requestAnimationFrame(render); } }
addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
resize();
if (document.fonts) document.fonts.ready.then(resize);

if (window.ERASMUS_SKIP_INTRO) sari();
else render();
window.HomeController = {
  suspend() {
    SEQ?.stop(); la()?.skip(); la()?.pause();
    clearTimeout(steagT); clearTimeout(vineT);
    hero.classList.remove('vine', 'direct'); html.classList.remove('closing-section');
    openingLink = null; columns.inert = false; ruleaza = false;
  },
  resume() {
    openingLink = null; columns.inert = false;
    html.classList.remove('opening-section', 'lock');
    // Direct la coloane, fara animatiile de intrare: altfel ERASMUS+ clipeste o clipa si coloanele cad din nou.
    hero.classList.add('direct');
    faza = 'intro'; sari(); laColoane(true); resize();
    void hero.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.remove('direct')));
    return flyFromHeader();
  },
};
})();
