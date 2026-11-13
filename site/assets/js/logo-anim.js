(() => {
  const { assets, meta } = DATA;
  const { W, H, mapScale } = meta;
  const MW = W / mapScale, MH = H / mapScale;

  // ---------------------------------------------------------------- timeline (secunde)
  const TL = {
    regions:  { 4: [2.65, 0.70] }, // corpurile siluetelor (cladirile vin din varianta aleasa)
    regionSoft: 0.09,
    stars:    { start: 1.95, step: 0.05, dur: 0.55 },
    letters:  { start: 2.25, step: 0.07, dur: 0.60 },
    heads:    { start: 3.00, step: 0.08, dur: 0.60 },
    splashes: { start: 3.25, step: 0.03, dur: 0.45 },
    final:    { start: 4.05, dur: 0.40 },
    shine:    { start: 4.50, dur: 0.80 },
    tag:      { start: 3.50, step: 0.014, dur: 0.40 },   // sloganul mic, litera cu litera
    patch:    { start: 2.30, dur: 0.90 },                // pata alba din jurul textului apare odata cu literele (nu inaintea lor)
    zoomEnd: 4.05,
    end: 5.35,
  };

  // ---------------------------------------------------------------- cele doua variante pentru 0 - 1.95 s
  // Traseul: o bucla in jurul textului, in sens invers acelor de ceas:
  // Franta (stanga sus) -> pe jos, sub "Erasmus+" -> Romania (dreapta jos) -> sus in dreapta -> Danemarca.
  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const LOOP = { cx: 768, cy: 520, rx: 620, ry: 300, a0: -15 * DEG, span: 335 * DEG,
                 soft: 0.008, glowW: 0.018 };
  const VARIANTS = {
    A: { name: 'A: pensulă',
         brush: { start: 0.10, end: 1.70 }, glow: 0.6,
         regions: { 1: [1.20, 0.75], 2: [1.40, 0.70], 3: [1.60, 0.65] } },
    B: { name: 'B: steaguri pe traseu',
         fr: { start: 0.15, end: 0.70 },     // Franta apare la locul ei
         dk: { start: 0.30, end: 1.70 },     // Danemarca merge pe tot traseul
         ro: { start: 0.55, end: 1.40 },     // Romania merge pana jos in dreapta
         trail: { lag: 0.02, tail: 0.15 },   // panglicile apar in urma Danemarcei
         glow: 0.3,
         regions: { 1: [1.20, 0.75], 2: [1.68, 0.60], 3: [1.55, 0.65] } },
  };
  let VAR = 'B';   // varianta aleasa: B
  const V = () => VARIANTS[VAR];
  const regionsNow = () => Object.assign({}, V().regions, TL.regions);

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const layer = mk(W, H), lctx = layer.getContext('2d');
  const maskA = mk(MW, MH), maskB = mk(MW, MH), maskG = mk(MW, MH);
  const mActx = maskA.getContext('2d'), mBctx = maskB.getContext('2d'), mGctx = maskG.getContext('2d');

  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const outCubic = p => 1 - Math.pow(1 - p, 3);
  const outBack = (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
  const spring = p => p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(12 * p);
  const smooth = p => p * p * (3 - 2 * p);
  const inOut = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
  const sineInOut = p => 0.5 - 0.5 * Math.cos(Math.PI * p);

  const load = src => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src;
  });

  let img = {}, tB, rid, tbn, sMap, ribMap, flagMap, clothMap, imgA, imgB, imgG, bRow0 = 0, bRow1 = MH, shineCanvas;
  const spritesByKind = { star: [], letter: [], head: [], splash: [], flag: [], tag: [] };
  meta.sprites.forEach(s => spritesByKind[s.kind].push(s));
  const flagSprite = n => spritesByKind.flag.find(s => s.name === n);

  // pozitia pe traseu (0 = inceput, 1 = sfarsit) pentru un unghi
  const angAt = (x, y) => Math.atan2((x - LOOP.cx) / LOOP.rx, -(y - LOOP.cy) / LOOP.ry);
  const sOfAng = a => ((((LOOP.a0 - a) % TAU) + TAU) % TAU) / LOOP.span;
  let cdf = null;
  function remapS(s) {
    if (s <= 0 || !cdf) return s; if (s >= 1) return s;
    const f = s * (cdf.length - 1), b = Math.floor(f), u = f - b;
    return 0.45 * s + 0.55 * (cdf[b] + (cdf[Math.min(cdf.length - 1, b + 1)] - cdf[b]) * u);
  }

  function prepare() {
    // harta: R = 0 pe pata alba din jurul textului, G = timp cladiri/siluete, B = id regiune * 50 + id steag * 12
    const mc = mk(MW, MH), mctx = mc.getContext('2d');
    mctx.drawImage(img.map, 0, 0);
    const d = mctx.getImageData(0, 0, MW, MH).data;
    const n = MW * MH;
    sMap = new Float32Array(n); ribMap = new Float32Array(n); flagMap = new Uint8Array(n); clothMap = new Float32Array(n);
    // unde e culoare (pentru lumina de pe varful pensulei)
    const ac = mk(MW, MH), actx = ac.getContext('2d');
    actx.imageSmoothingQuality = 'high'; actx.drawImage(img.A, 0, 0, MW, MH);
    const ad = actx.getImageData(0, 0, MW, MH).data;
    rid = new Uint8Array(n); tbn = new Float32Array(n); tB = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i % MW + 0.5) * mapScale, y = (Math.floor(i / MW) + 0.5) * mapScale;
      sMap[i] = sOfAng(angAt(x, y));
      clothMap[i] = d[i * 4] / 255;
      const dc = Math.hypot(ad[i * 4] - 252, ad[i * 4 + 1] - 249, ad[i * 4 + 2] - 242);
      ribMap[i] = clamp01((dc - 10) / 14);
      rid[i] = Math.floor(d[i * 4 + 2] / 50);
      flagMap[i] = Math.round((d[i * 4 + 2] % 50) / 12);
      tbn[i] = d[i * 4 + 1] / 255;
    }
    // ritm: pensula merge mai uniform peste panglici (unde e mult material, sta putin mai mult)
    const NB = 512, hist = new Float64Array(NB);
    for (let i = 0; i < n; i++) hist[Math.min(NB - 1, Math.max(0, Math.floor(sMap[i] * NB)))] += ribMap[i];
    cdf = new Float32Array(NB + 1); let acc = 0;
    for (let b = 0; b < NB; b++) { acc += hist[b]; cdf[b + 1] = acc; }
    for (let b = 0; b <= NB; b++) cdf[b] /= acc;
    for (let i = 0; i < n; i++) sMap[i] = remapS(sMap[i]);
    const by0 = meta.B[1], by1 = meta.B[1] + img.B.height;
    bRow0 = Math.max(0, Math.floor(by0 / mapScale) - 2);
    bRow1 = Math.min(MH, Math.ceil(by1 / mapScale) + 2);
    imgA = mActx.createImageData(MW, MH);
    imgB = mBctx.createImageData(MW, MH);
    imgG = mGctx.createImageData(MW, MH);
    for (let i = 0; i < n; i++) { imgG.data[i * 4] = imgG.data[i * 4 + 1] = imgG.data[i * 4 + 2] = 255; }
    shineCanvas = mk(img.textmask.width, img.textmask.height);
    applyVariantTimes();
  }
  function applyVariantTimes() {
    const R = regionsNow();
    for (let i = 0; i < tB.length; i++) { const reg = R[rid[i]]; tB[i] = reg ? reg[0] + reg[1] * tbn[i] : 1e9; }
  }

  function fillMask(imageData, times, soft, t, row0, row1) {
    const data = imageData.data, k = 255 / soft;
    for (let i = row0 * MW, e = row1 * MW; i < e; i++) data[i * 4 + 3] = (t - times[i]) * k;
  }

  // panglicile se descopera pe traseu pana la pozitia P (0..1); lumina pe varf
  function drawRibbons(P, glowAmt, hideFlags, bgFade) {
    const a = imgA.data, g = imgG.data, soft = LOOP.soft, gw = LOOP.glowW;
    for (let i = 0, n = sMap.length; i < n; i++) {
      const dd = P - sMap[i];
      let al = dd / soft; al = al < 0 ? 0 : al > 1 ? 1 : al;
      const c = clothMap[i];
      al = al * c + bgFade * (1 - c);
      if (hideFlags && hideFlags[flagMap[i]]) al = 0;
      a[i * 4 + 3] = al * 255;
      g[i * 4 + 3] = (dd > 0 && dd < 7 * gw && glowAmt > 0) ? ribMap[i] * al * glowAmt * Math.exp(-dd / gw) * 255 : 0;
    }
    mActx.putImageData(imgA, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, W, H);
    lctx.drawImage(img.A, 0, 0);
    lctx.globalCompositeOperation = 'destination-in';
    lctx.imageSmoothingEnabled = true; lctx.imageSmoothingQuality = 'low';
    lctx.drawImage(maskA, 0, 0, W, H);
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layer, 0, 0);
    if (glowAmt > 0.001) { mGctx.putImageData(imgG, 0, 0); ctx.drawImage(maskG, 0, 0, W, H); }
  }

  // un steag merge pe bucla (elipsa care trece prin locul lui final), in sens invers acelor de ceas
  function flagOnLoop(s, p, startAng) {
    const angF = angAt(s.ax, s.ay);
    const r = Math.hypot((s.ax - LOOP.cx) / LOOP.rx, (s.ay - LOOP.cy) / LOOP.ry);
    const travel = (((startAng - angF) % TAU) + TAU) % TAU;
    const e = inOut(p);
    const ang = startAng - travel * e;
    const x = LOOP.cx + LOOP.rx * r * Math.sin(ang), y = LOOP.cy - LOOP.ry * r * Math.cos(ang);
    const tang = a => Math.atan2(-LOOP.ry * Math.sin(a), -LOOP.rx * Math.cos(a));
    let rot = 0.4 * wrapPi(tang(ang) - tang(angF));
    rot = Math.max(-0.45, Math.min(0.45, rot)) * (1 - smooth(clamp01((p - 0.7) / 0.3)));
    const scale = 0.55 + 0.45 * smooth(clamp01((p - 0.5) / 0.5));
    return { dx: x - s.ax, dy: y - s.ay, rot, scale, s: (LOOP.a0 - ang) / LOOP.span };
  }

  // deseneaza o imagine prin masca de timp (doar in dreptunghiul imaginii)
  function drawMasked(image, dx, dy, mctx2, maskCanvas, imageData, times, soft, t, row0, row1) {
    fillMask(imageData, times, soft, t, row0, row1);
    mctx2.putImageData(imageData, 0, 0);
    const w = image.width, h = image.height, s = mapScale;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(dx, dy, w, h);
    lctx.drawImage(image, dx, dy);
    lctx.globalCompositeOperation = 'destination-in';
    lctx.imageSmoothingEnabled = true; lctx.imageSmoothingQuality = 'low';
    lctx.drawImage(maskCanvas, dx / s, dy / s, w / s, h / s, dx, dy, w, h);
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layer, dx, dy, w, h, dx, dy, w, h);
  }

  function sprite(s, alpha, scale, rot, dx, dy, ax, ay) {
    if (alpha <= 0 || scale <= 0.001) return;
    ax = ax ?? s.ax; ay = ay ?? s.ay;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(ax + dx, ay + dy);
    if (rot) ctx.rotate(rot);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.drawImage(s.src === 'flags' ? img.flags : s.src === 'tag' ? img.tag : img.atlas, s.sx, s.sy, s.w, s.h, s.x - ax, s.y - ay, s.w, s.h);
    ctx.restore();
  }

  const prog = (t, g, i) => clamp01((t - g.start - i * g.step) / g.dur);

  function flagsDoneAt() {
    const v = V();
    if (VAR === 'A') return v.brush.end + 0.02;
    return Math.max(v.dk.end + v.trail.tail, v.ro.end, v.fr.end, TL.patch.start + TL.patch.dur) + 0.02;
  }
  function drawFlagsPart(t) {
    const v = V();
    if (t >= flagsDoneAt()) { ctx.drawImage(img.A, 0, 0); return; }
    if (VAR === 'A') {
      const p = clamp01((t - v.brush.start) / (v.brush.end - v.brush.start));
      if (p <= 0) return;
      const glow = v.glow * (1 - smooth(clamp01((t - v.brush.end + 0.25) / 0.25)));
      const bgFade = smooth(clamp01((t - v.brush.end + 0.35) / 0.35));
      drawRibbons(sineInOut(p) * (1 + 2 * LOOP.soft), glow, false, bgFade);
      return;
    }
    // varianta B
    const fr = flagSprite('fr'), ro = flagSprite('ro'), dk = flagSprite('dk');
    const startAng = angAt(fr.ax, fr.ay);
    const pD = clamp01((t - v.dk.start) / (v.dk.end - v.dk.start));
    const pR = clamp01((t - v.ro.start) / (v.ro.end - v.ro.start));
    const mD = flagOnLoop(dk, pD, startAng), mR = flagOnLoop(ro, pR, startAng);
    const pF0 = clamp01((t - v.fr.start) / (v.fr.end - v.fr.start));
    // panglicile apar in urma Danemarcei
    let P = remapS(Math.max(0, mD.s - v.trail.lag)) * clamp01((t - v.dk.start) / 0.2);
    if (t > v.dk.end) P += (1 + 2 * LOOP.soft - P) * smooth(clamp01((t - v.dk.end) / v.trail.tail));
    if (t > v.dk.end + v.trail.tail) P = 1 + 2 * LOOP.soft;
    const glow = v.glow * (1 - smooth(clamp01((t - v.dk.end) / v.trail.tail)));
    const bgFade = smooth(clamp01((t - TL.patch.start) / TL.patch.dur));
    // fiecare steag isi ascunde locul pana ajunge acolo
    const hide = [false, pF0 < 1, pR < 0.96, pD < 0.96];
    if (t > v.dk.start) drawRibbons(P, glow, hide, bgFade);
    if (t > v.ro.start) sprite(ro, pR * 10, mR.scale, mR.rot, mR.dx, mR.dy);
    if (t > v.dk.start) sprite(dk, pD * 10, mD.scale, mD.rot, mD.dx, mD.dy);
    const pF = clamp01((t - v.fr.start) / (v.fr.end - v.fr.start));
    if (pF > 0) {
      const k = 1 - outCubic(pF);
      sprite(fr, pF * 2.5, 0.8 + 0.2 * outBack(pF, 1.4), -0.14 * k, -34 * k, 20 * k);
    }
  }

  function render(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = meta.bg; ctx.fillRect(0, 0, W, H);

    const finalP = smooth(clamp01((t - TL.final.start) / TL.final.dur));
    if (finalP < 1) {
      // usor "zoom out" pe toata durata construirii
      const z = 1 + 0.04 * (1 - outCubic(clamp01(t / TL.zoomEnd)));
      ctx.setTransform(z, 0, 0, z, W / 2 * (1 - z), H / 2 * (1 - z));

      // 1. panglicile si steagurile pe traseu (varianta A sau B)
      drawFlagsPart(t);
      // 2. cladirile se construiesc de jos in sus, siluetele cresc din panglici
      const RG = regionsNow();
      const bStart = Math.min(...Object.values(RG).map(r => r[0]));
      const bEnd = Math.max(...Object.values(RG).map(r => r[0] + r[1])) + TL.regionSoft;
      if (t > bStart) {
        if (t >= bEnd) ctx.drawImage(img.B, meta.B[0], meta.B[1]);
        else drawMasked(img.B, meta.B[0], meta.B[1], mBctx, maskB, imgB, tB, TL.regionSoft, t, bRow0, bRow1);
      }
      // 3. stelele UE, una cate una, in cerc
      spritesByKind.star.forEach((s, i) => {
        const p = prog(t, TL.stars, i);
        sprite(s, p * 3, outBack(p, 2.2), (1 - outCubic(p)) * -2.6, 0, 0);
      });
      // 4. textul "Erasmus+"
      const L = spritesByKind.letter;
      L.forEach((s, i) => {
        const p = prog(t, TL.letters, i + (i === L.length - 1 ? 0.8 : 0));
        if (i === L.length - 1) {
          sprite(s, p * 3, outBack(p, 2.0), (1 - outCubic(p)) * Math.PI / 2, 0, 0, s.x + s.w / 2, s.y + s.h / 2);
        } else {
          sprite(s, p * 2.2, 0.94 + 0.06 * outCubic(p), 0, 0, (1 - outBack(p, 1.25)) * 48);   // urca, trece putin de loc si se aseaza
        }
      });
      // 5. capetele siluetelor "sar" in scena
      spritesByKind.head.forEach((s, i) => {
        const p = prog(t, TL.heads, i);
        sprite(s, p * 4, spring(p), 0, 0, 0);
      });
      // 6. stropii de culoare explodeaza spre exterior
      spritesByKind.splash.forEach((s, i) => {
        const p = prog(t, TL.splashes, i);
        let dx = s.ax - 768, dy = s.ay - 480; const len = Math.hypot(dx, dy) || 1;
        const back = (1 - outCubic(p)) * 40;
        sprite(s, p * 3, outBack(p, 1.9), 0, -dx / len * back, -dy / len * back);
      });
    }
    // 7. la final, imaginea originala (exact ca in poza)
    if (finalP > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = finalP;
      ctx.drawImage(img.final, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // 8. sloganul mic, litera cu litera
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    spritesByKind.tag.forEach(s => {
      const p = clamp01((t - TL.tag.start - s.i * TL.tag.step) / TL.tag.dur);
      if (p > 0) sprite(s, Math.min(1, p * 1.6), 1, 0, 0, (1 - outCubic(p)) * 9);
    });
    ctx.globalAlpha = 1;
    // 9. o lumina fina trece peste text
    const sp = (t - TL.shine.start) / TL.shine.dur;
    if (sp > 0 && sp < 1) {
      const sc = shineCanvas.getContext('2d'), sw = shineCanvas.width, sh = shineCanvas.height;
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = 'source-over';
      sc.clearRect(0, 0, sw, sh);
      sc.drawImage(img.textmask, 0, 0);
      sc.globalCompositeOperation = 'source-in';
      const cx = -0.2 * sw + 1.4 * sw * smooth(sp);
      sc.setTransform(1, 0, -0.45, 1, 0.45 * sh / 2, 0);
      const g = sc.createLinearGradient(cx - 110, 0, cx + 110, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.42)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      sc.fillStyle = g; sc.fillRect(cx - 120, 0, 240, sh);
      ctx.drawImage(shineCanvas, meta.text[0], meta.text[1]);
    }
  }

  // ---------------------------------------------------------------- redare
  const SITE = true;   // true = varianta pentru site (fara bara de timp, ruleaza o data, cu sunet)
  const HAS_TL = !!document.getElementById('tl');
  const SHOW_TIMELINE = HAS_TL;
  const btn = document.getElementById('replay');
  const startBtn = document.getElementById('start');
  const clock = { t: 0, playing: false, speed: 1, last: null };
  let raf = 0, ready = false, tlOn = false;
  const snd = assets.audio ? new Audio(assets.audio) : null;
  if (snd) snd.preload = 'auto';

  function tick(now) {
    raf = 0;
    if (clock.playing) {
      if (clock.last !== null) clock.t += Math.min(0.1, (now - clock.last) / 1000) * clock.speed;
      clock.last = now;
      if (clock.t >= TL.end) { clock.t = TL.end; clock.playing = false; }
    }
    render(clock.t);
    updateUI();
    if (clock.playing) raf = requestAnimationFrame(tick);
  }
  const redraw = () => { if (ready && !raf) raf = requestAnimationFrame(tick); };
  function startClock() { clock.playing = true; clock.last = null; redraw(); }
  // porneste sunetul de la secunda clock.t; animatia porneste odata cu el
  let playToken = 0;
  function play(fromStart, onBlocked) {
    if (!ready) return;
    const tok = ++playToken;
    if (fromStart || clock.t >= TL.end) clock.t = 0;
    if (!snd || clock.t >= snd.duration - 0.02) { startClock(); return; }
    snd.pause();
    try { snd.currentTime = clock.t; } catch (e) {}
    snd.playbackRate = clock.speed;
    const pr = snd.play();
    const ok = () => { if (tok === playToken) startClock(); else snd.pause(); };
    const blocked = () => { if (tok !== playToken) return; if (onBlocked) onBlocked(); else startClock(); };
    if (pr && pr.then) pr.then(ok, blocked);
    else startClock();
  }
  function pause() { playToken++; clock.playing = false; clock.last = null; if (snd) snd.pause(); redraw(); }
  function seek(t) { clock.t = Math.max(0, Math.min(TL.end, t)); pause(); }

  // ---------------------------------------------------------------- bara de timp
  const $ = id => document.getElementById(id);
  const fmt = v => v.toFixed(2);
  let phases = [];
  function buildTimeline() {
    if (!HAS_TL) return;
    const S = TL, R = regionsNow(), n = k => spritesByKind[k].length, v = V();
    const reg = (k) => [R[k][0], R[k][0] + R[k][1] + S.regionSoft];
    const grp = (g, count, extra = 0) => [g.start, g.start + (count - 1 + extra) * g.step + g.dur];
    const first = VAR === 'A' ? [
      ['Pensula: panglici și steaguri', v.brush.start, v.brush.end, '#1f4fbf'],
    ] : [
      ['Franța apare', v.fr.start, v.fr.end, '#003399'],
      ['Danemarca pe traseu', v.dk.start, v.dk.end, '#E30613'],
      ['România pe traseu', v.ro.start, v.ro.end, '#F2B705'],
      ['Panglicile în urma lor', v.dk.start, v.dk.end + v.trail.tail, '#1f4fbf'],
    ];
    phases = first.concat([
      ['Turnul Eiffel', ...reg(1), '#003399'],
      ['Clădirea daneză', ...reg(2), '#E30613'],
      ['Clădirea românească', ...reg(3), '#F2B705'],
      ['Stelele UE', ...grp(S.stars, n('star')), '#F2B705'],
      ['Textul Erasmus+', ...grp(S.letters, n('letter'), 0.8), '#0b2a6f'],
      ['Corpurile siluetelor', ...reg(4), '#c8102e'],
      ['Capetele siluetelor', ...grp(S.heads, n('head')), '#8a1c2b'],
      ['Stropii de culoare', ...grp(S.splashes, n('splash')), '#E30613'],
      ['Sloganul mic', S.tag.start, S.tag.start + (spritesByKind.tag.reduce((m, s) => Math.max(m, s.i), 0)) * S.tag.step + S.tag.dur, '#0b2a6f'],
      ['Trecere la poza finală', S.final.start, S.final.start + S.final.dur, '#7a8194'],
      ['Lumina pe text', S.shine.start, S.shine.start + S.shine.dur, '#9fb3e6'],
    ]);
    document.body.style.setProperty('--rows', phases.length);
    $('tlVar').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === VAR));
    const pct = v => (v / TL.end * 100) + '%';
    $('tlLabels').innerHTML = phases.map(p =>
      `<div class="tl-label"><span>${p[0]}</span><span>${fmt(p[1])} &rarr; ${fmt(p[2])}</span></div>`).join('');
    $('tlRows').innerHTML = phases.map(p =>
      `<div class="tl-row"><div class="tl-bar" style="left:${pct(p[1])};width:${pct(p[2] - p[1])};background:${p[3]}"
        title="${p[0]}: ${fmt(p[1])} s &rarr; ${fmt(p[2])} s"></div></div>`).join('');
    let ticks = '';
    for (let v = 0; v <= TL.end + 1e-6; v += 0.5) {
      const whole = Math.abs(v - Math.round(v)) < 1e-6;
      ticks += `<div class="tl-tick${whole ? '' : ' half'}" style="left:${pct(v)}">${whole ? v.toFixed(0) + ' s' : ''}</div>`;
    }
    $('tlTicks').innerHTML = ticks;
    $('tlRange').max = TL.end;
    $('tlTotal').textContent = '/ ' + fmt(TL.end) + ' s';
  }
  function updateUI() {
    if (btn) btn.classList.toggle('show', !tlOn && !clock.playing && clock.t >= TL.end);
    if (!tlOn) return;
    $('tlNow').textContent = fmt(clock.t);
    $('tlRange').value = clock.t;
    $('tlHead').style.left = (clock.t / TL.end * 100) + '%';
    $('tlPlay').innerHTML = clock.playing ? '&#10074;&#10074; Pauză' : '&#9654; Play';
    const act = [];
    document.querySelectorAll('.tl-label').forEach((el, i) => {
      const on = clock.t >= phases[i][1] && clock.t < phases[i][2];
      el.classList.toggle('active', on); if (on) act.push(phases[i][0]);
    });
    $('tlActive').textContent = act.length ? 'Acum: ' + act.join(', ') : (clock.t >= TL.end ? 'Gata: logoul final' : '');
  }
  function setTimeline(on) {
    tlOn = on && HAS_TL; document.body.classList.toggle('tl-on', tlOn); updateUI(); redraw();
  }

  function setVariant(v) {
    if (!VARIANTS[v]) return;
    VAR = v; applyVariantTimes(); buildTimeline(); play(true);
  }
  if (HAS_TL) {
  $('tlVar').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setVariant(b.dataset.v); });
  $('tlPlay').addEventListener('click', () => clock.playing ? pause() : play());
  $('tlRange').addEventListener('input', e => seek(parseFloat(e.target.value)));
  $('tlSpeed').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    clock.speed = parseFloat(b.dataset.s);
    if (snd) snd.playbackRate = clock.speed;
    $('tlSpeed').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  });
  }
  document.addEventListener('keydown', e => {
    if (!ready || !HAS_TL) return;
    if (e.key === 't' || e.key === 'T') { setTimeline(!tlOn); return; }
    if (!tlOn) return;
    const step = e.shiftKey ? 0.01 : 0.1;
    if (e.code === 'Space') { e.preventDefault(); clock.playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(clock.t + step); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(clock.t - step); }
    else if (e.key === 'Home') { e.preventDefault(); seek(0); }
    else if (e.key === 'End') { e.preventDefault(); seek(TL.end); }
  });

  // browserele nu lasa sunetul sa porneasca singur: daca e blocat, asteptam un click
  let pendingGo = null;
  function waitForClick() {
    if (!startBtn) { startClock(); return; }
    startBtn.hidden = false;
    const go = pendingGo = () => {
      pendingGo = null;
      startBtn.hidden = true;
      ['pointerdown', 'keydown'].forEach(ev => window.removeEventListener(ev, go));
      play(true, startClock);
    };
    ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, go));
  }

  const keys = ['A', 'B', 'atlas', 'flags', 'tag', 'map', 'textmask', 'final'];
  const audioReady = !snd ? Promise.resolve() : new Promise(res => {
    if (snd.readyState >= 1) return res();
    snd.addEventListener('loadedmetadata', res, { once: true }); snd.addEventListener('error', res, { once: true });
    setTimeout(res, 3000);
  });
  Promise.all(keys.map(k => load(assets[k]).then(im => img[k] = im)).concat([audioReady]))
    .then(() => {
      prepare();
      buildTimeline();
      ready = true;
      if (SITE) document.body.classList.add('site');
      setTimeline(SHOW_TIMELINE);
      render(0);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || location.hash === '#static') seek(TL.end);
      else if (window.ERASMUS_SKIP_INTRO) seek(TL.end);
      else play(true, SITE ? waitForClick : startClock);
    });

  if (!SITE) {
    document.getElementById('logo').addEventListener('click', () => play(true));
    if (btn) btn.addEventListener('click', () => play(true));
  }
  window.logoAnim = { skip: () => { if (pendingGo) { ['pointerdown', 'keydown'].forEach(ev => window.removeEventListener(ev, pendingGo)); pendingGo = null; } if (startBtn) startBtn.hidden = true; if (ready) seek(TL.end); else window.ERASMUS_SKIP_INTRO = true; }, img: () => img, sprites: spritesByKind, meta, setVariant: v => setVariant(v), variant: () => VAR, play, pause, seek, clock, snd, renderAt: t => { if (ready) render(t); }, timeline: TL, ready: () => ready };
})();
