/* =========================================================
   Pagina UPLOAD: parola, formularul, lista cu ce ai urcat si (pentru admin) parolele.
   Parola nu se verifica aici, ci pe server (_worker.js). In browser ramane doar un cod de acces
   al acestui dispozitiv (localStorage, "erasmus-upload"), ca sa nu o mai ceara data viitoare.
   Textele formularului sunt mai jos, in TYPES si in functiile panel...; limitele sunt in LIMIT.
   ========================================================= */
window.PageControllers = window.PageControllers || {};
window.PageControllers.upload = function (signal) {
const S = window.SITE, U = window.UI, { esc, I } = U;
const root = document.getElementById('uploadRoot');
if (!root) return;
const STORE = 'erasmus-upload', MB = 1024 * 1024;
const LIMIT = { image: 25 * MB, video: 300 * MB, doc: 100 * MB };
const PHOTO = { max: 2560, q: 0.9, thumb: 640, thumbQ: 0.8 };   // pozele: latura lunga si calitatea, pentru poza mare si pentru cea mica
const EXT = { image: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'gif', 'bmp'], video: ['mp4', 'm4v', 'mov', 'webm'], doc: ['pdf', 'ppt', 'pptx', 'doc', 'docx'] };
const SECS = ['Feedback', 'Impressions', 'Conclusions', 'Results and our goals', 'Skills and knowledge'];
const WHERE = ['School website', 'Facebook / Instagram', 'Press', 'School community'];
const INFO = [['programme', 'Programme (PDF)'], ['photo', 'Photo of the mobility'], ['text', 'Description'], ['goals', 'Goals'], ['groups', 'Groups']];
const MADE_BY = ['Romanian students', 'French students', 'Danish students', 'Teachers'];
const ICON = {
  media: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5h.01',
  story: 'M5 4h10l4 4v12H5z M14 4v5h5 M8 13h8 M8 17h6',
  material: 'M4 5h16v11H4z M9 20h6 M12 16v4',
  result: 'M4 19V5 M4 19h16 M8 15v-4 M12 15V8 M16 15v-6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7.5h.01',
  places: 'M12 21s6-5.4 6-10.2A6 6 0 0 0 6 10.8C6 15.6 12 21 12 21z M12 13a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  up: 'M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4', bin: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
};
const svg = (d, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.split(' M').map((p, i) => `<path d="${i ? 'M' : ''}${p}"/>`).join('')}</svg>`;
// cele 7 feluri de upload; staff = doar profesorii si adminul (acolo se inlocuieste un text care exista deja)
const TYPES = [
  { id: 'media', name: 'Photos & videos', hint: 'Gallery and the places on the map' },
  { id: 'story', name: 'Journal story', hint: 'A story for the Journal' },
  { id: 'material', name: 'Learning material', hint: 'Presentation, worksheet or project' },
  { id: 'result', name: 'Results', hint: 'Feedback, impressions, conclusions' },
  { id: 'link', name: 'Dissemination', hint: 'Link to an article or a post' },
  { id: 'info', name: 'Mobility info', hint: 'Programme, cover photo, description', staff: true },
  { id: 'places', name: 'Days & places', hint: 'The days and the places on the map', staff: true },
];
const MSG = {
  wrong_key: 'That key is not right. Check it and try again.', too_many_tries: 'Too many tries. Wait 15 minutes, then try again.',
  not_configured: 'Upload is not switched on yet. Ask the website team.', signed_out: 'This device was signed out. Enter your key again.',
  file_too_big: 'This file is too big.', file_type: 'This kind of file cannot be uploaded here.', daily_limit: 'This device reached the upload limit for today.',
  not_allowed: 'Your key does not allow this.', missing_field: 'Something is missing. Check the fields above.', bad_link: 'The link has to start with https://',
  key_taken: 'This key already exists. Choose another one.', key_too_short: 'A key needs at least 8 characters.', not_found: 'It is no longer there.',
  offline: 'No connection to the server. Check the internet and try again.',
};
const say = code => MSG[code] || 'Something went wrong. Try again.';
const size = n => (n >= MB ? (n / MB).toFixed(n >= 10 * MB ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const extOf = name => (/\.([a-z0-9]{2,5})$/i.exec(name) || [])[1]?.toLowerCase() || '';
const kindOf = file => (file.type.startsWith('image/') || EXT.image.includes(extOf(file.name)) ? 'image' : file.type.startsWith('video/') || EXT.video.includes(extOf(file.name)) ? 'video' : EXT.doc.includes(extOf(file.name)) ? 'doc' : '');
const real = t => (t && !/^\s*\[/.test(t) ? t : '');   // textele inca necompletate din data.js ([ ... ]) nu se pun in campuri

/* ---------- sesiunea si serverul ---------- */
let session = null;
try { session = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
if (!session?.token) session = null;
const isStaff = () => session && (session.me.role === 'admin' || session.me.role === 'teacher');
function forget() { session = null; try { localStorage.removeItem(STORE); } catch (e) {} }
async function api(method, path, { json, body } = {}) {
  let r;
  try {
    r = await fetch('/api' + path, { method, body: json ? JSON.stringify(json) : body, signal,
      headers: { ...(session ? { authorization: 'Bearer ' + session.token } : {}), ...(json ? { 'content-type': 'application/json' } : {}) } });
  } catch (e) { throw new Error('offline'); }
  let data = null; try { data = await r.json(); } catch (e) {}
  if (!r.ok) {
    const code = data?.error || (r.status === 404 ? 'not_configured' : 'server_error');
    if (code === 'signed_out' && session) { forget(); gate(say('signed_out')); }
    throw new Error(code);
  }
  return data;
}
// un fisier ajunge in R2; cele mari urca in bucati, cu trei incercari pentru fiecare bucata
async function send(blob, name, onBytes = () => {}) {
  const q = `?name=${encodeURIComponent(name)}&size=${blob.size}`;
  if (blob.size <= 20 * MB) { const r = await api('POST', '/files' + q, { body: blob }); onBytes(blob.size); return r.key; }
  const up = await api('POST', '/files/parts' + q), parts = [];
  try {
    for (let n = 1, at = 0; at < blob.size; n++, at += up.partSize) {
      const chunk = blob.slice(at, at + up.partSize);
      for (let attempt = 1; ; attempt++) {
        try { parts.push(await api('PUT', `/files/parts?key=${encodeURIComponent(up.key)}&n=${n}`, { body: chunk })); break; }
        catch (e) { if (attempt >= 3 || signal.aborted) throw e; await new Promise(res => setTimeout(res, 1500 * attempt)); }
      }
      onBytes(chunk.size);
    }
    await api('POST', `/files/parts/done?key=${encodeURIComponent(up.key)}`, { json: { parts } });
  } catch (e) { api('DELETE', `/files/parts?key=${encodeURIComponent(up.key)}`).catch(() => {}); throw e; }
  return up.key;
}

/* ---------- pozele se micsoreaza in browser inainte de upload (asa dispare si locul din datele pozei) ---------- */
const toBlob = (canvas, type, q) => new Promise(res => canvas.toBlob(res, type, q));
async function draw(source, w, h, max, q) {
  const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  let blob = await toBlob(c, 'image/webp', q);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(c, 'image/jpeg', q);   // Safari nu scrie WebP
  if (!blob) throw new Error('unreadable');
  return { blob, w: c.width, h: c.height, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
}
async function readImage(file) {
  try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { el: b, w: b.width, h: b.height }; } catch (e) {}
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    return { el: img, w: img.naturalWidth, h: img.naturalHeight };
  } catch (e) { throw new Error('unreadable'); } finally { setTimeout(() => URL.revokeObjectURL(url), 30000); }
}
async function shrink(file) {
  const im = await readImage(file);
  return { full: await draw(im.el, im.w, im.h, PHOTO.max, PHOTO.q), thumb: await draw(im.el, im.w, im.h, PHOTO.thumb, PHOTO.thumbQ) };
}
// o imagine din video, pentru Gallery (daca browserul nu poate, video-ul urca fara ea)
function poster(file) {
  return new Promise(res => {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    const done = r => { clearTimeout(t); URL.revokeObjectURL(url); res(r); };
    const t = setTimeout(() => done(null), 8000);
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => draw(v, v.videoWidth, v.videoHeight, PHOTO.thumb, PHOTO.thumbQ).then(d => done({ ...d, vw: v.videoWidth, vh: v.videoHeight }), () => done(null));
    v.onerror = () => done(null);
  });
}

/* ---------- starea formularului ---------- */
const st = { type: 'media', mob: S.mobilities[0].id, place: 'none', customPlace: '', inGallery: true, inMap: true, caption: '',
  day: -1, title: '', excerpt: '', body: '', showAuthor: false,
  cat: 'a', mat: 0, matTitle: '', by: {},
  sec: 0, resText: '', where: 0, linkTitle: '', url: '',
  info: 'programme', infoText: '',
  dp: 'day', dayI: 0, dDay: '', dDate: '', dTitle: '', dText: '', stopId: '', sTitle: '', sWhen: '', sText: '', sLoc: '',
  files: { media: [], story: [], doc: [], res: [], info: [] }, busy: null, done: null, error: '' };
const mob = () => S.mob(st.mob);
const slots = () => mob().materials.filter(x => x.cat === st.cat && !x.file && real(x.title)).map(x => x.title);
function fillDay() {
  const d = mob().days[st.dayI] || {};
  Object.assign(st, { dDay: real(d.day) || (d.day ? '' : 'Day ' + (st.dayI + 1)), dDate: real(d.date), dTitle: real(d.title), dText: real(d.text) });
}
function fillStop() {
  const s = mob().stops.find(x => x.id === st.stopId) || {};
  Object.assign(st, { sTitle: real(s.title), sWhen: real(s.when), sText: real(s.text), sLoc: '' });
}
function fillInfo() {
  const a = mob().about;
  st.infoText = st.info === 'goals' ? a.goals.filter(real).join('\n') : st.info === 'groups' ? real(a.groups) : st.info === 'text' ? real(a.text) : '';
}
// "45.64, 25.58" sau un link Google Maps (…/@45.64,25.58,… ori …!3d45.64!4d25.58…)
function coords(text) {
  const m = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(text) || /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(text) || /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(text) || /^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  const lat = +m[1], lon = +m[2];
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

/* ---------- bucatile din care e facut formularul ---------- */
const head = (eye, title) => `<div class="up-head"><span class="eyebrow">${eye}</span><h2 class="h3 up-h">${title}</h2></div>`;
const chips = (name, options, label) => `<div class="up-chips" role="group" aria-label="${esc(label)}">${options.map(([v, t]) =>
  `<button type="button" class="up-chip" data-set="${name}" data-v="${esc(v)}" aria-pressed="${String(st[name]) === String(v)}">${esc(t)}</button>`).join('')}</div>`;
const field = (label, inner, help = '') => `<div class="up-field"><span class="up-label">${label}</span>${inner}${help ? `<p class="up-help">${help}</p>` : ''}</div>`;
const input = (name, label, ph, { type = 'text', help = '', max = 160 } = {}) =>
  `<div class="up-field"><label class="up-label" for="up-${name}">${label}</label><input class="up-input" id="up-${name}" type="${type}" data-f="${name}" maxlength="${max}" placeholder="${esc(ph)}" value="${esc(st[name])}" autocomplete="off">${help ? `<p class="up-help">${help}</p>` : ''}</div>`;
const area = (name, label, ph, rows, max, help = '') =>
  `<div class="up-field"><label class="up-label" for="up-${name}">${label}</label><textarea class="up-input up-area" id="up-${name}" data-f="${name}" rows="${rows}" maxlength="${max}" placeholder="${esc(ph)}">${esc(st[name])}</textarea>${help ? `<p class="up-help">${help}</p>` : ''}</div>`;
const check = (name, text, sub = '', on = st[name]) => `<label class="up-check"><input type="checkbox" data-c="${esc(name)}"${on ? ' checked' : ''}><span>${text}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
function drop(slot, title, sub, accept, multiple) {
  const list = st.files[slot];
  return `<div class="up-drop" data-drop="${slot}">
    ${svg(ICON.up, 30)}<p class="up-drop-t">${title}</p><p class="up-help">${sub}</p>
    <button type="button" class="btn glass up-pick">Choose ${multiple ? 'files' : 'a file'}</button>
    <input type="file" class="sr" tabindex="-1" data-file="${slot}" accept="${accept}"${multiple ? ' multiple' : ''} aria-label="${esc(title)}">
  </div>${list.length ? `<ul class="up-files">${list.map((f, i) => `<li>
    <span class="up-file-n"><b>${esc(f.file.name)}</b><small>${size(f.file.size)}</small></span>
    ${slot === 'story' ? `<input class="up-input up-cap" type="text" maxlength="200" placeholder="Caption (optional)" value="${esc(f.caption)}" data-cap="${i}" aria-label="Caption for ${esc(f.file.name)}">` : ''}
    <button type="button" class="up-x" data-rm="${slot}:${i}" aria-label="Remove ${esc(f.file.name)}">${I.x}</button></li>`).join('')}</ul>` : ''}`;
}
const ACCEPT = { photos: 'image/*,video/mp4,video/quicktime,video/webm,.mov,.m4v', image: 'image/*', doc: '.pdf,.ppt,.pptx,.doc,.docx', pdf: '.pdf' };

function panelMedia() {
  const places = [...mob().stops.filter(s => real(s.title)).map(s => [s.id, s.title]), ['custom', 'Custom place'], ['none', 'No specific place']];
  const onMap = !['custom', 'none'].includes(st.place);
  const help = st.place === 'custom' ? 'A custom place is shown as a label in the Gallery. It does not appear on the map.'
    : st.place === 'none' ? 'The photos appear in the Gallery only.' : 'The photos also show up at this place on the map.';
  return head('Step 3', 'Photos &amp; videos') +
    drop('media', 'Drop photos and videos here', 'JPG, PNG, HEIC, MP4. As many as you want at once. Videos up to 300 MB.', ACCEPT.photos, true) +
    field('Where were they taken?', chips('place', places, 'Place') + (st.place === 'custom' ? input('customPlace', 'Name of the place', 'Where were the photos taken?', { max: 80 }) : ''), help) +
    (onMap ? field('Show them in', `<div class="up-checks">${check('inGallery', 'Gallery')}${check('inMap', 'Journey, Daily activities', 'At the place chosen above')}</div>`) : '') +
    input('caption', 'Caption (optional)', 'One caption for all the photos', { max: 200, help: 'You can change the caption of each photo after the upload.' });
}
function panelStory() {
  const days = [...mob().days.map((d, i) => [i, [real(d.day) || 'Day ' + (i + 1), real(d.date)].filter(Boolean).join(' · ')]), [-1, 'Not one day']];
  return head('Step 3', 'Journal story') +
    input('title', 'Title', 'Title of the story', { max: 120 }) +
    field('Which day is it about?', chips('day', days, 'Day')) +
    input('excerpt', 'Short summary (optional)', 'Two lines about the day', { max: 300, help: 'Shown on the Journal card. Left empty, the first lines of the story are used.' }) +
    area('body', 'Story', 'Write the story here. Leave an empty line between paragraphs.', 10, 20000) +
    field('Photos for the story', drop('story', 'Drop the photos here', 'The first one becomes the cover.', ACCEPT.image, true)) +
    `<div class="up-checks">${check('showAuthor', 'Show my name as author', esc(session.me.name))}</div>`;
}
function panelMaterial() {
  const names = [...slots(), 'A new one'];
  if (st.mat >= names.length) st.mat = names.length - 1;
  const isNew = st.mat === names.length - 1;
  return head('Step 3', 'Learning material') +
    field('Category', `<div class="up-rows" role="group" aria-label="Category">${S.materialCats.map(c =>
      `<button type="button" class="up-row" data-set="cat" data-v="${c.id}" aria-pressed="${st.cat === c.id}"><b>${c.id.toUpperCase()}</b><span>${esc(c.name)}</span></button>`).join('')}</div>`) +
    field('Which material?', chips('mat', names.map((n, i) => [i, n]), 'Material'), names.length > 1 ? 'The ones already listed on the page only need their file.' : '') +
    (isNew ? input('matTitle', 'Title', 'Title of the presentation or worksheet') : '') +
    field('Made by', `<div class="up-checks up-checks--2">${MADE_BY.map((n, i) => check('by:' + i, n, '', st.by[i])).join('')}</div>`) +
    field('File', drop('doc', 'Drop the file here', 'PDF, PowerPoint or Word, up to 100 MB', ACCEPT.doc, false), 'A PDF opens right on the page. PowerPoint and Word are offered as a download.');
}
function panelResult() {
  return head('Step 3', 'Evaluation &amp; results') +
    field('Which part?', chips('sec', SECS.map((n, i) => [i, n]), 'Part'), 'Every text stays on the page, one under another.') +
    area('resText', 'Text', 'Write the text here', 7, 4000) +
    field('File (optional)', drop('res', 'Drop a file here', 'A chart, a questionnaire or a report (PDF, PowerPoint, Word)', ACCEPT.doc, false));
}
function panelLink() {
  return head('Step 3', 'Dissemination') +
    field('Where was it published?', chips('where', WHERE.map((n, i) => [i, n]), 'Where')) +
    input('linkTitle', 'Title', 'Title of the article or post') +
    input('url', 'Link', 'https://', { type: 'url', max: 500 });
}
function panelInfo() {
  const file = st.info === 'programme' || st.info === 'photo';
  return head('Step 3', 'Mobility info') +
    field('Which part?', chips('info', INFO, 'Part'), 'What you publish here replaces what is on the page now.') +
    (file ? field('File', st.info === 'programme' ? drop('info', 'Drop the programme here', 'One PDF file', ACCEPT.pdf, false) : drop('info', 'Drop the photo here', 'One photo of the mobility', ACCEPT.image, false))
      : area('infoText', 'Text', 'Write the text here', st.info === 'goals' ? 5 : 6, 3000, st.info === 'goals' ? 'Write one goal on each line.' : ''));
}
function panelPlaces() {
  const m = mob();
  let h = head('Step 3', 'Days &amp; places') + field('What do you want to change?', chips('dp', [['day', 'A day'], ['place', 'A place on the map']], 'Day or place'), 'What you publish here replaces what is on the page now.');
  if (st.dp === 'day') {
    h += field('Which day?', chips('dayI', [...m.days.map((d, i) => [i, real(d.day) || 'Day ' + (i + 1)]), [m.days.length, 'A new day']], 'Day')) +
      `<div class="up-two">${input('dDay', 'Name of the day', 'Monday', { max: 30 })}${input('dDate', 'Date', '16 November', { max: 40 })}</div>` +
      input('dTitle', 'Title of the day', 'Welcome to Brașov', { max: 120 }) +
      area('dText', 'What happened that day', 'One or two sentences', 3, 600);
  } else {
    const isNew = !m.stops.some(s => s.id === st.stopId);
    h += field('Which place?', chips('stopId', [...m.stops.map((s, i) => [s.id, real(s.title) || 'Place ' + (i + 1)]), ['', 'A new place']], 'Place')) +
      input('sTitle', 'Name of the place', 'Bran Castle', { max: 120 }) +
      input('sWhen', 'When', 'Thursday · 19 November', { max: 60 }) +
      area('sText', 'What we did there', 'One or two sentences', 3, 600) +
      input('sLoc', isNew ? 'Where is it?' : 'Move the pin (optional)', 'Paste a Google Maps link, or 45.5149, 25.3672', { max: 600,
        help: st.sLoc ? (coords(st.sLoc) ? `Found: ${coords(st.sLoc).lat.toFixed(4)}, ${coords(st.sLoc).lon.toFixed(4)}` : 'No coordinates found in this text yet.')
          : 'In Google Maps: right click on the place, click the two numbers to copy them, paste them here.' });
  }
  return h;
}
const PANEL = { media: panelMedia, story: panelStory, material: panelMaterial, result: panelResult, link: panelLink, info: panelInfo, places: panelPlaces };

/* ---------- formularul ---------- */
function formHTML() {
  const types = TYPES.filter(t => !t.staff || isStaff());
  if (!types.some(t => t.id === st.type)) st.type = 'media';
  return `
  <section class="glass card up-card">${head('Step 1', 'What are you uploading?')}
    <div class="up-tiles" role="group" aria-label="Kind of upload">${types.map(t =>
      `<button type="button" class="up-tile" data-set="type" data-v="${t.id}" aria-pressed="${st.type === t.id}">${svg(ICON[t.id], 26)}<b>${t.name}</b><span>${t.hint}</span></button>`).join('')}</div>
  </section>
  <section class="glass card up-card">${head('Step 2', 'Which mobility?')}
    ${chips('mob', S.mobilities.map(m => [m.id, `${m.n} · ${m.city}, ${m.country}`]), 'Mobility')}
  </section>
  <section class="glass card up-card up-panel">${PANEL[st.type]()}</section>
  <section class="glass up-publish" aria-live="polite">${publishHTML()}</section>`;
}
function publishHTML() {
  if (st.busy) return `<div class="up-pub-txt"><b>${esc(st.busy.text)}</b><div class="up-bar"><i style="width:${Math.round(st.busy.p * 100)}%"></i></div><p class="up-help">Keep this page open until it is done.</p></div>`;
  const msg = st.done ? `<b>${esc(st.done.text)}</b><p class="up-help">${st.done.href ? `<a href="${st.done.href}" rel="external">See it on the site</a>` : ''}${st.done.warn ? ` ${esc(st.done.warn)}` : ''}</p>`
    : st.error ? `<b class="up-err">${esc(st.error)}</b><p class="up-help">Nothing was lost. Fix it and press Publish again.</p>`
    : '<b>It goes live right away, for everyone.</b><p class="up-help">You can edit or delete it later from this device.</p>';
  return `<div class="up-pub-txt">${msg}</div><button type="button" class="btn btn--solid up-go" data-act="publish">Publish now ${I.arrow}</button>`;
}

/* ---------- publicarea ---------- */
class Stop extends Error {}
const need = (ok, text) => { if (!ok) throw new Stop(text); };
function progress(text, p) { st.busy = { text, p }; const el = root.querySelector('.up-publish'); if (el) el.innerHTML = publishHTML(); }
const post = (type, data) => api('POST', '/items', { json: { type, mob: st.mob, data } });
async function sendDoc(f, label) { let sent = 0; return send(f.file, f.file.name, n => { sent += n; progress(label, sent / f.file.size); }); }
async function sendPhoto(file) {
  const { full, thumb } = await shrink(file), base = file.name.replace(/\.[^.]+$/, '');
  return { key: await send(full.blob, `${base}.${full.ext}`), thumb: await send(thumb.blob, `${base}-small.${thumb.ext}`), w: full.w, h: full.h };
}
async function publish() {
  const m = mob();
  if (st.type === 'media') {
    const list = st.files.media;
    need(list.length, 'Choose at least one photo or video.');
    const stopOK = m.stops.some(s => s.id === st.place);
    need(st.place !== 'custom' || st.customPlace.trim(), 'Write the name of the place.');
    need(!stopOK || st.inGallery || st.inMap, 'Tick where the photos should show: Gallery, the map, or both.');
    const base = { caption: st.caption, stop: stopOK ? st.place : '', place: st.place === 'custom' ? st.customPlace : '', gallery: stopOK ? st.inGallery : true, map: stopOK && st.inMap };
    const total = list.reduce((n, f) => n + f.file.size, 0), failed = [];
    let before = 0, ok = 0;
    for (const [i, f] of list.entries()) {
      const label = `Uploading ${i + 1} of ${list.length}`;
      progress(label, before / total);
      try {
        if (kindOf(f.file) === 'video') {
          const p = await poster(f.file);
          let sent = 0;
          const key = await send(f.file, f.file.name, n => { sent += n; progress(label, (before + sent) / total); });
          const thumb = p ? await send(p.blob, f.file.name.replace(/\.[^.]+$/, '') + `-poster.${p.ext}`) : '';
          await post('media', { ...base, key, thumb, w: p?.vw, h: p?.vh });
        } else await post('media', { ...base, ...await sendPhoto(f.file) });
        ok++; f.sent = true;
      } catch (e) {
        if (e.message === 'signed_out' || e.message === 'offline' || e.message === 'daily_limit') { st.files.media = list.filter(x => !x.sent); throw e; }
        failed.push(`${f.file.name} (${e.message === 'unreadable' ? 'this photo format cannot be read here; save it as JPG first' : say(e.message)})`);
      }
      before += f.file.size;
    }
    st.files.media = list.filter(x => !x.sent);
    need(ok, 'Nothing was uploaded: ' + failed.join('; '));
    return { text: `${ok} ${ok === 1 ? 'file is' : 'files are'} live.`, href: base.map ? `journey.html#${m.id}-daily` : `gallery.html#${m.id}`, warn: failed.length ? 'Not uploaded: ' + failed.join('; ') : '' };
  }
  if (st.type === 'story') {
    need(st.title.trim(), 'The story needs a title.'); need(st.body.trim(), 'Write the story first.');
    const photos = [];
    for (const [i, f] of st.files.story.entries()) {
      progress(`Uploading photo ${i + 1} of ${st.files.story.length}`, i / st.files.story.length);
      try { const p = await sendPhoto(f.file); photos.push({ key: p.key, thumb: p.thumb, caption: f.caption }); }
      catch (e) { if (e.message !== 'unreadable') throw e; throw new Stop(`${f.file.name}: this photo format cannot be read here. Save it as JPG first, or remove it.`); }
    }
    progress('Publishing the story', 1);
    const it = await post('story', { day: +st.day, title: st.title, excerpt: st.excerpt, body: st.body, author: st.showAuthor ? session.me.name : '', photos });
    Object.assign(st, { title: '', excerpt: '', body: '' }); st.files.story = [];
    return { text: 'The story is live.', href: `journal.html#s-${it.id}` };
  }
  if (st.type === 'material') {
    const names = slots(), isNew = st.mat >= names.length, f = st.files.doc[0];
    need(!isNew || st.matTitle.trim(), 'The material needs a title.'); need(f, 'Choose the file.');
    const key = await sendDoc(f, 'Uploading the file');
    await post('material', { cat: st.cat, slot: isNew ? '' : names[st.mat], title: isNew ? st.matTitle : '', by: MADE_BY.filter((n, i) => st.by[i]).join(', '), key });
    st.matTitle = ''; st.files.doc = []; st.mat = 0;
    return { text: 'The material is live.', href: `journey.html#${m.id}-materials` };
  }
  if (st.type === 'result') {
    need(st.resText.trim(), 'Write the text first.');
    const f = st.files.res[0], key = f ? await sendDoc(f, 'Uploading the file') : '';
    await post('result', { sec: +st.sec, text: st.resText, key });
    st.resText = ''; st.files.res = [];
    return { text: 'It is live.', href: `journey.html#${m.id}-results` };
  }
  if (st.type === 'link') {
    need(st.linkTitle.trim(), 'The link needs a title.'); need(/^https?:\/\/\S+\.\S+/.test(st.url.trim()), 'Paste the full link, starting with https://');
    await post('link', { where: +st.where, title: st.linkTitle, url: st.url.trim() });
    st.linkTitle = ''; st.url = '';
    return { text: 'The link is live.', href: `journey.html#${m.id}-dissemination` };
  }
  if (st.type === 'info') {
    if (st.info === 'programme' || st.info === 'photo') {
      const f = st.files.info[0]; need(f, 'Choose the file.');
      let data;
      if (st.info === 'photo') { progress('Uploading the photo', 0.3); try { data = { key: (await sendPhoto(f.file)).key }; } catch (e) { if (e.message !== 'unreadable') throw e; throw new Stop('This photo format cannot be read here. Save it as JPG first.'); } }
      else { need(extOf(f.file.name) === 'pdf', 'The programme has to be a PDF file.'); data = { key: await sendDoc(f, 'Uploading the programme') }; }
      await post('info', { part: st.info, ...data });
      st.files.info = [];
    } else { need(st.infoText.trim(), 'Write the text first.'); await post('info', { part: st.info, text: st.infoText }); }
    return { text: 'It is live.', href: `journey.html#${m.id}` };
  }
  if (st.dp === 'day') {
    need(st.dDay.trim() && st.dTitle.trim(), 'The day needs a name and a title.');
    await post('day', { i: +st.dayI, day: st.dDay, date: st.dDate, title: st.dTitle, text: st.dText });
  } else {
    const isNew = !m.stops.some(s => s.id === st.stopId), at = coords(st.sLoc);
    need(st.sTitle.trim(), 'The place needs a name.'); need(!isNew || at, 'Paste a Google Maps link or the coordinates of the place.'); need(!st.sLoc.trim() || at, 'No coordinates found in the location text.');
    await post('stop', { id: isNew ? 'c-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(16) : st.stopId, title: st.sTitle, when: st.sWhen, text: st.sText, ...(at || {}) });
  }
  return { text: 'It is live.', href: `journey.html#${m.id}-daily` };
}
async function go() {
  if (st.busy) return;
  st.done = null; st.error = '';
  try {
    progress('Starting', 0);
    st.done = await publish();
    stale = true;
    mine();
  } catch (e) {
    if (e.message === 'signed_out') return;
    st.error = e instanceof Stop ? e.message : say(e.message);
  }
  st.busy = null;
  render(false);
}

/* ---------- dreapta: cine esti, ce ai urcat, parolele ---------- */
let items = null, shown = 8, keys = null, newKey = null, newKeyJustMade = false;
const LABEL = { media: 'Photo', story: 'Journal', material: 'Material', result: 'Results', link: 'Link', info: 'Mobility info', day: 'Day', stop: 'Place' };
function describe(it) {
  const m = S.mob(it.mob), stop = it.stop && m?.stops.find(s => s.id === it.stop);
  const city = m ? m.city : '';
  if (it.type === 'media') return [it.kind === 'video' ? 'Video' : 'Photo', it.caption || (stop ? stop.title : it.place) || 'No caption', [city, stop ? stop.title : it.place].filter(Boolean).join(' · ')];
  if (it.type === 'story') return ['Journal', it.title, city];
  if (it.type === 'material') return ['Material', it.title || it.slot, `${city} · category ${it.cat.toUpperCase()}`];
  if (it.type === 'result') return ['Results', it.text.slice(0, 70), `${city} · ${SECS[it.sec]}`];
  if (it.type === 'link') return ['Link', it.title, `${city} · ${WHERE[it.where]}`];
  if (it.type === 'info') return ['Mobility info', (INFO.find(x => x[0] === it.part) || [])[1], city];
  if (it.type === 'day') return ['Day', `${it.day}: ${it.title}`, city];
  return ['Place', it.title, city];
}
function sideHTML() {
  const me = session.me, admin = me.role === 'admin';
  const list = items ? (items.length ? `<ul class="up-list">${items.slice(0, shown).map(it => {
    const [tag, title, meta] = describe(it), when = new Date(it.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `<li><div class="up-li"><span class="tag b">${esc(tag)}</span><b>${esc(title)}</b><small>${esc(meta)} · ${when}${it.uploader ? ` · ${esc(it.uploader)}` : ''}</small></div>
      <button type="button" class="up-ic" data-edit="${it.id}" aria-label="Edit ${esc(title)}">${svg(ICON.edit, 18)}</button>
      <button type="button" class="up-ic" data-del="${it.id}" aria-label="Delete ${esc(title)}">${svg(ICON.bin, 18)}</button></li>`;
  }).join('')}</ul>${items.length > shown ? '<button type="button" class="btn glass" data-act="more">Show more</button>' : ''}` : '<p class="up-help">Nothing yet. What you publish shows up here.</p>')
    : '<p class="up-help">Loading…</p>';
  return `
  <section class="glass card up-side"><span class="eyebrow">Signed in</span>
    <p class="h3 up-name">${esc(me.name)}</p>
    <p class="up-help">Key: ${esc(me.label)}. This device stays signed in.</p>
    <button type="button" class="btn glass" data-act="logout">Log out</button>
  </section>
  <section class="glass card up-side"><span class="eyebrow">${isStaff() ? 'All uploads' : 'Your uploads'}</span>${list}
    <p class="up-help">${isStaff() ? 'You can edit or delete any upload.' : 'Only what was uploaded from this device shows up here.'}</p>
  </section>
  ${admin ? `<section class="glass card up-side"><span class="eyebrow">Access keys</span>
    ${newKey ? `<div class="up-newkey" role="status"><small>New key for ${esc(newKey.label)}. Write it down now, it is shown only once:</small><code>${esc(newKey.key)}</code><button type="button" class="btn glass" data-act="copykey">Copy</button></div>` : ''}
    ${keys ? (keys.length ? `<ul class="up-list">${keys.map(k => `<li><div class="up-li"><span class="tag ${k.role === 'teacher' ? 'y' : 'b'}">${k.role === 'teacher' ? 'Teachers' : 'Students'}</span><b>${esc(k.label)}${k.active ? '' : ' (off)'}</b><small>${k.devices} ${k.devices === 1 ? 'device' : 'devices'}${k.names ? ': ' + esc(k.names) : ''}</small></div>
      <button type="button" class="btn glass up-sm" data-key="${k.id}" data-on="${k.active ? 0 : 1}">${k.active ? 'Turn off' : 'Turn on'}</button></li>`).join('')}</ul>` : '<p class="up-help">No keys yet. Make the first one below.</p>') : '<p class="up-help">Loading…</p>'}
    <div class="up-field"><label class="up-label" for="up-klabel">New key for</label><input class="up-input" id="up-klabel" type="text" maxlength="60" placeholder="Honterus students, class 10A" autocomplete="off"></div>
    <div class="up-chips" role="group" aria-label="Kind of key"><button type="button" class="up-chip" data-krole="student" aria-pressed="true">Students</button><button type="button" class="up-chip" data-krole="teacher" aria-pressed="false">Teachers</button></div>
    <div class="up-field"><label class="up-label" for="up-kcustom">Your own key (optional)</label><input class="up-input" id="up-kcustom" type="text" maxlength="100" placeholder="Leave empty to get a random one" autocomplete="off"></div>
    <p class="up-help up-kerr" role="alert"></p>
    <button type="button" class="btn btn--solid" data-act="newkey">Create key</button>
    <p class="up-help">Turning a key off signs out everyone who used it. What they uploaded stays.</p>
  </section>` : ''}`;
}
async function mine() {
  try { items = (await api('GET', '/mine')).items; } catch (e) { if (e.message === 'signed_out') return; items = items || []; }
  if (session?.me.role === 'admin') try { keys = (await api('GET', '/admin/keys')).keys; } catch (e) { keys = keys || []; }
  if (session) renderSide();
}
function renderSide() {
  const el = root.querySelector('.up-aside'); if (!el) return;
  // ce a apucat adminul sa scrie la "New key" ramane scris cand lista se reincarca
  const keep = ['#up-klabel', '#up-kcustom'].map(q => el.querySelector(q)?.value || ''), role = el.querySelector('[data-krole][aria-pressed="true"]')?.dataset.krole;
  const focus = document.activeElement?.id;
  el.innerHTML = sideHTML();
  ['#up-klabel', '#up-kcustom'].forEach((q, i) => { const f = el.querySelector(q); if (f && !newKeyJustMade) f.value = keep[i]; });
  if (role) el.querySelectorAll('[data-krole]').forEach(b => b.setAttribute('aria-pressed', b.dataset.krole === role));
  if (focus && el.querySelector('#' + focus)) el.querySelector('#' + focus).focus({ preventScroll: true });
  newKeyJustMade = false;
}

/* ---------- editare si stergere ---------- */
function dialog(title, inner, okText, onOK) {
  const d = document.createElement('dialog');
  d.className = 'up-dialog glass';
  d.innerHTML = `<form method="dialog"><h2 class="h3">${title}</h2>${inner}<p class="up-help up-derr" role="alert"></p>
    <div class="btn-row"><button type="button" class="btn glass" data-x>Cancel</button><button type="submit" class="btn btn--solid">${okText}</button></div></form>`;
  document.body.appendChild(d);
  const close = () => { d.close(); d.remove(); };
  d.querySelector('[data-x]').addEventListener('click', close);
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  d.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = d.querySelector('[type=submit]'); ok.disabled = true;
    try { await onOK(d); close(); mine(); stale = true; }
    catch (err) { d.querySelector('.up-derr').textContent = say(err.message); ok.disabled = false; }
  });
  signal.addEventListener('abort', () => d.isConnected && close());
  d.showModal();
}
function edit(it) {
  const m = S.mob(it.mob) || S.mobilities[0];
  const f = (name, label, value, max, rows) => `<div class="up-field"><label class="up-label" for="ed-${name}">${label}</label>${rows
    ? `<textarea class="up-input up-area" id="ed-${name}" name="${name}" rows="${rows}" maxlength="${max}">${esc(value)}</textarea>`
    : `<input class="up-input" id="ed-${name}" name="${name}" type="text" maxlength="${max}" value="${esc(value)}" autocomplete="off">`}</div>`;
  const sel = (name, label, options, value) => `<div class="up-field"><label class="up-label" for="ed-${name}">${label}</label><select class="up-input" id="ed-${name}" name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const tick = (name, label, on) => `<label class="up-check"><input type="checkbox" name="${name}"${on ? ' checked' : ''}><span>${label}</span></label>`;
  let inner = '';
  if (it.type === 'media') inner = f('caption', 'Caption', it.caption, 200) +
    sel('stop', 'Place', [...m.stops.map(s => [s.id, real(s.title) || s.id]), ['', 'Custom place or no place']], it.stop) + f('place', 'Custom place (only without a place above)', it.place, 80) +
    `<div class="up-checks">${tick('gallery', 'Show in the Gallery', it.gallery)}${tick('map', 'Show at its place on the map', it.map)}</div>`;
  else if (it.type === 'story') inner = f('title', 'Title', it.title, 120) + sel('day', 'Day', [...m.days.map((d, i) => [i, real(d.day) || 'Day ' + (i + 1)]), [-1, 'Not one day']], it.day) +
    f('excerpt', 'Short summary', it.excerpt, 300) + f('body', 'Story', it.body, 20000, 10) + f('author', 'Author shown on the site (empty = no name)', it.author, 60);
  else if (it.type === 'material') inner = (it.slot ? '' : f('title', 'Title', it.title, 160)) + f('by', 'Made by', it.by, 120);
  else if (it.type === 'result') inner = sel('sec', 'Part', SECS.map((n, i) => [i, n]), it.sec) + f('text', 'Text', it.text, 4000, 7);
  else if (it.type === 'link') inner = sel('where', 'Where', WHERE.map((n, i) => [i, n]), it.where) + f('title', 'Title', it.title, 160) + f('url', 'Link', it.url, 500);
  else if (it.type === 'info') inner = it.text !== undefined ? f('text', 'Text', it.text, 3000, 6) : '<p class="up-help">To change this file, publish a new one from Mobility info: it replaces this one.</p>';
  else if (it.type === 'day') inner = f('day', 'Name of the day', it.day, 30) + f('date', 'Date', it.date, 40) + f('title', 'Title', it.title, 120) + f('text', 'What happened that day', it.text, 600, 3);
  else inner = f('title', 'Name of the place', it.title, 120) + f('when', 'When', it.when, 60) + f('text', 'What we did there', it.text, 600, 3);
  dialog('Edit', inner, 'Save', async d => {
    const v = Object.fromEntries(new FormData(d.querySelector('form')));
    const data = { ...it, ...v };
    for (const k of ['day', 'sec', 'where']) if (k in v && it.type !== 'day') data[k] = +v[k];
    if (it.type === 'media') { data.map = 'map' in v && !!v.stop; data.gallery = 'gallery' in v || !data.map; if (v.stop) data.place = ''; }
    await api('PUT', '/items/' + it.id, { json: { data } });
  });
}
function remove(it) {
  const [, title] = describe(it);
  dialog('Delete it?', `<p class="muted">“${esc(title)}” disappears from the website for everyone. This cannot be undone.</p>`, 'Delete', () => api('DELETE', '/items/' + it.id));
}

/* ---------- desenarea ---------- */
function render(keepFocus = true) {
  const focus = keepFocus && document.activeElement?.closest?.('#uploadRoot') ? document.activeElement : null;
  const key = focus && (focus.id ? '#' + focus.id : focus.dataset.set ? `[data-set="${focus.dataset.set}"][data-v="${CSS.escape(focus.dataset.v)}"]` : '');
  const pos = focus && 'selectionStart' in focus ? [focus.selectionStart, focus.selectionEnd] : null;
  if (!root.querySelector('.up-grid')) root.innerHTML = '<div class="up-grid"><div class="up-form"></div><aside class="up-aside" aria-label="Your account"></aside></div>';
  root.querySelector('.up-form').innerHTML = formHTML();
  if (key) { const el = root.querySelector(key); if (el) { el.focus({ preventScroll: true }); if (pos) try { el.setSelectionRange(pos[0], pos[1]); } catch (e) {} } }
}
function app() { root.innerHTML = ''; render(false); renderSide(); mine(); }
function gate(note = '') {
  root.innerHTML = `
  <form class="glass card up-gate" novalidate>
    <div class="up-head"><span class="eyebrow">Project team only</span><h2 class="h3 up-h">Enter your access key</h2></div>
    <p class="muted">You got a key from your teacher. You enter it once, then this device stays signed in.</p>
    <div class="up-field"><label class="up-label" for="up-key">Access key</label><input class="up-input" id="up-key" type="password" autocomplete="off" maxlength="200" placeholder="Your key" required></div>
    <div class="up-field"><label class="up-label" for="up-who">Your name</label><input class="up-input" id="up-who" type="text" autocomplete="name" maxlength="60" placeholder="First and last name" required>
      <p class="up-help">Only the website team sees who uploaded what.</p></div>
    <p class="up-help up-gerr" role="alert">${esc(note)}</p>
    <button type="submit" class="btn btn--solid">Unlock ${I.arrow}</button>
  </form>`;
  const form = root.querySelector('.up-gate'), err = form.querySelector('.up-gerr');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const key = form.querySelector('#up-key').value.trim(), name = form.querySelector('#up-who').value.trim();
    if (!key || name.length < 2) { err.textContent = 'Fill in the key and your name.'; return; }
    const b = form.querySelector('[type=submit]'); b.disabled = true; err.textContent = '';
    try {
      const r = await api('POST', '/login', { json: { key, name } });
      session = { token: r.token, me: r.me };
      try { localStorage.setItem(STORE, JSON.stringify(session)); } catch (e2) {}
      app();
    } catch (e2) { err.textContent = say(e2.message); b.disabled = false; }
  });
}

/* ---------- ce se intampla la click, la scris si la fisiere ---------- */
function addFiles(slot, fileList) {
  const want = { media: ['image', 'video'], story: ['image'], doc: ['doc'], res: ['doc'], info: st.info === 'photo' ? ['image'] : ['doc'] }[slot];
  const multiple = slot === 'media' || slot === 'story', bad = [];
  for (const file of fileList) {
    const kind = kindOf(file);
    if (!want.includes(kind)) bad.push(`${file.name}: this kind of file does not go here`);
    else if (file.size > LIMIT[kind]) bad.push(`${file.name}: too big (${size(file.size)}, the limit is ${size(LIMIT[kind])})${kind === 'video' ? '. Make the clip shorter or export it at 1080p.' : ''}`);
    else if (multiple) st.files[slot].push({ file, caption: '' }); else st.files[slot] = [{ file, caption: '' }];
  }
  st.error = bad.join(' · '); st.done = null;
  render();
}
root.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t || st.busy) return;
  if (t.dataset.set) {
    const name = t.dataset.set, v = t.dataset.v, numeric = ['day', 'mat', 'sec', 'where', 'dayI'].includes(name);
    st[name] = numeric ? +v : v; st.done = null; st.error = '';
    if (name === 'mob') { Object.assign(st, { place: 'none', day: -1, mat: 0, dayI: 0, stopId: mob().stops[0]?.id || '' }); fillDay(); fillStop(); fillInfo(); }
    if (name === 'cat') st.mat = 0;
    if (name === 'dayI' || name === 'dp') fillDay();
    if (name === 'stopId' || name === 'dp') fillStop();
    if (name === 'info') { st.files.info = []; fillInfo(); }
    render();
  } else if (t.classList.contains('up-pick')) t.parentElement.querySelector('input[type=file]').click();
  else if (t.dataset.rm) { const [slot, i] = t.dataset.rm.split(':'); st.files[slot].splice(+i, 1); render(false); }
  else if (t.dataset.act === 'publish') go();
  else if (t.dataset.act === 'more') { shown += 20; renderSide(); }
  else if (t.dataset.act === 'logout') { api('POST', '/logout').catch(() => {}); forget(); items = keys = newKey = null; gate(); }
  else if (t.dataset.edit) edit(items.find(x => x.id === t.dataset.edit));
  else if (t.dataset.del) remove(items.find(x => x.id === t.dataset.del));
  else if (t.dataset.krole) t.parentElement.querySelectorAll('[data-krole]').forEach(b => b.setAttribute('aria-pressed', b === t));
  else if (t.dataset.act === 'newkey') {
    const box = t.closest('.up-side'), err = box.querySelector('.up-kerr'), label = box.querySelector('#up-klabel').value.trim();
    if (!label) { err.textContent = 'Write who the key is for.'; return; }
    try {
      newKey = await api('POST', '/admin/keys', { json: { label, role: box.querySelector('[data-krole][aria-pressed="true"]').dataset.krole, key: box.querySelector('#up-kcustom').value.trim() } });
      newKeyJustMade = true;
      await mine();
    } catch (e2) { err.textContent = say(e2.message); }
  } else if (t.dataset.act === 'copykey') { try { await navigator.clipboard.writeText(newKey.key); t.textContent = 'Copied'; } catch (e2) {} }
  else if (t.dataset.key) { try { await api('PUT', '/admin/keys/' + t.dataset.key, { json: { active: t.dataset.on === '1' } }); } catch (e2) {} mine(); }
});
root.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f) { st[t.dataset.f] = t.value; if (t.dataset.f === 'sLoc') { const h = t.parentElement.querySelector('.up-help'), c = coords(t.value); if (h) h.textContent = !t.value.trim() ? '' : c ? `Found: ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}` : 'No coordinates found in this text yet.'; } }
  else if (t.dataset.cap) st.files.story[+t.dataset.cap].caption = t.value;
});
root.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.c) { if (t.dataset.c.startsWith('by:')) st.by[+t.dataset.c.slice(3)] = t.checked; else st[t.dataset.c] = t.checked; }
  else if (t.dataset.file) { addFiles(t.dataset.file, [...t.files]); }
});
for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) root.addEventListener(type, e => {
  const zone = e.target.closest?.('.up-drop'); if (!zone) return;
  e.preventDefault();
  zone.classList.toggle('over', type === 'dragenter' || type === 'dragover');
  if (type === 'drop' && !st.busy) addFiles(zone.dataset.drop, [...e.dataTransfer.files]);
});
// dupa ce ai publicat ceva, celelalte pagini se reincarca de pe server, ca sa vezi ce ai urcat
let stale = false;
document.addEventListener('click', e => {
  if (!stale || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.('a[href]');
  if (!a || a.target || a.origin !== location.origin || a.getAttribute('href').startsWith('#')) return;
  e.preventDefault(); e.stopImmediatePropagation(); location.assign(a.href);
}, { capture: true, signal });
addEventListener('beforeunload', e => { if (st.busy) { e.preventDefault(); e.returnValue = ''; } }, { signal });

st.stopId = mob().stops[0]?.id || ''; fillDay(); fillStop(); fillInfo();
if (location.protocol === 'file:') { root.innerHTML = '<p class="glass note">Upload works on the website itself, not when the page is opened from a folder on the computer.</p>'; return; }
if (!session) { gate(); return; }
app();
// verifica la server ca accesul salvat mai e bun (parola poate fi anulata intre timp)
api('GET', '/me').then(r => { session.me = r.me; try { localStorage.setItem(STORE, JSON.stringify(session)); } catch (e) {} renderSide(); }).catch(() => {});
};
