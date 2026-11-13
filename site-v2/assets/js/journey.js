/* Pagina Journey: harta Europei, harta fiecarei mobilitati cu locurile, si pozele de la fiecare loc */
window.PageControllers = window.PageControllers || {};
window.PageControllers.journey = function (signal) {
const S = window.SITE, U = window.UI, { I, esc, tx, tile } = U;
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
let mob = S.mob(location.hash.slice(1)) ? location.hash.slice(1) : 'ro';
let activ = null;
const filtre = {};   // filtrul (toate / poze / video) pentru fiecare loc

/* ---------- harta Europei + lista mobilitatilor ---------- */
function overview() {
  $('europe').innerHTML = U.europe({ active: mob, interactive: true });
  $('mobList').innerHTML = S.mobilities.map(m => `
    <button type="button" class="glass mob-item${m.id === mob ? ' on' : ''}" data-mob="${m.id}" aria-pressed="${m.id === mob}">
      <span class="n">${m.n}</span>
      <span><b>${esc(m.city)}</b><span class="meta">${esc(m.country)} · ${tx(m.date)} · ${m.stops.length} places</span></span>
      <span class="arrow" style="margin:0">${I.arrow}</span>
    </button>`).join('');
  const go = id => { alege(id); $('detail').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  $('europe').querySelectorAll('.city').forEach(g => {
    g.addEventListener('click', () => go(g.dataset.mob));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(g.dataset.mob); } });
  });
  $('mobList').querySelectorAll('[data-mob]').forEach(b => b.addEventListener('click', () => go(b.dataset.mob)));
}

/* ---------- taburile ---------- */
function taburi() {
  $('mobTabs').innerHTML = S.mobilities.map(m => `<button type="button" role="tab" aria-selected="${m.id === mob}" data-mob="${m.id}">${esc(m.city)}<small>${m.n}</small></button>`).join('');
  $('mobTabs').querySelectorAll('[data-mob]').forEach(b => b.addEventListener('click', () => alege(b.dataset.mob)));
  const m = S.mob(mob);
  $('mobInfo').innerHTML = `${I.pin}<span>${esc(m.country)} · ${tx(m.date)} · ${m.stops.length} places · ${m.stops.reduce((n, s) => n + s.media.length, 0)} photos and videos</span>`;
  $('mobInfo').querySelector('svg').style.cssText = 'width:16px;height:16px;flex:none';
}

/* ---------- harta locala ---------- */
let geo = null;   // pozitiile pinilor, ca sa putem actualiza fara redesenare
function harta() {
  const m = S.mob(mob), box = $('map'), r = box.getBoundingClientRect();
  const Wd = Math.max(280, r.width), Hd = Math.max(280, r.height);
  const lat0 = m.stops.reduce((s, x) => s + x.lat, 0) / m.stops.length, kx = Math.cos(lat0 * Math.PI / 180);
  const pts = [...m.stops, ...m.labels];
  const xs = pts.map(p => p.lon * kx), ys = pts.map(p => -p.lat);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const padL = 56, padR = 56, padT = 76, padB = Wd < 560 ? 150 : 128;
  const bw = Math.max(x1 - x0, 1e-4), bh = Math.max(y1 - y0, 1e-4);
  const k = Math.min((Wd - padL - padR) / bw, (Hd - padT - padB) / bh);
  const ox = padL + (Wd - padL - padR - bw * k) / 2 - x0 * k, oy = padT + (Hd - padT - padB - bh * k) / 2 - y0 * k;
  const P = (lat, lon) => [ox + lon * kx * k, oy - lat * k];

  // grila de coordonate, cu un pas "frumos" (aprox. 110 px)
  const pasuri = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2];
  const stepLat = pasuri.find(s => s * k >= 90) || 2, stepLon = pasuri.find(s => s * k * kx >= 90) || 2;
  const latMin = (oy - Hd) / k, latMax = oy / k, lonMin = -ox / (k * kx), lonMax = (Wd - ox) / (k * kx);
  let g = '';
  for (let la = Math.ceil(latMin / stepLat) * stepLat; la <= latMax; la += stepLat) {
    const y = P(la, 0)[1]; g += `<line class="grid-l" x1="0" x2="${Wd}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="grid-t" x="10" y="${(y - 6).toFixed(1)}">${la.toFixed(stepLat < 0.1 ? 3 : 2)}°N</text>`;
  }
  for (let lo = Math.ceil(lonMin / stepLon) * stepLon; lo <= lonMax; lo += stepLon) {
    const x = P(lat0, lo)[0]; g += `<line class="grid-l" y1="0" y2="${Hd}" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}"/><text class="grid-t" y="${Hd - 10}" x="${(x + 6).toFixed(1)}">${lo.toFixed(stepLon < 0.1 ? 3 : 2)}°E</text>`;
  }

  // uscatul (doar unde avem coasta: Danemarca)
  let land = '';
  if (window.COAST && window.COAST[mob]) {
    const a = kx * k / 1000, d = k / 1000;   // coordonatele salvate sunt lon*1000 si -lat*1000
    land = `<path class="land" d="${window.COAST[mob]}" transform="matrix(${a} 0 0 ${d} ${ox} ${oy})"/>`;
  }

  // pinii: pozitia reala, apoi ii departam putin daca se suprapun (cu o linie spre locul real)
  const reale = m.stops.map(s => P(s.lat, s.lon));
  const poz = reale.map(([x, y]) => [x, y]);
  const MIN = 46;
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < poz.length; i++) for (let j = i + 1; j < poz.length; j++) {
      let dx = poz[j][0] - poz[i][0], dy = poz[j][1] - poz[i][1], dd = Math.hypot(dx, dy);
      if (dd >= MIN) continue;
      if (dd < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); dd = 1; }
      const push = (MIN - dd) / 2;
      poz[i][0] -= dx / dd * push; poz[i][1] -= dy / dd * push;
      poz[j][0] += dx / dd * push; poz[j][1] += dy / dd * push;
    }
    for (const p of poz) { p[0] = Math.min(Wd - 30, Math.max(30, p[0])); p[1] = Math.min(Hd - padB + 40, Math.max(padT - 20, p[1])); }
  }

  // drumul dintre locuri (curba lina, in ordinea zilelor)
  let route = `M${poz[0][0].toFixed(1)} ${poz[0][1].toFixed(1)}`;
  for (let i = 0; i < poz.length - 1; i++) {
    const p0 = poz[i - 1] || poz[i], p1 = poz[i], p2 = poz[i + 1], p3 = poz[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    route += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  // bara de scara
  const kmPx = k / 111.32;   // pixeli pe km (pe verticala)
  const nice = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find(v => v * kmPx >= 70) || 50;
  const sbW = nice * kmPx, sbX = 22, sbY = 40;   // sus in stanga, departe de caseta de jos

  const puse = [];
  const areas = m.labels.map(l => {
    let [x, y] = P(l.lat, l.lon);
    const w = l.t.length * 8 + 20;
    // eticheta nu sta peste un pin: o urcam deasupra lui
    for (let t = 0; t < 4; t++) { const hit = poz.find(p => Math.abs(p[0] - x) < w / 2 + 18 && Math.abs(p[1] - (y - 7)) < 30); if (!hit) break; y = hit[1] - 32; }
    // si nici peste alta eticheta: daca nu are loc, nu o mai scriem
    if (puse.some(q => Math.abs(q[0] - x) < (q[2] + w) / 2 && Math.abs(q[1] - y) < 26) || y < 60) return '';
    puse.push([x, y, w]);
    return `<text class="area" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${esc(l.t)}</text>`; }).join('');
  const leads = poz.map((p, i) => Math.hypot(p[0] - reale[i][0], p[1] - reale[i][1]) > 6
    ? `<line class="lead" x1="${reale[i][0].toFixed(1)}" y1="${reale[i][1].toFixed(1)}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}"/><circle class="true" cx="${reale[i][0].toFixed(1)}" cy="${reale[i][1].toFixed(1)}" r="3"/>` : '').join('');
  const pins = m.stops.map((s, i) => `
    <g class="pin${s.id === activ ? ' on' : ''}" data-stop="${s.id}" transform="translate(${poz[i][0].toFixed(1)} ${poz[i][1].toFixed(1)})" tabindex="0" role="button" aria-label="${i + 1}. ${esc(s.title)}">
      <circle class="halo" r="27"/><circle class="dot" r="17"/><text>${i + 1}</text>
    </g>`).join('');

  box.innerHTML = `<svg viewBox="0 0 ${Wd.toFixed(0)} ${Hd.toFixed(0)}" role="group" aria-label="Map of ${esc(m.city)}">
    <defs><radialGradient id="mapGlow" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#3D6BFF" stop-opacity=".22"/><stop offset="1" stop-color="#3D6BFF" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#mapGlow)"/>
    ${g}${land}${areas}
    <path class="route-glow" d="${route}"/><path class="route" d="${route}"/>
    ${leads}${pins}
    <g transform="translate(${sbX.toFixed(1)} ${sbY.toFixed(1)})"><path d="M0 -5V0H${sbW.toFixed(1)}V-5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/><text class="grid-t" x="${(sbW / 2).toFixed(1)}" y="-9" text-anchor="middle">${nice < 1 ? nice * 1000 + ' m' : nice + ' km'}</text></g>
  </svg>`;
  box.querySelectorAll('.pin').forEach(p => {
    p.addEventListener('click', () => selecteaza(p.dataset.stop, true));
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecteaza(p.dataset.stop, true); } });
  });
  geo = { Wd, Hd };
  info();
}

function info() {
  const m = S.mob(mob), s = m.stops.find(x => x.id === activ);
  $('mapBox').innerHTML = s
    ? `<b>${m.stops.indexOf(s) + 1}. ${tx(s.title)}</b><span>${tx(s.when)} · ${s.media.length} photos and videos</span>`
    : `<b>${esc(m.city)}, ${esc(m.country)}</b><span>Mobility ${m.n} · ${tx(m.date)} · Tap a pin to see the place</span>`;
  $('mapLegend').textContent = `Mobility ${m.n} · ${m.city}`;
}

/* ---------- lista locurilor ---------- */
function locuri() {
  const m = S.mob(mob);
  $('stops').innerHTML = m.stops.map((s, i) => {
    const f = filtre[s.id] || 'all';
    const media = s.media.filter(x => f === 'all' || x.type === f);
    const vis = media.slice(0, 6);
    const rest = media.length - vis.length;
    return `
    <article class="glass card stop${s.id === activ ? ' on' : ''}" id="stop-${s.id}" data-stop="${s.id}">
      <div class="stop-head"><span class="stop-n">${i + 1}</span><div><h3>${tx(s.title)}</h3><div class="when">${tx(s.when)}</div></div></div>
      <p>${tx(s.text)}</p>
      <div class="stop-media">${vis.map((x, j) => `<button type="button" data-j="${j}" aria-label="Open ${esc(x.caption)}">${tile(x)}${j === 5 && rest > 0 ? `<span class="more-n">+${rest}</span>` : ''}</button>`).join('') || '<span class="small">Nothing here yet.</span>'}</div>
      <div class="stop-foot">
        <div class="seg glass" role="group" aria-label="Filter media">${[['all', 'All'], ['photo', 'Photos'], ['video', 'Videos']].map(([id, t]) => `<button type="button" data-f="${id}" aria-pressed="${id === f}">${t}</button>`).join('')}</div>
        <span class="count">${media.length} ${media.length === 1 ? 'item' : 'items'}</span>
      </div>
    </article>`;
  }).join('');
  $('stops').querySelectorAll('.stop').forEach(card => {
    const s = m.stops.find(x => x.id === card.dataset.stop);
    card.addEventListener('click', e => { if (!e.target.closest('button')) selecteaza(s.id, false); });
    card.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filtre[s.id] = b.dataset.f; locuri(); selecteaza(s.id, false);
      const nb = document.querySelector(`#stop-${s.id} [data-f="${b.dataset.f}"]`); if (nb) nb.focus();
    }));
    card.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => {
      const f = filtre[s.id] || 'all';
      U.lightbox(s.media.filter(x => f === 'all' || x.type === f), +b.dataset.j);
      selecteaza(s.id, false);
    }));
  });
}

function selecteaza(id, dinHarta) {
  activ = id;
  document.querySelectorAll('.pin').forEach(p => p.classList.toggle('on', p.dataset.stop === id));
  document.querySelectorAll('.stop').forEach(c => c.classList.toggle('on', c.dataset.stop === id));
  // pinul activ desenat ultimul, ca sa fie deasupra
  const pin = document.querySelector(`.pin[data-stop="${id}"]`); if (pin) pin.parentNode.appendChild(pin);
  info();
  if (dinHarta) {
    const c = $('stop-' + id);
    if (c) c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: innerWidth > 1000 ? 'center' : 'nearest' });
  }
}

function alege(id, updateHash = true) {
  if (!S.mob(id)) return;
  mob = id; activ = null;
  if (updateHash) history.replaceState(history.state, '', '#' + id);
  overview(); taburi(); locuri(); harta();
}

/* pe ecran lat (harta sta pe loc): locul din mijlocul ecranului devine activ cand derulezi */
let spyT = 0;
addEventListener('scroll', () => {
  if (innerWidth <= 1000) return;
  cancelAnimationFrame(spyT);
  spyT = requestAnimationFrame(() => {
    const mid = innerHeight * 0.5; let best = null, bd = Infinity;
    document.querySelectorAll('.stop').forEach(c => { const r = c.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - mid); if (r.bottom > 0 && r.top < innerHeight && d < bd) { bd = d; best = c; } });
    const det = $('detail').getBoundingClientRect();
    if (best && det.top < innerHeight * 0.35 && best.dataset.stop !== activ) selecteaza(best.dataset.stop, false);
  });
}, { passive: true, signal });

addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S.mob(h) && h !== mob) alege(h); }, { signal });
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(() => { if (!signal.aborted) harta(); });
  observer.observe($('mapCard'));
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
} else addEventListener('resize', harta, { signal });
signal.addEventListener('abort', () => cancelAnimationFrame(spyT), { once: true });
// Selectia initiala nu creeaza o ancora: doar linkurile explicite duc la detalii.
alege(mob, false);
};
