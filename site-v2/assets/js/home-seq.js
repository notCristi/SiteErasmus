/* Prima pagina, dupa ERASMUS+: textul care se scrie singur.
     THREE SCHOOLS -> THREE COUNTRIES -> ONE SHARED STORY -> TOLD BY THE STUDENTS WHO LIVED IT.
   STORY e desenat din "materiale" (crosetat, graffiti, confetti, neon, hartie rupta, mozaic).
   La final linia de sub WHO LIVED IT urca si sterge textul; home.js arata apoi coloanele.
   Textele si timpii sunt in functia play(), jos. */
(() => {
const $ = id => document.getElementById(id);
const seq = $('seq'), box = $('seqBox'), line = $('seqLine');
if (!seq) return;
const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = t => 1 - Math.pow(1 - t, 3);
const DPR = Math.min(2, window.devicePixelRatio || 1);
const DISP = 'Big Shoulders Display';

/* ---------- fonturile ---------- */
// fonturile prin care trece WHO LIVED IT, in ordine. mic = scris "Who lived it." (la fonturile de mana arata mai bine)
const STILURI = [
  { fam: 'Abril Fatface' }, { fam: 'Bungee' }, { fam: 'Pacifico', mic: true }, { fam: 'VT323' }, { fam: 'Bangers' },
  { fam: 'UnifrakturCook', g: 700, mic: true }, { fam: 'Orbitron', g: 900 }, { fam: 'Lobster', mic: true }, { fam: 'Black Ops One' },
  { fam: 'Amatic SC', g: 700 }, { fam: 'Press Start 2P' }, { fam: 'Monoton' }, { fam: 'Playfair Display', g: 900, italic: true },
  { fam: 'Creepster' }, { fam: 'Dancing Script', g: 700, mic: true }, { fam: 'Sedgwick Ave Display' }, { fam: 'Rye' },
  { fam: 'Titan One' }, { fam: 'Fredoka', g: 600 }, { fam: 'Inter', g: 300, k: 0.8 },
];
// Mai sunt in assets/fonts, daca vrei sa le pui inapoi in lista: 'Shrikhand', 'Rubik Mono One', 'Alfa Slab One', 'Audiowide', 'Righteous', { fam: 'Cinzel Decorative', g: 900 }
const FONTURI = [['800', DISP], ['900', 'Inter']].concat(STILURI.map(s => [(s.italic ? 'italic ' : '') + (s.g || 400), s.fam]));
let fonturi = null;
function incarcaFonturi() {
  if (fonturi) return fonturi;
  const toate = document.fonts && document.fonts.load
    ? Promise.all(FONTURI.map(([g, f]) => document.fonts.load(`${g} 48px "${f}"`, 'STORYWholivedit.').catch(() => {})))
    : Promise.resolve();
  // daca un font nu vine in 3 secunde mergem mai departe cu ce avem
  return (fonturi = Promise.race([toate, new Promise(r => setTimeout(r, 3000))]));
}

/* ---------- unelte de desen ---------- */
const mc = document.createElement('canvas').getContext('2d');
const capCache = {};
function capDin(fam, g) {   // inaltimea majusculelor, ca parte din marimea fontului
  const k = g + fam;
  if (!capCache[k]) { mc.font = `${g} 200px "${fam}"`; capCache[k] = (mc.measureText('H').actualBoundingBoxAscent || 140) / 200; }
  return capCache[k];
}
function rndCu(seed) {   // numere "la intamplare" care ies la fel de fiecare data
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function panza(B) {   // un canvas de marimea literei, in pixeli CSS
  const c = document.createElement('canvas');
  c.width = Math.round(B.W * DPR); c.height = Math.round(B.H * DPR);
  const x = c.getContext('2d');
  x.setTransform(DPR, 0, 0, DPR, 0, 0);
  x.lineJoin = x.lineCap = 'round';
  return { c, x };
}
// alege marimea fontului ca litera sa aiba inaltimea B.cap si sa incapa in latime; intoarce unde se deseneaza
function pune(x, ch, fam, g, B, lat = B.maxW) {
  let px = B.cap / capDin(fam, g);
  x.font = `${g} ${px}px "${fam}"`;
  let m = x.measureText(ch), w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  if (w > lat) { px *= lat / w; x.font = `${g} ${px}px "${fam}"`; m = x.measureText(ch); w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight; }
  return { px, x: B.cx - w / 2 + m.actualBoundingBoxLeft, y: B.base, w, st: B.cx - w / 2, dr: B.cx + w / 2 };
}
// litera plina, alba (o folosim ca masca si ca sa stim unde e "inauntru")
function masca(ch, fam, g, B, ingrosat = 0, lat) {
  const t = panza(B), p = pune(t.x, ch, fam, g, B, lat);
  t.x.fillStyle = t.x.strokeStyle = '#fff';
  t.x.fillText(ch, p.x, p.y);
  if (ingrosat) { t.x.lineWidth = ingrosat; t.x.strokeText(ch, p.x, p.y); }
  const d = t.x.getImageData(0, 0, t.c.width, t.c.height).data, w = t.c.width, h = t.c.height;
  const plin = (X, Y) => { const i = Math.round(X * DPR), j = Math.round(Y * DPR); return i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 120; };
  return { c: t.c, p, plin };
}
const peste = (x, c, op = 'source-over') => { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = op; x.drawImage(c, 0, 0); x.restore(); };
function nuanta(hex, k) {   // k < 0 mai inchis, k > 0 mai deschis
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`;
}
const umbra = (x, col, blur, dy = 0) => { x.shadowColor = col; x.shadowBlur = blur * DPR; x.shadowOffsetX = 0; x.shadowOffsetY = dy * DPR; };

/* ---------- materialele ---------- */
const MAT = {
  // tricotat / crosetat: randuri de ochiuri in V, in dungi, cu margine cusuta si scame
  crosetat(x, ch, B, rnd) {
    const M = masca(ch, 'Titan One', '400', B, B.cap * 0.03, B.maxW * 0.95);
    const t = panza(B), y = t.x;
    const lw = B.cap / 8.2, lh = B.cap / 6.4, pas = lh * 0.64;
    const dungi = ['#E4572E', '#E4572E', '#F6ECD8', '#2A6FDB', '#2A6FDB', '#FFC914'];
    for (let r = 0, yy = -lh; yy < B.H + lh; r++, yy += pas) {
      const col = dungi[r % dungi.length];
      y.fillStyle = nuanta(col, -0.45); y.fillRect(0, yy - pas / 2, B.W, pas + 1);
      for (let xx = -lw; xx < B.W + lw; xx += lw) {
        for (const s of [-1, 1]) {   // cele doua jumatati ale ochiului
          y.save(); y.translate(xx + lw / 2 + s * lw * 0.235, yy); y.rotate(s * -0.44);
          y.beginPath(); y.ellipse(0, 0, lw * 0.25, lh * 0.56, 0, 0, Math.PI * 2);
          y.fillStyle = col; y.fill();
          y.lineWidth = lw * 0.07; y.strokeStyle = nuanta(col, -0.3); y.stroke();
          y.beginPath(); y.ellipse(-s * lw * 0.05, -lh * 0.08, lw * 0.07, lh * 0.3, 0, 0, Math.PI * 2);
          y.fillStyle = nuanta(col, 0.3); y.globalAlpha = 0.55; y.fill(); y.globalAlpha = 1;
          y.restore();
        }
      }
    }
    peste(y, M.c, 'destination-in');
    y.globalCompositeOperation = 'source-atop';   // putin volum: lumina sus, umbra jos
    const g = y.createLinearGradient(0, B.base - B.cap, 0, B.base);
    g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
    y.fillStyle = g; y.fillRect(0, 0, B.W, B.H);
    y.globalCompositeOperation = 'source-over';
    y.font = `400 ${M.p.px}px "Titan One"`;   // marginea cusuta
    y.setLineDash([B.cap * 0.055, B.cap * 0.05]);
    y.lineWidth = B.cap * 0.05; y.strokeStyle = '#7C2A12'; y.strokeText(ch, M.p.x, M.p.y);
    y.lineWidth = B.cap * 0.022; y.strokeStyle = '#F6ECD8'; y.lineDashOffset = B.cap * 0.05; y.strokeText(ch, M.p.x, M.p.y);
    y.setLineDash([]);
    y.lineWidth = 0.7; y.strokeStyle = 'rgba(255,236,214,.55)';   // scamele de pe margine
    const st = B.cap * 0.022;
    for (let yy = B.base - B.cap * 1.1; yy < B.base + B.cap * 0.1; yy += st) for (let xx = M.p.st - st * 3; xx < M.p.dr + st * 3; xx += st) {
      if (!M.plin(xx, yy) || rnd() > 0.36) continue;
      const nx = (M.plin(xx - st, yy) ? 0 : -1) + (M.plin(xx + st, yy) ? 0 : 1), ny = (M.plin(xx, yy - st) ? 0 : -1) + (M.plin(xx, yy + st) ? 0 : 1);
      if (!nx && !ny) continue;
      const a = Math.atan2(ny, nx) + (rnd() - 0.5) * 1.4, l = B.cap * (0.018 + rnd() * 0.026);
      y.beginPath(); y.moveTo(xx, yy); y.lineTo(xx + Math.cos(a) * l, yy + Math.sin(a) * l); y.stroke();
    }
    umbra(x, 'rgba(0,0,0,.5)', B.cap * 0.1, B.cap * 0.045);
    peste(x, t.c);
  },

  // graffiti: contur gros, umplere in degrade, 3D, vopsea care curge, ceata de spray
  graffiti(x, ch, B, rnd) {
    const fam = 'Sedgwick Ave Display', lat = B.maxW * 0.86;
    const M = masca(ch, fam, '400', B, 0, lat), p = M.p, ex = B.cap * 0.07;
    x.font = `400 ${p.px}px "${fam}"`;
    for (let i = 0; i < 170; i++) {   // ceata de spray
      const a = rnd() * Math.PI * 2, r = Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)) * B.cap * 0.42;
      x.fillStyle = `rgba(${rnd() < 0.5 ? '255,46,136' : '255,170,40'},${0.1 + rnd() * 0.3})`;
      x.beginPath(); x.arc(B.cx + Math.cos(a) * r * 0.9, B.base - B.cap * 0.5 + Math.sin(a) * r, 0.4 + rnd() * B.cap * 0.014, 0, Math.PI * 2); x.fill();
    }
    const curge = [];   // unde curge vopseaua: cautam marginea de jos a literei
    for (let i = 0; i < 3; i++) {
      const xx = p.st + p.w * (0.14 + 0.36 * i + rnd() * 0.1);
      let yy = B.base + B.cap * 0.12; while (yy > B.base - B.cap && !M.plin(xx, yy)) yy -= 1;
      if (yy > B.base - B.cap * 0.5) curge.push([xx, yy, B.cap * (0.12 + rnd() * 0.24), B.cap * (0.035 + rnd() * 0.02)]);
    }
    const picaturi = (col, plus) => { x.strokeStyle = x.fillStyle = col;
      for (const [xx, yy, l, w] of curge) { x.lineWidth = w + plus; x.beginPath(); x.moveTo(xx, yy - B.cap * 0.06); x.lineTo(xx, yy + l); x.stroke(); x.beginPath(); x.arc(xx, yy + l, (w + plus) * 0.72, 0, Math.PI * 2); x.fill(); } };
    x.strokeStyle = '#fff'; x.lineWidth = B.cap * 0.2;   // marginea alba, ca la un autocolant
    x.strokeText(ch, p.x, p.y); x.strokeText(ch, p.x + ex, p.y + ex);
    picaturi('#fff', B.cap * 0.075);
    x.strokeStyle = x.fillStyle = '#17132A'; x.lineWidth = B.cap * 0.125;   // conturul negru + 3D spre dreapta-jos
    for (let i = 0; i <= ex; i += 0.75) { x.strokeText(ch, p.x + i, p.y + i); x.fillText(ch, p.x + i, p.y + i); }
    picaturi('#17132A', B.cap * 0.04);
    const g = x.createLinearGradient(0, B.base - B.cap, 0, B.base);
    g.addColorStop(0, '#FFF275'); g.addColorStop(0.48, '#FF8A1F'); g.addColorStop(1, '#FF2E88');
    x.fillStyle = g; x.fillText(ch, p.x, p.y);
    picaturi('#FF2E88', 0);
    const t = panza(B);   // luciul de sus
    t.x.font = x.font; t.x.fillStyle = '#fff'; t.x.fillText(ch, p.x, p.y);
    t.x.globalCompositeOperation = 'source-in';
    const g2 = t.x.createLinearGradient(0, B.base - B.cap, 0, B.base - B.cap * 0.5);
    g2.addColorStop(0, 'rgba(255,255,255,.8)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    t.x.fillStyle = g2; t.x.fillRect(0, 0, B.W, B.H);
    peste(x, t.c);
    x.fillStyle = '#fff';   // o steluta
    const sx = p.dr + B.cap * 0.02, sy = B.base - B.cap * 1.02, r = B.cap * 0.1;
    x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.22 : r; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    x.fill();
  },

  // confetti: litera e facuta din sute de bucatele colorate
  confetti(x, ch, B, rnd) {
    const M = masca(ch, 'Titan One', '400', B, 0, B.maxW * 0.98);
    const C = ['#FF3B6B', '#FFCC00', '#3D6BFF', '#2ED3A0', '#FF8A00', '#B26BFF', '#FCF9F2', '#6E9BFF'];
    const bucata = (xx, yy, k) => {
      x.save(); x.translate(xx, yy); x.rotate(rnd() * Math.PI);
      x.fillStyle = C[Math.floor(rnd() * C.length)];
      const tip = rnd(), u = B.cap * k;
      x.beginPath();
      if (tip < 0.55) x.rect(-u * 0.04, -u * 0.019, u * 0.08, u * 0.038);
      else if (tip < 0.82) x.arc(0, 0, u * 0.024, 0, Math.PI * 2);
      else { x.moveTo(0, -u * 0.035); x.lineTo(u * 0.032, u * 0.024); x.lineTo(-u * 0.032, u * 0.024); }
      x.fill(); x.restore();
    };
    umbra(x, 'rgba(0,0,0,.35)', 1.5, 1);
    for (let n = 0, i = 0; n < 560 && i < 30000; i++) {
      const xx = M.p.st + rnd() * M.p.w, yy = B.base - rnd() * B.cap * 1.04 + B.cap * 0.02;
      if (M.plin(xx, yy)) { bucata(xx, yy, 1); n++; }
    }
    for (let i = 0; i < 34; i++) {   // cateva care zboara in jur
      const a = rnd() * Math.PI * 2, r = B.cap * (0.62 + rnd() * 0.3);
      const xx = B.cx + Math.cos(a) * r * 0.8, yy = B.base - B.cap * 0.5 + Math.sin(a) * r;
      if (!M.plin(xx, yy)) { x.globalAlpha = 0.9; bucata(xx, yy, 0.85); }
    }
    x.globalAlpha = 1;
  },

  // mozaic: fontul are literele pe o grila; fiecare patratel devine o placuta
  mozaic(x, ch, B, rnd) {
    const t = document.createElement('canvas'); t.width = t.height = 140;
    const y = t.getContext('2d', { willReadFrequently: true });
    y.font = '400 80px "Press Start 2P"'; y.fillStyle = '#fff'; y.fillText(ch, 20, 110);
    const m = y.measureText(ch), d = y.getImageData(0, 0, 140, 140).data;
    const x0 = 20 - m.actualBoundingBoxLeft, y0 = 110 - m.actualBoundingBoxAscent;
    const nc = Math.max(1, Math.round((m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 10)), nr = Math.max(1, Math.round((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 10));
    const u = Math.min(B.cap / nr, B.maxW / nc), gx = B.cx - nc * u / 2, gy = B.base - nr * u;
    const cel = [];
    for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) if (d[(Math.round(y0 + j * 10 + 5) * 140 + Math.round(x0 + i * 10 + 5)) * 4 + 3] > 120) cel.push([gx + i * u, gy + j * u]);
    const rot = (X, Y, w, r) => { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, w, r); else x.rect(X, Y, w, w); };
    umbra(x, 'rgba(0,0,0,.5)', B.cap * 0.08, B.cap * 0.04);
    x.fillStyle = '#0A1230';   // chitul dintre placute
    for (const [X, Y] of cel) { rot(X - u * 0.06, Y - u * 0.06, u * 1.12, u * 0.2); x.fill(); }
    umbra(x, 'transparent', 0);
    const C = ['#3D6BFF', '#3D6BFF', '#6E9BFF', '#2449C9', '#FFCC00', '#FFCC00', '#FFD84D', '#FCF9F2'];
    for (const [X, Y] of cel) {
      const c = C[Math.floor(rnd() * C.length)];
      rot(X + u * 0.06, Y + u * 0.06, u * 0.88, u * 0.14); x.fillStyle = c; x.fill();
      const g = x.createLinearGradient(X, Y, X + u, Y + u);
      g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
      x.fillStyle = g; x.fill();
    }
  },

  // neon: tub luminos, cu stralucire
  neon(x, ch, B) {
    const p = pune(x, ch, 'Fredoka', '600', B, B.maxW * 0.86);
    x.font = `600 ${p.px}px "Fredoka"`;
    const col = '#FF2E88';
    umbra(x, col, B.cap * 0.42); x.strokeStyle = col; x.lineWidth = B.cap * 0.085;
    x.strokeText(ch, p.x, p.y); x.strokeText(ch, p.x, p.y);
    umbra(x, col, B.cap * 0.1); x.strokeStyle = '#FF8FC4'; x.lineWidth = B.cap * 0.05; x.strokeText(ch, p.x, p.y);
    umbra(x, 'transparent', 0); x.strokeStyle = '#FFF3FA'; x.lineWidth = B.cap * 0.02; x.strokeText(ch, p.x, p.y);
  },

  // hartie rupta dintr-o revista, lipita cu banda
  hartie(x, ch, B, rnd) {
    const H = [['#F3EBDD', '#17151C'], ['#FFD23F', '#17151C'], ['#E94F37', '#FCF9F2'], ['#F3EBDD', '#0B2A8A'], ['#17151C', '#FFCC00']];
    const [hartia, cerneala] = H[Math.floor(rnd() * H.length)];
    const w = B.maxW * 1.04, h = B.cap * 1.46, j = B.cap * 0.016;
    x.save(); x.translate(B.cx, B.base - B.cap / 2); x.rotate((rnd() - 0.5) * 0.17);
    const pct = [];   // conturul rupt
    const lat = (x1, y1, x2, y2, k) => { const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (B.cap * 0.05)); for (let i = 0; i < n; i++) pct.push([x1 + (x2 - x1) * i / n + (rnd() - 0.5) * j * k, y1 + (y2 - y1) * i / n + (rnd() - 0.5) * j * k]); };
    lat(-w / 2, -h / 2, w / 2, -h / 2, 2.4); lat(w / 2, -h / 2, w / 2, h / 2, 1); lat(w / 2, h / 2, -w / 2, h / 2, 2.4); lat(-w / 2, h / 2, -w / 2, -h / 2, 1);
    x.beginPath(); pct.forEach(([X, Y], i) => (i ? x.lineTo(X, Y) : x.moveTo(X, Y))); x.closePath();
    umbra(x, 'rgba(0,0,0,.55)', B.cap * 0.09, B.cap * 0.05);
    x.fillStyle = hartia; x.fill();
    umbra(x, 'transparent', 0);
    x.save(); x.clip();
    x.fillStyle = 'rgba(0,0,0,.07)';   // punctele de tipar
    const pp = B.cap * 0.05;
    for (let yy = -h / 2; yy < h / 2; yy += pp) for (let xx = -w / 2 + (Math.round(yy / pp) % 2 ? pp / 2 : 0); xx < w / 2; xx += pp) { x.beginPath(); x.arc(xx, yy, pp * 0.16, 0, Math.PI * 2); x.fill(); }
    x.restore();
    const L = { cx: 0, base: B.cap / 2, cap: B.cap, maxW: w * 0.84 }, p = pune(x, ch, 'Abril Fatface', '400', L);
    x.fillStyle = cerneala; x.fillText(ch, p.x, p.y);
    x.rotate(-0.06);   // banda adeziva
    x.fillStyle = 'rgba(255,240,170,.5)'; x.fillRect(-w * 0.2, -h / 2 - B.cap * 0.07, w * 0.4, B.cap * 0.15);
    x.restore();
  },
};
const ORDINE = ['mozaic', 'hartie', 'neon', 'graffiti', 'confetti', 'crosetat'];   // prin ce trece tot cuvantul
const FINAL = { S: 'crosetat', T: 'graffiti', O: 'confetti', R: 'hartie', Y: 'neon' };   // cu ce ramane fiecare litera
const INCLINAT = [-4, 3, -2, 0, 3];
const GEO = { w: 0.78, padX: 0.30, sus: 0.46, jos: 0.42 };   // la fel ca in home.css (.mat)

let litere = null, litereMarime = 0;
function deseneazaLitere(marime, cap) {
  if (litere && litereMarime === marime) return;
  litereMarime = marime;
  const B = { W: (GEO.w + 2 * GEO.padX) * marime, H: (cap + GEO.sus + GEO.jos) * marime, cap: cap * marime, maxW: GEO.w * marime };
  B.cx = B.W / 2; B.base = (GEO.sus + cap) * marime;
  litere = [...'STORY'].map((ch, i) => {
    const el = document.createElement('span'); el.className = 'mat'; el.style.setProperty('--r', INCLINAT[i] + 'deg');
    ORDINE.forEach((m, k) => {
      const t = panza(B);
      try { MAT[m](t.x, ch, B, rndCu(i * 97 + k * 131 + 5)); } catch (e) { console.error(e); }
      t.c.dataset.m = m; el.appendChild(t.c);
    });
    return el;
  });
}
function material(el, m) {
  for (const c of el.children) c.classList.toggle('on', c.dataset.m === m);
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

/* ---------- scrisul ---------- */
const caret = document.createElement('i'); caret.className = 'caret';
const STOP = {};
let rulare = 0, live = null, ghost = null;
const lit = t => [...t].map(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; return s; });
function linieNoua() { const l = document.createElement('div'); l.className = 'ln'; live.appendChild(l); l.appendChild(caret); return l; }
function fantoma(linii) {   // textul intreg, invizibil: tine latimea si inaltimea
  ghost.innerHTML = '';
  for (const t of linii) {
    const l = document.createElement('div'); l.className = 'ln';
    if (t === '#') for (let i = 0; i < 5; i++) { const m = document.createElement('span'); m.className = 'mat'; l.appendChild(m); }
    else if (t.endsWith('#')) { l.append(...lit(t.slice(0, -1))); for (let i = 0; i < 5; i++) { const m = document.createElement('span'); m.className = 'mat'; l.appendChild(m); } }
    else l.textContent = t;
    ghost.appendChild(l);
  }
}
function curata() {
  box.innerHTML = ''; box.style.clipPath = box.style.webkitClipPath = '';
  ghost = document.createElement('div'); ghost.className = 'seq-ghost';
  live = document.createElement('div'); live.className = 'seq-live';
  box.append(ghost, live);
  caret.className = 'caret';
  line.className = 'seq-line'; line.removeAttribute('style');
}

// pune un font pe WHO LIVED IT. Marimea: majusculele cat cele din restul textului (sau k, daca e dat), dar sa incapa in latime
const WHO = 'Who lived it.';
function stil(el, s, latMax, marime) {
  const g = s.g || 400, txt = s.mic ? el.textContent : el.textContent.toUpperCase();
  const dorit = s.k || 0.94 * capDin(DISP, '800') / capDin(s.fam, (s.italic ? 'italic ' : '') + g);
  mc.font = `${s.italic ? 'italic ' : ''}${g} 100px "${s.fam}"`;   // dupa capDin, care schimba si el fontul de masurat
  const k = Math.min(dorit, latMax / (mc.measureText(txt).width / 100 * marime) * 0.97);
  el.style.fontFamily = `"${s.fam}",sans-serif`;
  el.style.fontWeight = g; el.style.fontStyle = s.italic ? 'italic' : 'normal';
  el.style.fontSize = k.toFixed(3) + 'em';
  el.style.textTransform = s.mic ? 'none' : 'uppercase';
  el.style.letterSpacing = s.fam === 'Inter' ? '-.01em' : '.03em';
}

function play() {
  const eu = ++rulare;
  const oprit = () => eu !== rulare;
  const w = ms => new Promise((ok, nu) => setTimeout(() => (oprit() ? nu(STOP) : ok()), ms));
  const tween = (ms, f, ease = inOut) => new Promise((ok, nu) => {
    const t0 = performance.now();
    const pas = t => { if (oprit()) return nu(STOP); const k = clamp((t - t0) / ms); f(ease(k)); if (k < 1) requestAnimationFrame(pas); else ok(); };
    requestAnimationFrame(pas);
  });
  async function scrie(unde, noduri, v = 64) {
    caret.classList.add('ocupat');
    for (const n of noduri) { if (unde === caret.parentNode) unde.insertBefore(n, caret); else unde.appendChild(n); await w(v * (0.55 + Math.random() * 0.9)); }
    caret.classList.remove('ocupat');
  }
  async function sterge(cate, v = 34) {   // sterge de la coada; cand un rand ramane gol, cursorul urca pe cel de sus
    caret.classList.add('ocupat');
    for (let i = 0; i < cate; i++) {
      const toate = live.querySelectorAll('.ch,.mat');
      if (!toate.length) break;
      const n = toate[toate.length - 1], par = n.parentNode;
      n.remove();
      if (par.classList.contains('who') && !par.firstChild) par.remove();
      const l = caret.parentNode;
      if (l && !l.querySelector('.ch,.mat') && l.previousElementSibling) { l.previousElementSibling.appendChild(caret); l.remove(); }
      await w(v);
    }
    caret.classList.remove('ocupat');
  }
  const stergeTot = () => sterge(live.querySelectorAll('.ch,.mat').length, 24);

  return (async () => {
    const lat = innerWidth >= 760 && innerWidth > innerHeight * 0.95;   // ecran lat: mai putine randuri
    seq.classList.toggle('ingust', !lat);
    curata();
    await incarcaFonturi(); if (oprit()) throw STOP;
    const marime = parseFloat(getComputedStyle(box).fontSize);
    const cap = capDin(DISP, '800');
    seq.style.setProperty('--cap', cap.toFixed(3));
    deseneazaLitere(marime, cap);
    await w(500);   // ERASMUS+ pleaca

    // 1. THREE SCHOOLS -> THREE COUNTRIES
    fantoma(lat ? ['THREE COUNTRIES'] : ['THREE', 'COUNTRIES']);
    let l = linieNoua();
    await scrie(l, lit(lat ? 'THREE ' : 'THREE'));
    if (!lat) l = linieNoua();
    await scrie(l, lit('SCHOOLS'));
    await w(800);
    await sterge(7);
    await w(160);
    if (!l.isConnected) l = linieNoua();   // pe ecran ingust, randul cu SCHOOLS a disparut la stergere
    await scrie(l, lit('COUNTRIES'));
    await w(1000);
    await stergeTot();
    await w(260);

    // 2. ONE SHARED STORY: STORY trece prin toate materialele, apoi fiecare litera ramane cu al ei
    fantoma(lat ? ['ONE SHARED #'] : ['ONE SHARED', '#']);
    l = caret.parentNode;
    await scrie(l, lit(lat ? 'ONE SHARED ' : 'ONE SHARED'));
    if (!lat) l = linieNoua();
    litere.forEach(e => { e.classList.remove('fin'); material(e, ORDINE[0]); });
    await scrie(l, litere, 95);
    await w(420);
    for (const m of ORDINE.slice(1)) { litere.forEach(e => material(e, m)); await w(340); }
    for (const [i, e] of litere.entries()) { e.classList.add('fin'); material(e, FINAL['STORY'[i]]); await w(120); }
    await w(1700);
    await stergeTot();
    await w(260);

    // 3. TOLD BY THE STUDENTS / WHO LIVED IT.
    fantoma(lat ? ['TOLD BY THE STUDENTS', 'WHO LIVED IT.'] : ['TOLD BY THE', 'STUDENTS', 'WHO LIVED IT.']);
    l = caret.parentNode;
    if (lat) await scrie(l, lit('TOLD BY THE STUDENTS'), 56);
    else { await scrie(l, lit('TOLD BY THE'), 56); l = linieNoua(); await scrie(l, lit('STUDENTS'), 56); }
    l = linieNoua();
    const who = document.createElement('span'); who.className = 'who';
    l.insertBefore(who, caret);
    await scrie(who, lit(WHO), 56);
    await w(520);
    caret.classList.add('off');
    const latMax = box.getBoundingClientRect().width;
    // trece repede prin toate fonturile: porneste mai incet, accelereaza, incetineste la final
    // VITEZA = cat sta un font pe ecran, in milisecunde (mai mare = mai incet)
    const VITEZA = 120, n = STILURI.length, final = [1.25, 1.5, 1.8, 2.2];
    for (const [i, s] of STILURI.entries()) { stil(who, s, latMax, marime); await w(VITEZA * (i < 4 ? 1.6 - i * 0.15 : i >= n - 4 ? final[i - (n - 4)] : 1)); }
    // se opreste pe bold, iar LIVED devine LOVED
    const o = who.children[5]; o.textContent = 'o'; o.classList.add('iubit');
    stil(who, { fam: 'Inter', g: 900, k: 0.8 }, latMax, marime);                 // bold
    await w(650);
    stil(who, { fam: 'Inter', g: 900, k: 0.8, italic: true }, latMax, marime);   // italic
    await w(400);
    // subliniat: linia se trage de la stanga la dreapta
    const s0 = seq.getBoundingClientRect(), r = who.getBoundingClientRect();
    const gros = Math.max(4, Math.round(marime * 0.05)), y0 = r.bottom - s0.top + gros * 0.4;
    line.style.cssText = `left:${r.left - s0.left}px;top:${y0}px;width:${r.width}px;height:${gros}px;transform:scaleX(0)`;
    line.classList.add('on');
    await tween(320, k => { line.style.transform = `scaleX(${k})`; }, outCubic);
    await w(650);
    // linia se intinde pe tot ecranul, apoi urca si sterge textul
    const x0 = r.left - s0.left, w0 = r.width;
    await tween(460, k => { line.style.left = x0 * (1 - k) + 'px'; line.style.width = w0 + (s0.width - w0) * k + 'px'; });
    const b = box.getBoundingClientRect();
    await tween(820, k => {
      const y = y0 + (-gros - y0) * k;
      line.style.top = y + 'px';
      const tai = `inset(-40px -40px ${Math.max(0, b.bottom - s0.top - y)}px -40px)`;
      box.style.clipPath = box.style.webkitClipPath = tai;
    });
    return true;
  })().catch(e => { if (e !== STOP) console.error(e); return e === STOP ? false : true; });
}
function stop() { rulare++; }

window.homeSeq = { play, stop, pregateste: incarcaFonturi };
})();
