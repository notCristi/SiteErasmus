/* =========================================================
   Ce s-a urcat prin UPLOAD se adauga aici peste data.js.
   Serverul trimite lista in window.CLOUD (vezi _worker.js); daca nu e nimic urcat
   sau site-ul e deschis de pe calculator, ramane exact ce e in data.js.
   ========================================================= */
(() => {
const S = window.SITE, C = Array.isArray(window.CLOUD) ? window.CLOUD : [];
const src = k => (k ? '/media/' + k : '');
// poza mica: cea urcata separat (fisierele din R2) sau marimea mica facuta de Cloudflare Images (?v=thumb)
const small = (k, t) => (t ? src(t) : k ? src(k) + '?v=thumb' : '');
const gol = t => /^\s*\[/.test(t || '');                       // text inca necompletat: [ ... ]
const WHERE = ['School website', 'Facebook / Instagram', 'Press', 'School community'];
S.extraMedia = [];                                             // poze care apar doar in Gallery (loc scris de mana sau fara loc)
// Gallery = pozele de la locuri + cele doar pentru Gallery; pozele adevarate stau inaintea locurilor inca goale
S.allMedia = () => {
  const all = [...S.mobilities.flatMap(m => m.stops.flatMap(st => st.media.filter(x => !x.noGallery))), ...S.extraMedia];
  return [...all.filter(x => x.src || x.embed), ...all.filter(x => !x.src && !x.embed)];
};
if (!C.length) return;

const H = {
  /* ---- 1. About the mobility ---- */
  info(it, m) {
    const a = m.about;
    if (it.part === 'programme') a.programme = src(it.key);
    else if (it.part === 'photo') a.photo = src(it.key);
    else if (it.part === 'goals') a.goals = it.text.split('\n').map(x => x.trim()).filter(Boolean);
    else if (it.part === 'groups') a.groups = it.text;
    else a.text = it.text;
  },
  /* ---- 3. Daily activities: zilele si locurile ---- */
  day(it, m) {
    const d = { day: it.day, date: it.date, title: it.title, text: it.text };
    if (m.days[it.i]) Object.assign(m.days[it.i], d); else m.days.push({ ...d, journal: '' });
  },
  stop(it, m) {
    const st = m.stops.find(x => x.id === it.id), d = { title: it.title, when: it.when, text: it.text };
    if (it.lat !== undefined) { d.lat = it.lat; d.lon = it.lon; }
    if (st) Object.assign(st, d);
    else if (it.lat !== undefined) m.stops.push({ id: it.id, ...d, media: [] });
  },
  /* ---- pozele si video-urile ---- */
  media(it, m) {
    const st = it.stop && it.map ? m.stops.find(x => x.id === it.stop) : null;
    const place = st ? st.title : it.place || m.city;
    const stream = it.kind === 'video' && it.sv;   // video-ul sta in Cloudflare Stream: se vede in playerul lui (embed), cu imaginea lui (?v=poster)
    const md = { type: it.kind, src: stream ? '' : src(it.key), embed: stream ? src(it.key) + '?autoplay=1' : '',
      thumb: it.kind === 'photo' ? small(it.key, it.thumb) : src(it.thumb) || (stream ? src(it.key) + '?v=poster' : ''),
      caption: it.caption || place, mob: m.id, stop: st ? st.id : '', place, city: m.city };
    if (st) {
      if (!st.real) { st.media = st.media.filter(x => x.src); st.real = true; }   // locurile goale dispar cand vine prima poza adevarata
      md.noGallery = !it.gallery;
      st.media.push(md);
    } else if (it.gallery) S.extraMedia.push(md);
  },
  /* ---- jurnalul ---- */
  story(it, m) {
    const d = it.day >= 0 ? m.days[it.day] : null;
    const body = it.body.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    const photos = it.photos.map(p => ({ type: 'photo', src: src(p.key), thumb: small(p.key, p.thumb), caption: p.caption || it.title, mob: m.id, stop: '', place: m.city, city: m.city }));
    const e = { id: 's-' + it.id, mob: m.id, day: d ? d.day : 'Story',
      date: d ? d.date : new Date(it.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      title: it.title, excerpt: it.excerpt || (body[0] || '').slice(0, 180), author: it.author,
      min: String(Math.max(1, Math.round(it.body.split(/\s+/).length / 200))), body,
      cover: photos[0] ? photos[0].thumb || photos[0].src : '', coverFull: photos[0] ? photos[0].src : '', photos, t: it.t, di: d ? it.day : 99 };
    if (d) {   // articolul gol al zilei iese cand vine primul articol adevarat
      const old = S.journal.find(x => x.id === d.journal);
      if (old && old.body.every(gol)) S.journal.splice(S.journal.indexOf(old), 1);
      if (!S.journal.some(x => x.id === d.journal)) d.journal = e.id;
    }
    S.journal.push(e);
  },
  /* ---- 2. Learning materials ---- */
  material(it, m) {
    const slot = it.slot && m.materials.find(x => x.cat === it.cat && x.title === it.slot && !x.file);
    if (slot) { slot.file = src(it.key); slot.stream = !!it.sv; if (it.by) slot.by = it.by; return; }
    m.materials = m.materials.filter(x => !(x.cat === it.cat && gol(x.title)));
    m.materials.push({ cat: it.cat, title: it.title || it.slot, by: it.by, file: src(it.key), stream: !!it.sv });
  },
  /* ---- 4. Evaluation & results: textele se aduna unul sub altul ---- */
  result(it, m) {
    const r = m.results[it.sec]; if (!r) return;
    (r.entries = r.entries || []).push({ text: it.text, file: src(it.key), stream: !!it.sv });
  },
  /* ---- 5. Dissemination ---- */
  link(it, m) {
    const where = WHERE[it.where] || WHERE[0];
    const slot = m.dissemination.find(x => x.where === where && !x.url && gol(x.title));
    if (slot) { slot.title = it.title; slot.url = it.url; } else m.dissemination.push({ where, title: it.title, url: it.url });
  },
};
// intai zilele si locurile (pozele si articolele se leaga de ele), apoi restul, in ordinea in care au fost urcate
const first = ['info', 'day', 'stop'];
for (const pass of [true, false]) for (const it of C) {
  const m = S.mob(it.mob);
  if (m && H[it.type] && first.includes(it.type) === pass) try { H[it.type](it, m); } catch (e) { console.warn('Upload item skipped', it.id, e); }
}
// jurnalul ramane cu cel mai nou primul: mobilitatea, apoi ziua, apoi ora la care a fost urcat
if (C.some(it => it.type === 'story')) {
  const order = S.mobilities.map(m => m.id);
  for (const e of S.journal) if (e.di === undefined) e.di = (S.mob(e.mob)?.days || []).findIndex(d => d.journal === e.id);
  const scris = e => (e.body.every(gol) ? 0 : 1);   // articolele scrise stau inaintea celor inca goale
  S.journal.sort((a, b) => scris(b) - scris(a) || order.indexOf(b.mob) - order.indexOf(a.mob) || b.di - a.di || (b.t || 0) - (a.t || 0));
}
})();
