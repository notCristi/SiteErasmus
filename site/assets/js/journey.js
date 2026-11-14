/* Pagina Journey: harta Europei, harta fiecarei mobilitati cu locurile, si pozele de la fiecare loc */
window.PageControllers = window.PageControllers || {};
window.PageControllers.journey = function (signal) {
const S = window.SITE, U = window.UI, { I, esc, tx, tile } = U;
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
// cele 5 rubrici ale unei mobilitati (cerute de proiect, aceleasi la toate trei): [id, numele scurt din tab, numele intreg]
const RUBRICI = [
  ['about', 'About', 'About the mobility'],
  ['materials', 'Materials', 'Learning materials & student projects'],
  ['daily', 'Daily activities', 'Daily activities'],
  ['results', 'Results', 'Evaluation & results'],
  ['dissemination', 'Dissemination', 'Dissemination'],
];
// adresa: journey.html#ro = Brasov, journey.html#ro-materials = Brasov, rubrica Materials
function dinAdresa() {
  let h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
  const [m, r] = h.split('-');
  return { m: S.mob(m) ? m : null, r: RUBRICI.some(x => x[0] === r) ? r : null };
}
const start = dinAdresa();
let mob = start.m || S.mobilities[0].id;
let rubrica = start.r || 'about';
let activ = null;
const nPlaces = n => `${n} ${n === 1 ? 'place' : 'places'}`;
const nMedia = n => `${n} ${n === 1 ? 'photo or video' : 'photos and videos'}`;
const filtre = {};   // filtrul (toate / poze / video) pentru fiecare loc

/* ---------- harta Europei + lista mobilitatilor ---------- */
// alegi o calatorie din harta Europei sau din lista: se deschide jos, la detalii
const mergiLa = id => { alege(id); $('mobTabs').querySelector('[aria-selected="true"]')?.focus({ preventScroll: true }); $('detail').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
function overview() {
  // doua straturi: harta desenata de noi (apare pe loc) si, peste ea, harta reala (apare cand i s-au incarcat imaginile)
  const box = $('europe');
  if (!box.querySelector('.eu-svg')) box.innerHTML = '<div class="eu-svg"></div><div class="eu-real" id="europeReal"></div>';
  const svgBox = box.querySelector('.eu-svg');
  svgBox.innerHTML = U.europe({ active: mob, interactive: true });
  $('mobList').innerHTML = S.mobilities.map(m => `
    <button type="button" class="glass mob-item${m.id === mob ? ' on' : ''}" data-mob="${m.id}" aria-pressed="${m.id === mob}">
      <span class="n">${m.n}</span>
      <span><b>${esc(m.city)}</b><span class="meta">${esc(m.country)} · ${tx(m.date)} · ${nPlaces(m.stops.length)}</span></span>
      <span class="arrow" style="margin:0">${I.arrow}</span>
    </button>`).join('');
  const go = mergiLa;
  svgBox.querySelectorAll('.city').forEach(g => {
    g.addEventListener('click', () => go(g.dataset.mob));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(g.dataset.mob); } });
  });
  $('mobList').querySelectorAll('[data-mob]').forEach(b => b.addEventListener('click', () => go(b.dataset.mob)));
  europaReala();
}

/* ---------- harta Europei pe harta reala ----------
   Aceeasi biblioteca si aceleasi imagini ca la harta fiecarei mobilitati (vezi mai jos). Nu se misca si nu are zoom:
   e doar o vedere de ansamblu, cu cele trei tari, drumul dintre orase si orasele ca butoane.
   Cand pagina e deschisa cu dublu click (file://) sau fara internet, ramane harta desenata de noi. */
let EU = null, euCerut = false;
function incarcaScript(src) {
  const toate = window.__scriptLoads || (window.__scriptLoads = {});
  return toate[src] || (toate[src] = new Promise(gata => {
    const js = document.createElement('script'); js.src = src;
    js.onload = () => gata(true); js.onerror = () => gata(false);
    document.head.append(js);
    setTimeout(() => gata(false), 5000);
  }));
}
function oraseEU() {
  if (!EU) return;
  const L = window.L;
  EU.pins.clearLayers();
  const vest = Math.min(...S.mobilities.map(m => m.stops[0].lon));
  for (const m of S.mobilities) {
    const c = m.stops[0], on = m.id === mob, nume = `${m.city}, ${m.country}`;
    const marker = L.marker([c.lat, c.lon], {
      icon: L.divIcon({ className: 'ecity-wrap', iconSize: [0, 0], html:
        `<span class="ecity${on ? ' on' : ''}"><i class="halo"></i><i class="core"></i><span class="lbl${c.lon === vest ? ' l' : ''}"><b>${esc(m.city)}</b><small>${esc(m.country).toUpperCase()} · ${m.n}</small></span></span>` }),
      keyboard: true, title: nume, alt: nume, zIndexOffset: on ? 1000 : 0,
    });
    marker.on('click', () => mergiLa(m.id));
    EU.pins.addLayer(marker);
    marker.getElement()?.setAttribute('aria-pressed', on);
  }
}
function europaReala() {
  if (location.protocol === 'file:') return;
  if (EU) { oraseEU(); return; }
  if (!window.L) {
    if (!euCerut) {
      euCerut = true;
      Promise.all([incarcaLeaflet(), incarcaScript('assets/js/countries.js')]).then(([ok]) => { if (!signal.aborted && ok && window.L) europaReala(); });
    }
    return;
  }
  const L = window.L, box = $('europe'), el = $('europeReal'), svgBox = box.querySelector('.eu-svg');
  if (!el) return;
  const map = L.map(el, { zoomControl: false, dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0.25 });
  map.attributionControl.setPrefix(false);
  const tiles = L.tileLayer(TILES, { attribution: TILES_CREDIT, maxZoom: 19 }).addTo(map);
  // cele trei tari, colorate
  const tari = window.COUNTRIES || {};
  for (const m of S.mobilities) if (tari[m.id]) L.polygon(tari[m.id], { color: '#9DB8FF', weight: 1.2, opacity: 0.85, fillColor: '#3D6BFF', fillOpacity: 0.26, interactive: false }).addTo(map);
  // drumul, in ordinea mobilitatilor
  const orase = S.mobilities.map(m => m.stops[0]), ll = [];
  for (let i = 0; i < orase.length - 1; i++) ll.push(...curba(orase[i], orase[i + 1], i === 0 ? -0.12 : 0.2));
  const ultim = orase[orase.length - 1]; ll.push([ultim.lat, ultim.lon]);
  L.polyline(ll, { color: '#FFCC00', weight: 10, opacity: 0.2, lineCap: 'round', interactive: false }).addTo(map);
  L.polyline(ll, { color: '#FFCC00', weight: 2.6, opacity: 0.95, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(map);
  // toate cele trei orase pe ecran, cu loc pe margini pentru numele lor
  const fit = () => {
    map.invalidateSize();
    const lat = Math.min(100, el.clientWidth * 0.2);
    map.fitBounds(L.latLngBounds(orase.map(c => [c.lat, c.lon])), { paddingTopLeft: [lat, 44], paddingBottomRight: [lat + 16, 48], animate: false });
  };
  EU = { map, pins: L.layerGroup().addTo(map) };
  fit(); oraseEU();
  // harta reala apare abia cand are imaginile; pana atunci (si daca nu vin) ramane cea desenata
  tiles.once('load', () => { box.classList.add('real'); svgBox.inert = true; svgBox.setAttribute('aria-hidden', 'true'); });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => { if (EU) { fit(); oraseEU(); } });
    ro.observe(box);
    signal.addEventListener('abort', () => ro.disconnect(), { once: true });
  }
  signal.addEventListener('abort', () => { map.remove(); EU = null; }, { once: true });
}

/* ---------- taburile ---------- */
function taburi() {
  // taburile se construiesc o singura data; cand alegi alt oras se muta doar pastila
  if (!$('mobTabs').querySelector('[data-mob]')) {
    $('mobTabs').innerHTML = S.mobilities.map(m => `<button type="button" role="tab" aria-selected="${m.id === mob}" data-mob="${m.id}">${esc(m.city)}<small>${m.n}</small></button>`).join('');
    const tabs = [...$('mobTabs').querySelectorAll('[data-mob]')];
    const pick = id => { if (id !== mob) alege(id); $('mobTabs').querySelector('[aria-selected="true"]')?.focus({ preventScroll: true }); };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => pick(b.dataset.mob));
      b.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        pick(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].dataset.mob);
      });
    });
  }
  U.segSet($('mobTabs'), 'aria-selected', b => b.dataset.mob === mob);
  const m = S.mob(mob);
  $('mobInfo').innerHTML = `${I.pin}<span>${esc(m.country)} · ${tx(m.date)} · ${nPlaces(m.stops.length)} · ${nMedia(m.stops.reduce((n, s) => n + s.media.length, 0))}</span>`;
  $('mobInfo').querySelector('svg').style.cssText = 'width:16px;height:16px;flex:none';
}

/* ---------- harta locala ---------- */
/* Harta fiecarei mobilitati e o harta adevarata (strazi, orase, relief de drumuri), pe care se poate da zoom.
   - Biblioteca hartii (Leaflet) e pe site, in assets/vendor/leaflet. Se incarca doar cand deschizi Daily activities.
   - Imaginile hartii vin de pe internet, de la adresa din TILES (OpenStreetMap). De aceea in coltul
     hartii scrie de unde sunt (e obligatoriu) si tot de aceea e pomenit in legal.html.
   - Daca biblioteca sau internetul nu merg, apare harta simpla, desenata de noi (hartaSimpla, mai jos).
   Culoarea hartii: --map-filter din pages.css. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const faraMiscare = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let LM = null;              // harta reala: { map, mob, lines, pins, zile }
let leafletPicat = false;   // biblioteca nu s-a putut incarca: ramanem la harta simpla
function incarcaLeaflet() {
  return window.__leafletLoad || (window.__leafletLoad = new Promise(gata => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'assets/vendor/leaflet/leaflet.css';
    const js = document.createElement('script'); js.src = 'assets/vendor/leaflet/leaflet.js';
    js.onload = () => gata(!!window.L); js.onerror = () => gata(false);
    document.head.append(css, js);
    setTimeout(() => gata(!!window.L), 5000);
  }));
}
function harta() {
  if ($('hubDaily').hidden) return;   // harta se deseneaza doar cand rubrica Daily activities e pe ecran
  if (window.L) { hartaReala(); return; }
  if (leafletPicat) { hartaSimpla(); return; }
  info();
  incarcaLeaflet().then(ok => { if (signal.aborted) return; if (!ok) leafletPicat = true; harta(); });
}

// distanta in km intre doua locuri (destul de exacta pentru cativa zeci de km)
const km = (a, b) => Math.hypot((b.lon - a.lon) * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180) * 111.32, (b.lat - a.lat) * 111.32);
// drumul dintre doua locuri: un arc usor curbat (nu e drumul de pe sosea, doar leaga locurile)
function curba(a, b, indoire = 0.16) {
  if (km(a, b) < 2) return [[a.lat, a.lon]];
  const k = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
  const ax = a.lon * k, ay = a.lat, bx = b.lon * k, by = b.lat;
  const cx = (ax + bx) / 2 - (by - ay) * indoire, cy = (ay + by) / 2 + (bx - ax) * indoire;
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const t = i / 28, u = 1 - t;
    pts.push([u * u * ay + 2 * u * t * cy + t * t * by, (u * u * ax + 2 * u * t * cx + t * t * bx) / k]);
  }
  return pts;
}
// cate un traseu pentru fiecare zi: pleaca de la primul loc al mobilitatii (scoala) si trece prin locurile zilei
function trasee() {
  const L = window.L, m = S.mob(mob), baza = m.stops[0], grupe = [];
  LM.lines.clearLayers(); LM.zile = [];
  // fara imagini de harta, numele din data.js (labels) arata unde suntem
  if (LM.faraImagini) for (const l of m.labels) {
    LM.lines.addLayer(L.marker([l.lat, l.lon], { icon: L.divIcon({ className: 'mlabel', iconSize: [0, 0], html: `<span>${esc(l.t)}</span>` }), interactive: false, keyboard: false }));
  }
  for (const s of m.stops) {
    const g = grupe[grupe.length - 1];
    if (g && g.when === s.when) g.stops.push(s); else grupe.push({ when: s.when, stops: [s] });
  }
  for (const g of grupe) {
    const pts = g.stops[0] === baza ? g.stops : [baza, ...g.stops];
    if (pts.length < 2) continue;
    const ll = [];
    for (let i = 0; i < pts.length - 1; i++) ll.push(...curba(pts[i], pts[i + 1]));
    const last = pts[pts.length - 1]; ll.push([last.lat, last.lon]);
    const glow = L.polyline(ll, { color: '#FFCC00', weight: 10, opacity: 0.2, lineCap: 'round', interactive: false });
    const line = L.polyline(ll, { color: '#FFCC00', weight: 3, opacity: 0.9, dashArray: '2 9', lineCap: 'round', interactive: false });
    LM.lines.addLayer(glow).addLayer(line);
    LM.zile.push({ ids: g.stops.map(s => s.id), glow, line });
  }
}
// pinii. Locurile care la zoomul curent ar sta unul peste altul apar ca un singur pin ("1–3"); click pe el apropie harta.
function pini() {
  if (!LM) return;
  const L = window.L, m = S.mob(mob), map = LM.map, grupe = [];
  LM.pins.clearLayers();
  m.stops.forEach((s, i) => {
    const p = map.latLngToLayerPoint([s.lat, s.lon]);
    const g = grupe.find(x => Math.hypot(x.p.x - p.x, x.p.y - p.y) < 32);
    if (g) g.it.push({ s, i }); else grupe.push({ p, it: [{ s, i }] });
  });
  for (const g of grupe) {
    const n = g.it.length, nums = g.it.map(x => x.i + 1), on = g.it.some(x => x.s.id === activ);
    const sir = nums.every((v, k) => k === 0 || v === nums[k - 1] + 1);
    const label = n === 1 ? nums[0] : sir ? `${nums[0]}–${nums[n - 1]}` : nums.join(' · ');
    const nume = n === 1 ? `${nums[0]}. ${g.it[0].s.title}` : `Places ${label}. Zoom in`;
    const marker = L.marker([g.it.reduce((t, x) => t + x.s.lat, 0) / n, g.it.reduce((t, x) => t + x.s.lon, 0) / n], {
      icon: L.divIcon({ className: 'mpin-wrap', iconSize: [0, 0], html: `<span class="mpin${on ? ' on' : ''}${n > 1 ? ' multi' : ''}">${label}</span>` }),
      keyboard: true, title: nume, alt: nume, zIndexOffset: on ? 1000 : 0,
    });
    marker.on('click', () => {
      if (n === 1) { selecteaza(g.it[0].s.id, true, true); return; }
      map.fitBounds(L.latLngBounds(g.it.map(x => [x.s.lat, x.s.lon])).pad(0.6), { maxZoom: 17, animate: !faraMiscare(), duration: 0.8 });
    });
    LM.pins.addLayer(marker);
  }
  // traseul zilei din care face parte locul ales ramane aprins, celelalte se sting
  for (const z of LM.zile) {
    const aprins = !activ || z.ids.includes(activ);
    z.line.setStyle({ opacity: aprins ? 0.95 : 0.25 }); z.glow.setStyle({ opacity: aprins ? 0.22 : 0.04 });
  }
}
// toata calatoria pe ecran (lasa loc sus pentru eticheta si jos pentru caseta)
function intreaga(anim) {
  const m = S.mob(mob);
  LM.map.fitBounds(window.L.latLngBounds(m.stops.map(s => [s.lat, s.lon])), { paddingTopLeft: [48, 74], paddingBottomRight: [48, 136], maxZoom: 15, animate: anim && !faraMiscare(), duration: 0.9 });
}
// harta se duce la un loc: aproape de tot daca are vecini la mai putin de 1,5 km (in oras), altfel mai de sus
function zboaraLa(s) {
  const m = S.mob(mob), map = LM.map;
  const z = m.stops.some(x => x !== s && km(x, s) < 1.5) ? 16 : 13;
  const c = map.unproject(map.project([s.lat, s.lon], z).add([0, 40]), z);   // putin mai sus, ca pinul sa nu stea sub caseta
  if (faraMiscare()) map.setView(c, z, { animate: false }); else map.flyTo(c, z, { duration: 1.1 });
}
function hartaReala() {
  const L = window.L, box = $('map');
  if (!LM) {
    box.innerHTML = '';
    // pe telefon harta se trage cu un deget si se mareste cu doua, ca in orice aplicatie de harti.
    // Pagina se deruleaza atingand in afara hartii (harta nu ocupa tot ecranul, vezi inaltimea .map-card din pages.css).
    const map = L.map(box, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 5, maxZoom: 18 });
    map.attributionControl.setPrefix(false);
    // Deschis cu dublu click (file://), OpenStreetMap refuza imaginile: cere ca pagina sa vina de la un site.
    // Atunci harta ramane fara imagini, doar cu numele locurilor, traseele si pinii. Cu porneste-site.bat sau pe internet apar si imaginile.
    const faraImagini = location.protocol === 'file:';
    if (faraImagini) {
      $('mapCard').classList.add('no-tiles');
      map.attributionControl.addAttribution('Map images appear when the site is online');
    } else L.tileLayer(TILES, { attribution: TILES_CREDIT, maxZoom: 19 }).addTo(map);
    LM = { map, mob: null, faraImagini, lines: L.layerGroup().addTo(map), pins: L.layerGroup().addTo(map), zile: [] };
    map.on('zoomend', pini);
    $('mapCard').classList.add('real');
    $('mapCard').insertAdjacentHTML('beforeend', `
      <div class="map-ctl" id="mapCtl">
        <button class="glass" type="button" data-z="1" aria-label="Zoom in"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="glass" type="button" data-z="-1" aria-label="Zoom out"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="glass" type="button" data-z="0" aria-label="Show the whole trip"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>`);
    $('mapCtl').addEventListener('click', e => {
      const b = e.target.closest('[data-z]'); if (!b || !LM) return;
      if (b.dataset.z === '0') intreaga(true); else LM.map.setZoom(LM.map.getZoom() + +b.dataset.z, { animate: !faraMiscare() });
    });
    signal.addEventListener('abort', () => { map.remove(); LM = null; }, { once: true });
  }
  LM.map.invalidateSize();
  if (LM.mob !== mob) { LM.mob = mob; trasee(); intreaga(false); }
  pini(); info();
}

/* ---------- harta simpla (de rezerva): desenata de noi, fara internet ---------- */
let geo = null;   // pozitiile pinilor, ca sa putem actualiza fara redesenare
function hartaSimpla() {
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

/* ---------- cele 5 rubrici ---------- */
const capRubrica = (m, id, extra = '') => {
  const i = RUBRICI.findIndex(x => x[0] === id);
  return `<div class="hub-head"><span class="eyebrow">Mobility ${m.n} · ${esc(m.city)} · ${i + 1} of 5</span><h2 class="h2">${esc(RUBRICI[i][2])}</h2>${extra}</div>`;
};
const extFisier = f => (f.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
const TIPURI = { PDF: ['pdf'], Presentation: ['ppt', 'pptx', 'pps', 'ppsx', 'odp'], Document: ['doc', 'docx', 'odt', 'rtf'], Spreadsheet: ['xls', 'xlsx', 'ods', 'csv'],
  Text: ['txt'], Archive: ['zip'], Image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'], Video: ['mp4', 'm4v', 'mov', 'webm'], Audio: ['mp3', 'm4a', 'wav', 'ogg'] };
const tipFisier = f => Object.keys(TIPURI).find(t => TIPURI[t].includes(extFisier(f))) || 'File';
// cum se arata un fisier in pagina: poza si video-ul se vad, sunetul se asculta, PDF-ul si textul se deschid, restul se descarca
const felFisier = f => ({ Image: 'image', Video: 'video', Audio: 'audio', PDF: 'open', Text: 'open' }[tipFisier(f)] || 'download');
const previewFisier = (f, alt, stream) => {
  const fel = felFisier(f);
  if (fel === 'image') return `<img class="file-prev" src="${esc(f)}" alt="${esc(alt || '')}" loading="lazy" decoding="async">`;
  // video-urile din Cloudflare Stream se vad in playerul lui; cele din R2, intr-un <video> obisnuit
  if (fel === 'video' && stream) return `<iframe class="file-prev" src="${esc(f)}" title="${esc(alt || 'Video')}" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  if (fel === 'video') return `<video class="file-prev" src="${esc(f)}" controls playsinline preload="metadata"></video>`;
  if (fel === 'audio') return `<audio class="file-audio" src="${esc(f)}" controls preload="none"></audio>`;
  return '';
};
const linkFisier = (f, open, down) => {
  const fel = felFisier(f);
  if (fel === 'video' || fel === 'audio') return '';
  return fel === 'download'
    ? `<a class="link-arrow" href="${esc(f)}" download>${down} ${I.ext}</a>`
    : `<a class="link-arrow" href="${esc(f)}" target="_blank" rel="noopener">${open}<span class="sr"> (opens in a new tab)</span> ${I.ext}</a>`;
};
const PANOURI = {
  about(m) {
    const a = m.about;
    return `
    <div class="split hub-about">
      ${a.photo ? `<div class="media pop"><img src="${esc(a.photo)}" alt="${esc(m.city)}, ${esc(m.country)}" loading="lazy" decoding="async"></div>`
        : `<div class="ph pop" style="--px:30%;--py:20%">${I.photo}<span>Photo · ${esc(m.city)}</span></div>`}
      <div class="pop" style="--i:1">
        ${capRubrica(m, 'about')}
        <div class="hub-tags"><span class="tag y">${tx(m.date)}</span><span class="tag">${esc(m.city)}, ${esc(m.country)}</span></div>
        <p class="hub-theme">${tx(a.theme)}</p>
        <p class="muted">${tx(a.text)}</p>
      </div>
    </div>
    <div class="grid hub-grid">
      <div class="glass card pop" style="--i:2"><h3 class="h3">Goals</h3><ul class="hub-list">${a.goals.map(g => `<li>${tx(g)}</li>`).join('')}</ul></div>
      <div class="glass card pop" style="--i:3"><h3 class="h3">Schools and countries</h3><ul class="hub-list">${S.schools.map(s => `<li>${esc(s.name)} · ${esc(s.country)}</li>`).join('')}</ul></div>
      <div class="glass card pop" style="--i:4"><h3 class="h3">Participating groups</h3><p class="muted">${tx(a.groups)}</p></div>
      <div class="glass card pop" style="--i:5"><h3 class="h3">Programme</h3><p class="muted">The full programme of the mobility, day by day.</p>
        <div class="btn-row">${a.programme
          ? `<a class="btn btn--solid" href="${esc(a.programme)}" target="_blank" rel="noopener">Open the programme (PDF)<span class="sr"> (opens in a new tab)</span> ${I.ext}</a>`
          : `<span class="btn glass" aria-disabled="true"><span class="ph-txt">[Programme PDF]</span></span>`}</div>
      </div>
    </div>`;
  },
  materials(m) {
    let k = 0;
    return capRubrica(m, 'materials', '<p class="muted">The learning materials used during the mobility and what the students made.</p>') +
      S.materialCats.map(c => {
        const items = m.materials.filter(x => x.cat === c.id);
        return `
      <section class="mat-cat">
        <div class="mat-head"><span class="mat-letter" aria-hidden="true">${c.id.toUpperCase()}</span><div><h3 class="h3">${esc(c.name)}</h3><p class="muted">${esc(c.text)}</p></div></div>
        <div class="grid mat-list">${items.map(x => {
          const inner = `<span class="tag b">${x.file ? tipFisier(x.file) : 'Coming soon'}</span><b>${tx(x.title)}</b>${x.by ? `<span class="small">${tx(x.by)}</span>` : ''}`;
          if (!x.file) return `<div class="glass card mat pop" style="--i:${k++}">${inner}</div>`;
          const fel = felFisier(x.file), prev = previewFisier(x.file, x.title, x.stream);
          if (fel === 'video' || fel === 'audio') return `<div class="glass card mat mat--play pop" style="--i:${k++}">${prev}${inner}</div>`;   // se reda direct in card
          return fel === 'download'
            ? `<a class="glass card mat pop" style="--i:${k++}" href="${esc(x.file)}" download>${inner}<span class="link-arrow">Download ${I.ext}</span></a>`
            : `<a class="glass card mat pop" style="--i:${k++}" href="${esc(x.file)}" target="_blank" rel="noopener">${prev}${inner}<span class="link-arrow">Open<span class="sr"> (opens in a new tab)</span> ${I.ext}</span></a>`;
        }).join('') || '<p class="glass entries-empty">Nothing here yet.</p>'}</div>
      </section>`;
      }).join('');
  },
  results(m) {
    return capRubrica(m, 'results', '<p class="muted">What students and teachers thought about the mobility, and what we take from it.</p>') +
      `<div class="grid hub-grid">${m.results.map((r, i) => `<div class="glass card pop" style="--i:${i}"><h3 class="h3">${tx(r.title)}</h3>${
        // textele urcate prin UPLOAD stau unul sub altul; pana vine primul, ramane textul din data.js
        r.entries?.length ? `<div class="res-list">${r.entries.map(e => `<div class="res-entry"><p class="muted">${tx(e.text)}</p>${e.file ? (felFisier(e.file) === 'image' ? `<a class="file-link" href="${esc(e.file)}" target="_blank" rel="noopener">${previewFisier(e.file, 'Attached image')}<span class="sr"> (opens in a new tab)</span></a>` : previewFisier(e.file, '', e.stream)) + linkFisier(e.file, felFisier(e.file) === 'image' ? 'Open the image' : 'Open the file', `Download the file (${tipFisier(e.file)})`) : ''}</div>`).join('')}</div>`
          : `<p class="muted">${tx(r.text)}</p>`}</div>`).join('')}</div>`;
  },
  dissemination(m) {
    return capRubrica(m, 'dissemination', '<p class="muted">Where we told others about the mobility: the school website, social media, the press and our school community.</p>') +
      `<div class="grid mat-list">${m.dissemination.map((x, i) => {
        const inner = `<span class="tag y">${tx(x.where)}</span><b>${tx(x.title)}</b>`;
        return x.url
          ? `<a class="glass card mat pop" style="--i:${i}" href="${esc(x.url)}" target="_blank" rel="noopener">${inner}<span class="link-arrow">Open<span class="sr"> (opens in a new tab)</span> ${I.ext}</span></a>`
          : `<div class="glass card mat pop" style="--i:${i}">${inner}</div>`;
      }).join('')}</div>`;
  },
};
// rubrica 3: zilele mobilitatii (fiecare duce la articolul ei din jurnal); harta si locurile sunt mai jos, in pagina
function zile() {
  const m = S.mob(mob);
  $('days').innerHTML = capRubrica(m, 'daily', '<p class="muted">Every day of the mobility, in order. Below, the places we visited are on the map, with photos and videos.</p>') +
    `<div class="grid days-list">${m.days.map((d, i) => {
      const inner = `<div class="entry-meta"><span class="tag b">${tx(d.day)}</span><span>${tx(d.date)}</span></div><b>${tx(d.title)}</b><p>${tx(d.text)}</p>`;
      return S.journal.some(e => e.id === d.journal)
        ? `<a class="glass card mat day pop" style="--i:${i}" href="journal.html#${esc(d.journal)}">${inner}<span class="link-arrow">Read the day ${I.arrow}</span></a>`
        : `<div class="glass card mat day pop" style="--i:${i}">${inner}</div>`;
    }).join('')}</div>`;
}
function hub() {
  const box = $('hubTabs');
  // taburile se construiesc o singura data; cand alegi alta rubrica se muta doar pastila
  if (!box.querySelector('[data-r]')) {
    box.innerHTML = RUBRICI.map(([id, t]) => `<button type="button" role="tab" aria-selected="${id === rubrica}" data-r="${id}">${t}</button>`).join('');
    const tabs = [...box.querySelectorAll('[data-r]')];
    const pick = b => { if (b.dataset.r !== rubrica) { rubrica = b.dataset.r; adresa(); hub(); } b.focus({ preventScroll: true }); };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        pick(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]);
      });
    });
  }
  U.segSet(box, 'aria-selected', b => b.dataset.r === rubrica);
  const daily = rubrica === 'daily';
  $('hubDaily').hidden = !daily; $('hubBody').hidden = daily;
  if (daily) { $('hubBody').innerHTML = ''; zile(); harta(); }
  else $('hubBody').innerHTML = PANOURI[rubrica](S.mob(mob));
}
// adresa tine minte orasul si rubrica, ca linkul sa poata fi trimis mai departe
function adresa() { history.replaceState(history.state, '', '#' + mob + (rubrica === 'about' ? '' : '-' + rubrica)); }

function info() {
  const m = S.mob(mob), s = m.stops.find(x => x.id === activ);
  $('mapBox').innerHTML = s
    ? `<b>${m.stops.indexOf(s) + 1}. ${tx(s.title)}</b><span>${tx(s.when)} · ${nMedia(s.media.length)}</span>`
    : `<b>${esc(m.city)}, ${esc(m.country)}</b><span>Mobility ${m.n} · ${tx(m.date)} · Tap a pin to see the place</span>`;
  $('mapLegend').textContent = `Mobility ${m.n} · ${m.city}`;
}

/* ---------- lista locurilor ---------- */
// pozele unui loc, dupa filtrul lui (primele 6; pe a sasea scrie cate mai sunt)
function mediaLoc(s) {
  const f = filtre[s.id] || 'all';
  const media = s.media.filter(x => f === 'all' || x.type === f);
  const vis = media.slice(0, 6), rest = media.length - vis.length;
  return { media, f,
    html: vis.map((x, j) => `<button type="button" class="pop" style="--i:${j}" data-j="${j}" aria-label="Open ${esc(x.caption)}">${tile(x)}${j === 5 && rest > 0 ? `<span class="more-n">+${rest}</span>` : ''}</button>`).join('') || '<span class="small">Nothing here yet.</span>',
    count: `${media.length} ${media.length === 1 ? 'item' : 'items'}` };
}
function locuri() {
  const m = S.mob(mob);
  $('stops').innerHTML = m.stops.map((s, i) => {
    const { f, html, count } = mediaLoc(s);
    return `
    <article class="glass card stop${s.id === activ ? ' on' : ''}" id="stop-${s.id}" data-stop="${s.id}">
      <div class="stop-head"><span class="stop-n">${i + 1}</span><div><h3>${tx(s.title)}</h3><div class="when">${tx(s.when)}</div></div></div>
      <p>${tx(s.text)}</p>
      <div class="stop-media">${html}</div>
      <div class="stop-foot">
        <div class="seg glass" role="group" aria-label="Filter media">${[['all', 'All'], ['photo', 'Photos'], ['video', 'Videos']].map(([id, t]) => `<button type="button" data-f="${id}" aria-pressed="${id === f}">${t}</button>`).join('')}</div>
        <span class="count">${count}</span>
      </div>
    </article>`;
  }).join('');
  $('stops').querySelectorAll('.stop').forEach(card => {
    const s = m.stops.find(x => x.id === card.dataset.stop);
    U.segPill(card.querySelector('.seg'));
    card.addEventListener('click', e => {
      const fb = e.target.closest('[data-f]'), jb = e.target.closest('[data-j]');
      if (fb) {   // filtrul schimba doar pozele acestui loc; selectorul ramane pe loc
        if (fb.dataset.f !== (filtre[s.id] || 'all')) {
          filtre[s.id] = fb.dataset.f;
          const now = mediaLoc(s);
          card.querySelector('.stop-media').innerHTML = now.html;
          card.querySelector('.stop-foot .count').textContent = now.count;
          U.segSet(card.querySelector('.seg'), 'aria-pressed', b => b.dataset.f === now.f);
        }
        selecteaza(s.id, false);
      } else if (jb) {
        U.lightbox(mediaLoc(s).media, +jb.dataset.j);
        selecteaza(s.id, false);
      } else if (!e.target.closest('button')) selecteaza(s.id, false, true);
    });
  });
}

// zbor = harta reala se duce la locul ales (la click pe un pin sau pe cardul locului, nu cand doar derulezi)
function selecteaza(id, dinHarta, zbor = false) {
  activ = id;
  document.querySelectorAll('.pin').forEach(p => p.classList.toggle('on', p.dataset.stop === id));
  document.querySelectorAll('.stop').forEach(c => c.classList.toggle('on', c.dataset.stop === id));
  // pinul activ desenat ultimul, ca sa fie deasupra
  const pin = document.querySelector(`.pin[data-stop="${id}"]`); if (pin) pin.parentNode.appendChild(pin);
  info();
  if (LM) {
    pini();
    const s = S.mob(mob).stops.find(x => x.id === id);
    if (zbor && s) zboaraLa(s);
  }
  if (dinHarta) {
    const c = $('stop-' + id);
    if (c) c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: innerWidth > 1000 ? 'center' : 'nearest' });
  }
}

function alege(id, updateHash = true) {
  if (!S.mob(id)) return;
  mob = id; activ = null;
  if (updateHash) adresa();
  overview(); taburi(); locuri(); harta(); hub();
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

addEventListener('hashchange', () => {
  const { m, r } = dinAdresa();
  if (!m) return;
  // un link fara rubrica (#ro) inseamna About
  const noua = r || 'about';
  const altaRubrica = noua !== rubrica;
  rubrica = noua;
  if (m !== mob) alege(m); else if (altaRubrica) hub();
}, { signal });
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(() => { if (!signal.aborted) harta(); });
  observer.observe($('mapCard'));
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
} else addEventListener('resize', harta, { signal });
signal.addEventListener('abort', () => cancelAnimationFrame(spyT), { once: true });
// Selectia initiala nu creeaza o ancora: doar linkurile explicite duc la detalii.
alege(mob, false);
};
