/* =========================================================
   Pagina UPLOAD: parola, formularul, lista cu ce ai urcat si (pentru admin) parolele si dispozitivele.
   Parola nu se verifica aici, ci pe server (_worker.js). In browser ramane doar un cod de acces
   al acestui dispozitiv (localStorage, "erasmus-upload"), ca sa nu o mai ceara data viitoare.
   Textele formularului sunt mai jos, in TYPES si in functiile panel...; limitele sunt in LIMIT.
   ========================================================= */
window.PageControllers = window.PageControllers || {};
window.UPLOAD_JS_SRC = (document.currentScript && document.currentScript.src) || window.UPLOAD_JS_SRC || new URL('assets/js/upload.js', document.baseURI).href;   // de unde s-a incarcat fisierul acesta
window.PageControllers.upload = function (signal) {
const S = window.SITE, U = window.UI, { esc, I } = U;
const root = document.getElementById('uploadRoot');
if (!root) return;
// upload.html?demo = modul demo (vezi mai jos): merge fara server, nimic nu ajunge pe site
const DEMO = /(^|[?&#])demo\b/.test(location.search + location.hash);
const STORE = DEMO ? 'erasmus-upload-demo' : 'erasmus-upload', MB = 1024 * 1024;
const HEIC_SRC = new URL('../vendor/heic-to/heic-to.js', window.UPLOAD_JS_SRC).href;
const LIMIT = { image: 25 * MB, video: 300 * MB, doc: 100 * MB };
const PHOTO = { max: 2560, q: 0.9, thumb: 640, thumbQ: 0.8 };   // pozele: latura lunga si calitatea, pentru poza mare si pentru cea mica
const EXT = { image: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'gif', 'bmp'], video: ['mp4', 'm4v', 'mov', 'webm'], doc: ['pdf', 'ppt', 'pptx', 'pps', 'ppsx', 'doc', 'docx', 'xls', 'xlsx', 'odt', 'ods', 'odp', 'rtf', 'txt', 'csv', 'zip', 'mp3', 'm4a', 'wav', 'ogg'] };
const RAW_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'avif'];   // pozele pe care serverul le primeste si neschimbate
const SECS = ['Feedback', 'Impressions', 'Conclusions', 'Results and our goals', 'Skills and knowledge', 'Questionnaires (initial and final)'];
const WHERE = ['School website', 'Facebook', 'Press', 'School community', 'Press releases & promotion'];
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
  bin: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  restore: 'M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  cal: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5',
};
const svg = (d, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.split(' M').map((p, i) => `<path d="${i ? 'M' : ''}${p}"/>`).join('')}</svg>`;
// iconitele cardurilor de ales (acelasi desen in linie ca mai sus)
Object.assign(ICON, {
  check: 'M5 12.5l4.5 4.5L19 7.5', plus: 'M12 5v14 M5 12h14',
  school: 'M3 21h18 M5 21V10l7-5 7 5v11 M10 21v-5h4v5 M12 5V2.5h3.5',
  landmark: 'M4 21h16 M6.5 21V11 M10.2 21V11 M13.8 21V11 M17.5 21V11 M3.5 11h17 M12 3.5L4 8.5h16z',
  sheet: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12l1.2 1.2L12.5 11 M14.5 12h2 M9 16.5l1.2 1.2 2.3-2.2 M14.5 16.5h2',
  bulb: 'M9 18h6 M10 21h4 M8.5 14.5a6 6 0 1 1 7 0c-.6.6-.9 1.2-1 2h-5c-.1-.8-.4-1.4-1-2z',
  chat: 'M4 5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-6l-4 3.5V14H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M20 9.5a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1h-1v2.5L16 17h-3',
  heart: 'M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z',
  checklist: 'M10 6h10 M10 12h10 M10 18h10 M4 6l1.2 1.2L7.5 5 M4 12l1.2 1.2L7.5 11 M4 18l1.2 1.2L7.5 17',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 12h.01',
  cap: 'M2.5 9.5L12 5l9.5 4.5L12 14z M6.5 11.8V16c1.5 1.4 3.3 2 5.5 2s4-.6 5.5-2v-4.2 M21.5 9.5V15',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  social: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M17.2 6.8h.01',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2z M17 9h3v8a2 2 0 0 1-2 2 M7.5 9h6 M7.5 12.5h6 M7.5 16h4',
  people: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11z M3 19.5c.4-3.2 2.8-5 6-5s5.6 1.8 6 5 M16 4.8a3.2 3.2 0 0 1 0 6.2 M17.5 14.8c2 .6 3.2 2.2 3.5 4.7',
  text: 'M5 6h14 M5 10.5h14 M5 15h14 M5 19.5h8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5c.6-3.8 3.5-6 7.5-6s6.9 2.2 7.5 6',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  range: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 15h8 M13.5 12.5L16 15l-2.5 2.5',
  slot: 'M6 3h9l4 4v14H6z M14 3v5h5 M12 11v6 M9.5 14.5L12 17l2.5-2.5',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
});
// desenele mari de pe cardurile cu felul de upload (120 x 80, linie albastra + accent galben)
const art = inner => `<svg class="up-art" viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ART = {
  media: `<rect class="s" x="22" y="14" width="58" height="44" rx="6" transform="rotate(-9 51 36)"/><rect class="f" x="38" y="18" width="64" height="48" rx="6"/>
    <path d="M40 58l17-15 11 10 9-8 23 19"/><circle class="y" cx="86" cy="32" r="5"/><circle class="yf" cx="34" cy="60" r="11"/><path class="d" d="M31 55v10l8-5z"/>`,
  story: `<rect class="f" x="28" y="8" width="52" height="64" rx="6"/><path class="b" d="M38 22h22"/><path d="M38 34h32M38 43h32M38 52h32M38 61h18"/>
    <path class="yf" d="M96 16l8 8-27 27-11 3 3-11z"/><path class="d" d="M91 21l8 8"/>`,
  material: `<rect class="f" x="20" y="10" width="80" height="48" rx="5"/><path d="M60 58v10M44 70h32"/><circle cx="43" cy="34" r="12"/><path class="yf" d="M43 34V22a12 12 0 0 1 12 12z"/>
    <path d="M66 26h24M66 34h24M66 42h14"/>`,
  result: `<path d="M22 10v56h80"/><rect class="f" x="32" y="46" width="11" height="20" rx="2"/><rect class="f" x="50" y="36" width="11" height="30" rx="2"/><rect class="f" x="68" y="26" width="11" height="40" rx="2"/><rect class="f" x="86" y="40" width="11" height="26" rx="2"/>
    <path class="y" d="M30 38l20-12 18-10 16 8 16-12"/><path class="y" d="M92 11l9 1-2 9"/>`,
  link: `<rect class="f" x="16" y="12" width="88" height="56" rx="7"/><path d="M16 26h88"/><path class="b" d="M24 19h.01M31 19h.01M38 19h.01"/>
    <path class="y" d="M56 50a8 8 0 0 0 11.3 0l6-6a8 8 0 0 0-11.3-11.3l-2 2"/><path class="y" d="M64 42a8 8 0 0 0-11.3 0l-6 6a8 8 0 0 0 11.3 11.3l2-2"/>`,
  info: `<rect class="f" x="32" y="8" width="56" height="64" rx="6"/><path d="M42 44h36M42 53h36M42 62h20"/><circle class="yf" cx="60" cy="26" r="10"/><path class="d" d="M60 25v6M60 21h.01"/>`,
  places: `<path class="f" d="M14 22l30-9 32 9 30-9v46l-30 9-32-9-30 9z"/><path d="M44 13v46M76 22v46"/><path class="y" stroke-dasharray="2 6" d="M26 54c10-14 22 4 32-8s12-8 22-12"/>
    <path class="yf" d="M88 40s9-8 9-15a9 9 0 0 0-18 0c0 7 9 15 9 15z"/><circle class="d" cx="88" cy="25" r="2.6"/>`,
  drop: `<rect class="s" x="18" y="24" width="40" height="46" rx="6" transform="rotate(-10 38 47)"/><rect class="s" x="62" y="24" width="40" height="46" rx="6" transform="rotate(10 82 47)"/>
    <rect class="f" x="38" y="16" width="44" height="54" rx="6"/><path class="y" d="M60 56V32M50 41l10-10 10 10"/>`,
};
// un rand scurt de text + iconita pentru fiecare optiune din liste (ordinea = cea din SECS, WHERE, MADE_BY)
const SEC_UI = [['chat', 'What students and teachers said.'], ['heart', 'Moments that stayed with us.'], ['checklist', 'What we take away.'], ['target', 'What we reached, against the plan.'], ['cap', 'What we learned and can do now.'], ['sheet', 'Before and after the mobility.']];
const WHERE_UI = [['globe', 'An article on a school page.'], ['social', 'A post, a story or a reel.'], ['news', 'A newspaper, TV or a news site.'], ['people', 'Parents, classes, local partners.'], ['text', 'A press release, a poster or a flyer.']];
const INFO_UI = { programme: ['cal', 'The schedule of the week, one PDF.'], photo: ['media', 'The cover image of the mobility.'], text: ['text', 'The short presentation.'], goals: ['target', 'The list of objectives.'], groups: ['people', 'Who came from each school.'] };
const CAT_ICON = { a: 'school', b: 'landmark', c: 'sheet', d: 'bulb' };
const BY_FLAG = ['ro', 'fr', 'dk', ''];
// iconita din capul fiecarui pas
const STEP_ICON = { type: 'up', mob: 'globe', files: 'media', place: 'places', where: 'eye', caption: 'text', story: 'story', day: 'cal', photos: 'media', author: 'user', cat: 'material', mat: 'sheet',
  by: 'people', doc: 'up', sec: 'result', resText: 'text', resFile: 'up', linkWhere: 'news', link: 'link', info: 'info', infoFile: 'up', infoText: 'text', dp: 'places', which: 'places', dayFields: 'cal', placeFields: 'places', loc: 'places', preview: 'eye' };
// dupa ce alegi un card la un pas cu un singur raspuns, ghidul trece singur la pasul urmator (false = doar cu butonul Next)
const AUTO_NEXT = true;
// helper DOM sigur (fara innerHTML pe date venite de la utilizatori)
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = String(v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'required' || k === 'readOnly') n[k] = !!v;
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}
function svgEl(d, size = 18) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', String(size));
  s.setAttribute('height', String(size));
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.6');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  for (const [i, p] of d.split(' M').entries()) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', (i ? 'M' : '') + p);
    s.appendChild(path);
  }
  return s;
}
// cele 7 feluri de upload; staff = doar profesorii si adminul (acolo se inlocuieste un text care exista deja)
const TYPES = [
  { id: 'media', name: 'Photos & videos', hint: 'Add photos or clips to the Gallery, or to a place on the Journey map.' },
  { id: 'story', name: 'Journal story', hint: 'Write about an activity or a day, with an optional cover photo.' },
  { id: 'material', name: 'Learning material', hint: 'Share a presentation, worksheet or project in Journey → Materials.' },
  { id: 'result', name: 'Evaluation & results', hint: 'Add feedback, conclusions or a report in Journey → Results.' },
  { id: 'link', name: 'Dissemination', hint: 'Link to a post, article or school page that shares the project.' },
  { id: 'info', name: 'Mobility info', hint: 'Update the programme, cover photo or overview of a mobility.', staff: true },
  { id: 'places', name: 'Days & places', hint: 'Add or update a day in the itinerary or a place on the map.', staff: true },
];

const MSG = {
  wrong_key: 'That key is not right. Check it and try again.', too_many_tries: 'Too many tries. Wait 15 minutes, then try again.',
  not_configured: 'Upload is not switched on yet. Ask the website team.', signed_out: 'This device was signed out or the session expired. Enter your key again.',
  file_too_big: 'This file is too big.', file_type: 'This kind of file cannot be uploaded here.', daily_limit: 'This device reached the upload limit for today.',
  storage_full: 'The website storage limit is reached. Ask the admin to free space.', key_quota: 'This key reached its storage quota.',
  key_expired: 'This key has expired. Ask your teacher or admin for a new one.', key_locked: 'This key is locked for new devices.',
  device_limit: 'This key reached the maximum number of devices.',
  too_many_uploads: 'Too many unfinished large uploads. Wait a moment and try again.',
  upload_failed: 'The upload was interrupted. Try again.',
  not_allowed: 'Your key does not allow this.', missing_field: 'Something is missing. Check the fields above.', bad_link: 'The link has to start with https://',
  key_taken: 'This key already exists. Choose another one.', key_too_short: 'A key needs at least 8 characters.', not_found: 'It is no longer there.',
  offline: 'No connection to the server. Check the internet and try again.',
};
const say = code => MSG[code] || 'Something went wrong. Try again.';
const size = n => {
  if (!n) return '0 KB';
  if (n >= 1024 * MB) return (n / (1024 * MB)).toFixed(2) + ' GB';
  return n >= MB ? (n / MB).toFixed(n >= 10 * MB ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
};
const shortDate = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const extOf = name => (/\.([a-z0-9]{2,5})$/i.exec(name) || [])[1]?.toLowerCase() || '';
const kindOf = file => (EXT.doc.includes(extOf(file.name)) ? 'doc' : file.type.startsWith('image/') || EXT.image.includes(extOf(file.name)) ? 'image' : file.type.startsWith('video/') || EXT.video.includes(extOf(file.name)) ? 'video' : '');
const real = t => (t && !/^\s*\[/.test(t) ? t : '');   // textele inca necompletate din data.js ([ ... ]) nu se pun in campuri

/* ---------- sesiunea si serverul ---------- */
let session = null;
try { session = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
if (!session?.token) session = null;
const isStaff = () => session && (session.me.role === 'admin' || session.me.role === 'teacher');
function forget() { session = null; try { localStorage.removeItem(STORE); } catch (e) {} }
async function api(method, path, { json, body } = {}) {
  if (DEMO) return demo(method, path, { json, body });
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
// un fisier ajunge pe server, care il pune unde ii e locul: pozele in Cloudflare Images, video-urile in Cloudflare Stream,
// restul in R2 (stored tine minte unde a ajuns fiecare). Cele mari urca in bucati, cu trei incercari pentru fiecare bucata.
// dur = durata unui video, in secunde (daca browserul a putut-o citi): serverul tine cu ea socoteala minutelor din Stream.
const stored = new Map();
// Daca un video mare nu poate fi dus in Stream, urca din nou, de data asta in R2 (r2 = true), ca sa nu se piarda.
async function send(blob, name, onBytes = () => {}, dur = 0, r2 = false) {
  const q = `?name=${encodeURIComponent(name)}&size=${blob.size}${dur > 0 ? `&dur=${Math.round(dur * 10) / 10}` : ''}${r2 ? '&r2=1' : ''}`;
  if (DEMO) { const r = await demo('POST', '/files' + q, { body: blob }); stored.set(r.key, 'r2'); onBytes(blob.size); return r.key; }
  if (blob.size <= 20 * MB) { const r = await api('POST', '/files' + q, { body: blob }); stored.set(r.key, r.store || 'r2'); onBytes(blob.size); return r.key; }
  const up = await api('POST', '/files/parts' + q), parts = [];
  stored.set(up.key, up.store || 'r2');
  let done = 0;
  try {
    for (let n = 1, at = 0; at < blob.size; n++, at += up.partSize) {
      const chunk = blob.slice(at, at + up.partSize);
      for (let attempt = 1; ; attempt++) {
        try { parts.push(await api('PUT', `/files/parts?key=${encodeURIComponent(up.key)}&n=${n}`, { body: chunk })); break; }
        catch (e) { if (attempt >= 3 || signal.aborted || e.message === 'upload_failed') throw e; await new Promise(res => setTimeout(res, 1500 * attempt)); }
      }
      onBytes(chunk.size); done += chunk.size;
    }
    await api('POST', `/files/parts/done?key=${encodeURIComponent(up.key)}`, { json: { parts } });
  } catch (e) {
    api('DELETE', `/files/parts?key=${encodeURIComponent(up.key)}`).catch(() => {});
    if (e.message === 'upload_failed' && !r2 && !signal.aborted) { onBytes(-done); return send(blob, name, onBytes, dur, true); }
    throw e;
  }
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
// pozele HEIC/HEIF (iPhone) nu pot fi citite de Chrome, Edge sau Firefox: se transforma aici, in browser, in JPG.
// Biblioteca e mare (3 MB), asa ca se incarca doar cand chiar e nevoie de ea.
let heicLib = null;
const loadHeic = () => heicLib || (heicLib = new Promise((res, rej) => {
  if (window.HeicTo) return res(window.HeicTo);
  const sc = document.createElement('script');
  sc.src = HEIC_SRC; sc.onload = () => (window.HeicTo ? res(window.HeicTo) : rej(new Error('unreadable')));
  sc.onerror = () => { heicLib = null; rej(new Error('unreadable')); };
  document.head.appendChild(sc);
}));
async function heicToJpeg(file) {
  const HeicTo = await loadHeic();
  if (!(await HeicTo.isHeic(file))) throw new Error('unreadable');
  return HeicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });
}
async function readBitmap(file) {
  try { const b = await createImageBitmap(file, { imageOrientation: 'from-image' }); return { el: b, w: b.width, h: b.height }; } catch (e) {}
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    return { el: img, w: img.naturalWidth, h: img.naturalHeight };
  } catch (e) { throw new Error('unreadable'); } finally { setTimeout(() => URL.revokeObjectURL(url), 30000); }
}
async function readImage(file) {
  try { return await readBitmap(file); } catch (e) {}
  let jpg;
  try { jpg = await heicToJpeg(file); } catch (e) { throw new Error('unreadable'); }
  return readBitmap(jpg);
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
    v.onseeked = () => draw(v, v.videoWidth, v.videoHeight, PHOTO.thumb, PHOTO.thumbQ).then(d => done({ ...d, vw: v.videoWidth, vh: v.videoHeight, dur: isFinite(v.duration) ? v.duration : 0 }), () => done(null));
    v.onerror = () => done(null);
  });
}


/* ---------- modul DEMO: upload.html?demo ----------
   Merge fara server (si cu dublu click pe fisier, si cu porneste-site.bat). Nimic nu ajunge pe site:
   totul sta in memoria paginii si dispare la refresh. E doar ca sa vezi cum arata si cum merge formularul.
   Cheia decide rolul: una care contine "admin" = admin, "prof" = profesor, orice altceva = elev. */
const DEMO_URL = {};   // cheie de fisier -> adresa din browser (blob:) a fisierului ales
const mediaSrc = k => (k ? DEMO_URL[k] || '/media/' + k : '');
const demo = DEMO && (() => {
  const img = 'assets/img/fundal-blur.jpg', now = Date.now(), H = 3600e3;
  ['image/demo-1.webp', 'image/demo-2.webp', 'image/demo-3.webp', 'image/demo-4.webp'].forEach(k => { DEMO_URL[k] = img; });
  let n = 0;
  const id = () => (Date.now().toString(16) + (n++).toString(16).padStart(4, '0')).slice(-16).padStart(16, 'a');
  const items = [
    { id: id(), type: 'media', mob: 'ro', t: now - 2 * H, kind: 'photo', key: 'image/demo-1.webp', thumb: 'image/demo-1.webp', caption: 'Guided tour in English', stop: 'ro-prejmer', place: '', gallery: true, map: true, group: 'g1', own: true },
    { id: id(), type: 'media', mob: 'ro', t: now - 2 * H, kind: 'photo', key: 'image/demo-2.webp', thumb: 'image/demo-2.webp', caption: 'Guided tour in English', stop: 'ro-prejmer', place: '', gallery: true, map: true, group: 'g1', own: true },
    { id: id(), type: 'media', mob: 'ro', t: now - 2 * H, kind: 'photo', key: 'image/demo-3.webp', thumb: 'image/demo-3.webp', caption: 'The walls from inside', stop: 'ro-prejmer', place: '', gallery: true, map: true, group: 'g1', own: true },
    { id: id(), type: 'story', mob: 'ro', t: now - 26 * H, day: 0, title: 'Welcome to Honterus', excerpt: '', body: 'This is a demo story. In the real site the text written here shows on the Journal card and in the article.', author: '', photos: [{ key: 'image/demo-4.webp', thumb: 'image/demo-4.webp', caption: '' }], own: true },
    { id: id(), type: 'material', mob: 'ro', t: now - 50 * H, cat: 'c', slot: 'Worksheet: Prejmer Fortified Church', title: '', by: 'Romanian students', key: 'doc/demo-worksheet.docx', own: true },
    { id: id(), type: 'link', mob: 'ro', t: now - 70 * H, where: 0, title: 'Our school wrote about the mobility', url: 'https://erasmus-rofrdk.com/journal.html', own: true },
    { id: id(), type: 'material', mob: 'ro', t: now - 3 * H, cat: 'b', slot: 'Catherine\'s Gate (Poarta Ecaterinei)', title: '', by: 'Romanian students', key: 'doc/demo-gate.pptx', own: false, uploader: 'Demo teacher · Teachers' },
    { id: id(), type: 'info', mob: 'ro', t: now - 90 * H, part: 'programme', key: 'doc/demo-programme.pdf', own: false, uploader: 'Admin' },
  ];
  const trash = [];
  let me = null;
  const ok = data => Promise.resolve(JSON.parse(JSON.stringify(data)));
  const fail = code => Promise.reject(new Error(code));
  return async (method, path, { json, body } = {}) => {
    await new Promise(r => setTimeout(r, 120));
    const p = path.split('?')[0], q = new URLSearchParams(path.split('?')[1] || '');
    if (p === '/login') {
      const k = (json.key || '').toLowerCase();
      me = { id: 'demo-device', role: k.includes('admin') ? 'admin' : k.includes('prof') ? 'teacher' : 'student', name: json.name, label: k.includes('admin') ? 'Admin' : 'Demo key' };
      return ok({ token: 'demo-' + me.role, me });
    }
    if (!me && session) me = session.me;
    if (p === '/me') return ok({ me });
    if (p === '/logout') return ok({ ok: true });
    const staffNow = me && me.role !== 'student';
    if (p === '/mine') {
      const list = items.filter(x => staffNow || x.own).sort((a, b) => b.t - a.t);
      return ok(me.role === 'admin' ? { items: list, trash, storage: { usedBytes: 42 * MB, maxBytes: 8500 * MB } } : { items: list });
    }
    if (p === '/files' || p === '/files/parts/done') {
      const name = q.get('name') || 'file', e = extOf(name), cls = EXT.video.includes(e) ? 'video' : EXT.doc.includes(e) ? 'doc' : 'image';
      const key = `${cls}/demo-${id()}.${e}`;
      if (body instanceof Blob) DEMO_URL[key] = URL.createObjectURL(body);
      return ok({ key });
    }
    if (p === '/files/parts') return ok({ key: 'video/demo-big', partSize: 20 * MB });
    if (p === '/items' && method === 'POST') {
      const it = { id: id(), type: json.type, mob: json.mob, t: Date.now(), ...json.data, own: true, uploader: 'You' };
      if (['info', 'day', 'stop'].includes(it.type)) {   // ca pe server: unul singur pe mobilitate, cel vechi trece in Trash
        const same = x => x.type === it.type && x.mob === it.mob && (it.type === 'info' ? x.part === it.part : it.type === 'day' ? x.i === it.i : x.id === it.id);
        items.filter(same).forEach(x => { items.splice(items.indexOf(x), 1); trash.unshift({ ...x, deletedAt: Date.now() }); });
      }
      items.unshift(it); return ok(it);
    }
    const m = /^\/items\/([^/]+)(\/restore)?$/.exec(p);
    if (m) {
      if (m[2]) {
        if (me.role !== 'admin') return fail('not_allowed');
        const i = trash.findIndex(x => x.id === m[1]); if (i < 0) return fail('not_found');
        items.unshift(trash.splice(i, 1)[0]); return ok({ ok: true });
      }
      if (method === 'DELETE' && q.get('permanent') === '1') { const i = trash.findIndex(x => x.id === m[1]); if (i >= 0) trash.splice(i, 1); return ok({ ok: true }); }
      const i = items.findIndex(x => x.id === m[1]); if (i < 0) return fail('not_found');
      if (method === 'DELETE') { trash.unshift({ ...items.splice(i, 1)[0], deletedAt: Date.now() }); return ok({ ok: true }); }
      if (method === 'PUT') {
        const old = items[i];
        const keep = ['key', 'thumb', 'kind', 'w', 'h', 'photos', 'part', 'i'].reduce((o, k) => (k in old ? { ...o, [k]: old[k] } : o), {});
        if (old.type === 'story' && Array.isArray(json.data.photos)) keep.photos = old.photos.map((ph, j) => ({ ...ph, caption: json.data.photos[j]?.caption ?? ph.caption }));
        items[i] = { ...old, ...json.data, ...keep, mob: ['info', 'day', 'stop'].includes(old.type) ? old.mob : json.mob || old.mob };
        return ok(items[i]);
      }
    }
    if (p === '/admin/keys') return method === 'GET' ? ok({ keys: [] }) : ok({ key: 'DEMO-1234-5678', label: json.label });
    return fail('not_configured');
  };
})();


/* ---------- starea formularului (ghidul pas cu pas) ----------
   Raspunsurile stau in st. Cat timp pagina e deschisa, raman si daca te intorci la lista (draft); refresh-ul le sterge. */
const blank = () => ({ type: null, mob: null,
  place: null, customPlace: '', inGallery: false, inMap: false, caption: '', caps: {},
  day: null, dayFrom: 0, dayTo: 1, title: '', excerpt: '', body: '', showAuthor: false,
  cat: null, mat: null, matTitle: '', by: {},
  sec: null, resText: '', where: null, linkTitle: '', url: '',
  info: null, infoText: '',
  dp: null, which: null, dDay: '', dDate: '', dTitle: '', dText: '', sTitle: '', sWhen: '', sText: '', sLoc: '',
  files: { media: [], story: [], doc: [], res: [], info: [] } });
let st = blank();
// view: login | list | wizard (ghidul, pentru ceva nou) | edit (ecranul de editare) | busy | done. mode: new | edit
const ui = { view: 'list', mode: 'new', step: 0, error: '', busy: null, done: null, pvTab: 'gallery', q: '', draft: false, edit: null };
const mob = () => S.mob(st.mob) || S.mobilities[0];
const slots = () => mob().materials.filter(x => x.cat === st.cat && !x.file && real(x.title)).map(x => x.title);
const onMap = () => !!st.place && !['custom', 'none'].includes(st.place);
const townOf = (s, m) => s.town || m.city;
// "45.64, 25.58" sau un link Google Maps (…/@45.64,25.58,… ori …!3d45.64!4d25.58…)
function coords(text) {
  const m = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(text) || /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(text) || /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(text) || /^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!m) return null;
  const lat = +m[1], lon = +m[2];
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const validUrl = u => /^https?:\/\/[^\s/]+\.[^\s]{2,}/.test((u || '').trim());
const fileName = k => (k || '').split('/').pop().replace(/^[a-z0-9]{8,}-/i, '');
// adresa unui fisier ales sau deja publicat, pentru miniaturi si preview
function fileUrl(f) {
  if (f.current) return mediaSrc(f.thumb || f.key);
  if (!f.url) { f.url = URL.createObjectURL(f.file); signal.addEventListener('abort', () => URL.revokeObjectURL(f.url)); }
  return f.url;
}
const fKind = f => (f.current ? (f.kind === 'video' || (f.key || '').startsWith('video/') ? 'video' : (f.key || '').startsWith('doc/') ? 'doc' : 'image') : kindOf(f.file));
const fName = f => (f.current ? fileName(f.key) : f.file.name);

/* ---------- pasii: se aleg dupa ce ai raspuns pana acum ---------- */
function steps() {
  const t = st.type, out = ['type', 'mob'];
  if (t === 'media') { out.push('files', 'place'); if (onMap()) out.push('where'); out.push('caption'); }
  else if (t === 'story') out.push('story', 'day', 'photos', 'author');
  else if (t === 'material') out.push('cat', 'mat', 'by', 'doc');
  else if (t === 'result') out.push('sec', 'resText', 'resFile');
  else if (t === 'link') out.push('linkWhere', 'link');
  else if (t === 'info') out.push('info', st.info === 'programme' || st.info === 'photo' ? 'infoFile' : 'infoText');
  else if (t === 'places') { out.push('dp', 'which', st.dp === 'place' ? 'placeFields' : 'dayFields'); if (st.dp === 'place') out.push('loc'); }
  if (t) out.push('preview');
  return out;
}
const optional = id => ['caption', 'photos', 'by', 'resFile'].includes(id) || (id === 'loc' && st.which !== 'new');
function canNext(id) {
  const tr = v => !!String(v || '').trim();
  switch (id) {
    case 'type': return !!st.type;
    case 'mob': return !!st.mob;
    case 'files': return st.files.media.length > 0;
    case 'place': return !!st.place && (st.place !== 'custom' || tr(st.customPlace));
    case 'where': return st.inGallery || st.inMap;
    case 'story': return tr(st.title) && tr(st.body);
    case 'day': return st.day !== null && (st.day !== -1 || st.dayTo > st.dayFrom);
    case 'cat': return !!st.cat;
    case 'mat': return st.mat !== null && (st.mat !== 'new' || tr(st.matTitle));
    case 'doc': return st.files.doc.length > 0;
    case 'sec': return st.sec !== null;
    case 'resText': return tr(st.resText);
    case 'linkWhere': return st.where !== null;
    case 'link': return tr(st.linkTitle) && validUrl(st.url);
    case 'info': return !!st.info;
    case 'infoFile': return st.files.info.length > 0;
    case 'infoText': return tr(st.infoText);
    case 'dp': return !!st.dp;
    case 'which': return st.which !== null;
    case 'dayFields': return tr(st.dDay) && tr(st.dTitle);
    case 'placeFields': return tr(st.sTitle);
    case 'loc': return st.which === 'new' ? !!coords(st.sLoc) : (!tr(st.sLoc) || !!coords(st.sLoc));
    default: return true;
  }
}
// ce sterge SKIP la un pas optional
const SKIP = { caption: { caption: '' }, author: { showAuthor: false }, by: { by: {} }, loc: { sLoc: '' } };

/* ---------- bucati de formular ---------- */
const input = (name, label, ph, { type = 'text', help = '', max = 160, opt = false } = {}) =>
  `<div class="up-field"><label class="up-label" for="up-${name}">${label}${opt ? ' <small>(optional)</small>' : ''}</label><input class="up-input" id="up-${name}" type="${type}" data-f="${name}" maxlength="${max}" placeholder="${esc(ph)}" value="${esc(st[name])}" autocomplete="off"><p class="up-help" data-help="${name}">${help}</p></div>`;
const area = (name, label, ph, rows, max, { help = '', opt = false } = {}) =>
  `<div class="up-field"><label class="up-label" for="up-${name}">${label}${opt ? ' <small>(optional)</small>' : ''}${max <= 600 ? `<span class="up-cnt" data-cnt="${name}" data-max="${max}" aria-hidden="true">${String(st[name] || '').length} / ${max}</span>` : ''}</label><textarea class="up-input up-area" id="up-${name}" data-f="${name}" rows="${rows}" maxlength="${max}" placeholder="${esc(ph)}">${esc(st[name])}</textarea>${help ? `<p class="up-help">${help}</p>` : ''}</div>`;
const tick = `<span class="up-tick" aria-hidden="true">${svg(ICON.check, 14)}</span>`;
// carduri de ales (un singur raspuns): options = [valoare, titlu, text mic, iconita (nume din ICON sau HTML), clasa in plus]
function cards(name, options, label, cls = '') {
  return `<div class="up-opts ${cls}" role="group" aria-label="${esc(label)}">${options.map(([v, t, sub, ico, extra]) =>
    `<button type="button" class="up-opt${extra ? ' ' + extra : ''}" data-set="${name}" data-v="${esc(v)}" aria-pressed="${String(st[name]) === String(v)}">
      <span class="up-opt-ic" aria-hidden="true">${ico && ico[0] === '<' ? ico : svg(ICON[ico] || ICON.story, 26)}</span>
      <span class="up-opt-t"><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${tick}</button>`).join('')}</div>`;
}
// zilele unei mobilitati, ca foi de calendar; last = cardul de la final ("mai multe zile" sau "zi noua")
function dayCards(name, m, last) {
  const split = d => { const x = /^(\d{1,2})\s+(.+)$/.exec(real(d.date)); return x ? [x[1], x[2]] : ['', '']; };
  return `<div class="up-opts up-days" role="group" aria-label="Day">${m.days.map((d, i) => {
    const [num, month] = split(d);
    return `<button type="button" class="up-opt up-day" data-set="${name}" data-v="${i}" aria-pressed="${String(st[name]) === String(i)}">
      <span class="up-day-top">${esc(real(d.day) || 'Day ' + (i + 1))}</span><span class="up-day-n" aria-hidden="true">${esc(num || String(i + 1))}</span><span class="up-day-m">${esc(num ? month : real(d.date))}</span>
      <span class="up-opt-t"><b>${esc(real(d.title))}</b></span>${tick}</button>`;
  }).join('')}<button type="button" class="up-opt up-day up-opt--new" data-set="${name}" data-v="${esc(last[0])}" aria-pressed="${String(st[name]) === String(last[0])}">
      <span class="up-day-top">${esc(last[3])}</span><span class="up-day-ico" aria-hidden="true">${svg(ICON[last[4]], 44)}</span>
      <span class="up-opt-t"><b>${esc(last[1])}</b>${last[2] ? `<small>${esc(last[2])}</small>` : ''}</span>${tick}</button></div>`;
}
const byCards = () => `<div class="up-opts up-opts--4" role="group" aria-label="Made by">${MADE_BY.map((n, i) =>
  `<button type="button" class="up-opt up-opt--v" data-by="${i}" aria-pressed="${!!st.by[i]}"><span class="up-opt-ic${BY_FLAG[i] ? ' is-flag' : ''}" aria-hidden="true"${BY_FLAG[i] ? ` style="background:${flag(BY_FLAG[i])}"` : ''}>${BY_FLAG[i] ? '' : svg(ICON.cap, 26)}</span>
    <span class="up-opt-t"><b>${esc(n)}</b></span>${tick}</button>`).join('')}</div>`;
const initials = name => String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const findBox = (ph, label) => `<div class="up-search">${svg('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4', 18)}
      <input class="up-input" id="up-find" type="search" data-q="1" placeholder="${esc(ph)}" value="${esc(ui.q)}" aria-label="${esc(label)}" autocomplete="off"></div>`;
// ce fel de fisiere primeste fiecare loc de fisiere (etichetele colorate de sub titlu)
const KINDS = { photos: [['JPG'], ['PNG'], ['HEIC'], ['MP4', '#6E9BFF'], ['MOV', '#6E9BFF']], image: [['JPG'], ['PNG'], ['HEIC']], doc: [['PDF', '#E0574F'], ['PowerPoint', '#E2733F'], ['Word', '#5B8DEF'], ['Excel', '#2E9E5B'], ['Photo'], ['Video', '#6E9BFF'], ['Sound'], ['ZIP']], pdf: [['PDF', '#E0574F']] };
const ACCEPT = { photos: 'image/*,video/mp4,video/quicktime,video/webm,.mov,.m4v', image: 'image/*', doc: EXT.doc.map(x => '.' + x).join(',') + ',image/*,video/mp4,video/quicktime,video/webm,.mov,.m4v', pdf: '.pdf' };
function drop(slot, title, sub, accept, multiple) {
  const list = st.files[slot], locked = ui.mode !== 'new' && list.some(f => f.current);
  const grid = slot === 'media' || slot === 'story';   // pozele si clipurile: grila de miniaturi; documentele: un rand cu foaia lor
  const kinds = KINDS[Object.keys(ACCEPT).find(k => ACCEPT[k] === accept)] || [];
  const zoomBtn = (f, cls) => `<button type="button" class="${cls} th-btn" data-zoom="${slot}:${list.indexOf(f)}" aria-label="View ${esc(fName(f))} full screen">`;
  const pic = f => {
    const k = fKind(f);
    if (k === 'image') return `<span class="media"><img src="${esc(fileUrl(f))}" alt=""></span>`;
    return `<span class="media">${f.current && !f.thumb ? '' : f.current ? `<img src="${esc(fileUrl(f))}" alt="">` : `<video src="${esc(fileUrl(f))}" muted playsinline preload="metadata"></video>`}<span class="play-badge">${I.play}</span></span>`;
  };
  const thumb = f => (fKind(f) === 'doc' ? `<span class="th th-s">${docThumb(fName(f))}</span>` : `${zoomBtn(f, 'th th-s')}${pic(f)}</button>`);
  const rm = (f, i) => (f.current ? '' : `<button type="button" class="up-x" data-rm="${slot}:${i}" aria-label="Remove ${esc(f.file.name)}">${I.x}</button>`);
  const total = list.reduce((n, f) => n + (f.current ? 0 : f.file.size), 0);
  const files = !list.length ? '' : grid
    ? `<div class="up-fhead"><b>${list.length} ${list.length === 1 ? 'file' : 'files'}</b>${total ? `<span class="small">${size(total)}</span>` : ''}</div>
      <ul class="up-fgrid">${list.map((f, i) => `<li>${zoomBtn(f, 'up-ftile')}${pic(f)}</button>${rm(f, i)}
        ${slot === 'story' && i === 0 ? '<span class="tag y up-fcover">Cover</span>' : ''}
        <span class="up-file-n"><b>${esc(fName(f))}</b><small>${f.current ? 'On the site' : size(f.file.size)}</small></span>
        ${slot === 'story' && i > 0 && !f.current ? `<button type="button" class="btn glass up-sm" data-cover="${i}" aria-label="Set ${esc(fName(f))} as cover">Set as cover</button>` : ''}</li>`).join('')}</ul>`
    : `<ul class="up-files">${list.map((f, i) => `<li>${thumb(f)}<span class="up-file-n"><b>${esc(fName(f))}</b><small>${f.current ? 'Current file' : size(f.file.size)}</small></span>${rm(f, i)}</li>`).join('')}</ul>`;
  return `<div class="up-drop${locked ? ' is-locked' : ''}${list.length ? ' has-files' : ''}" data-drop="${locked ? '' : slot}">
    <span class="up-drop-art" aria-hidden="true">${art(ART.drop)}</span>
    <div class="up-drop-in"><p class="up-drop-t">${locked ? 'These files are already on the site' : list.length && multiple ? 'Add more files' : title}</p>
    ${locked ? '' : `<div class="up-kinds" aria-hidden="true">${kinds.map(([k, c]) => `<span class="up-kind"${c ? ` style="--c:${c}"` : ''}>${k}</span>`).join('')}</div>`}
    <p class="up-help">${locked ? 'Changing a published file is not possible yet. You can change everything else.' : sub}</p></div>
    ${locked ? '' : `<button type="button" class="btn ${list.length ? 'glass' : 'btn--solid'} up-pick">${svg(ICON.up, 18)}${list.length ? (multiple ? 'Add more' : 'Choose another file') : `Choose ${multiple ? 'files' : 'a file'}`}</button>
    <input type="file" class="sr" tabindex="-1" data-file="${slot}" accept="${accept}"${multiple ? ' multiple' : ''} aria-label="${esc(title)}">`}
  </div>${files}`;
}
// o foaie colorata dupa tipul fisierului (PowerPoint, Word, PDF)
const DOC = { pptx: ['#C4471F', 'P'], ppt: ['#C4471F', 'P'], ppsx: ['#C4471F', 'P'], pps: ['#C4471F', 'P'], docx: ['#2B5BB0', 'W'], doc: ['#2B5BB0', 'W'], xlsx: ['#1E7A45', 'X'], xls: ['#1E7A45', 'X'], pdf: ['#C8302A', 'PDF'] };
function docThumb(name) {
  const e = extOf(name), [c, l] = DOC[e] || ['#4A5A8A', (e || '?').slice(0, 1).toUpperCase()];
  return `<span class="doc" style="--c:${c}"><span class="doc-l">${esc(l)}</span>${l.length > 1 ? '' : `<span class="doc-e">${esc(e.toUpperCase())}</span>`}</span>`;
}
const flag = id => ({ ro: 'linear-gradient(90deg,#002B7F 0 33.4%,#FCD116 33.4% 66.7%,#CE1126 66.7%)', fr: 'linear-gradient(90deg,#002654 0 33.4%,#FFFFFF 33.4% 66.7%,#CE1126 66.7%)',
  dk: 'linear-gradient(90deg,transparent 0 30%,#FFFFFF 30% 42%,transparent 42%),linear-gradient(180deg,#C8102E 0 42%,#FFFFFF 42% 58%,#C8102E 58%)' }[id] || 'none');

// locurile unei mobilitati, ca niste carduri cu poza, grupate pe orase, cu cautare
function placeCards(name, extras) {
  const m = mob(), q = norm(ui.q);
  const all = m.stops.map((s, i) => ({ s, n: i + 1 })).filter(({ s }) => real(s.title) || s.id === st[name]);
  const hits = all.filter(({ s }) => !q || norm(`${s.title} ${townOf(s, m)} ${s.when}`).includes(q));
  const towns = [...new Set(hits.map(({ s }) => townOf(s, m)))];
  const card = (v, n, title, sub, bg) => `<button type="button" class="pcard" data-set="${name}" data-v="${esc(v)}" aria-pressed="${String(st[name]) === String(v)}">
      ${bg}<span class="pc-shade" aria-hidden="true"></span><span class="pc-n">${n}</span>
      <span class="pc-txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
  const photo = s => {
    const p = s.media.find(x => x.type === 'photo' && x.src);
    return p ? `<span class="pc-bg media"><img src="${esc(p.thumb || p.src)}" alt="" loading="lazy"></span>` : U.tile({ type: 'photo', caption: s.title, stop: s.id, place: '' }, 'pc-bg');
  };
  return `${findBox('Search a place or a town', 'Search places')}
    ${towns.map(t => {
      const list = hits.filter(({ s }) => townOf(s, m) === t);
      return `<section class="up-town"><div class="grp-h"><h3 class="grp-t">${esc(t)}</h3><span class="small">${list.length} ${list.length === 1 ? 'place' : 'places'}${list.length > 1 ? ' · scroll →' : ''}</span></div>
        <div class="h-scroll" role="group" aria-label="${esc(t)}">${list.map(({ s, n }) => card(s.id, n, s.title, s.when, photo(s))).join('')}</div></section>`;
    }).join('')}
    ${q && !hits.length ? `<p class="up-help">No place on the map matches “${esc(ui.q)}”.</p>` : ''}
    <section class="up-town"><div class="grp-h"><h3 class="grp-t">Other</h3></div>
      <div class="h-scroll" role="group" aria-label="Other">${extras.map(([v, title, sub, ico]) => card(v, '+', title, sub, `<span class="pc-bg pc-other">${svg(ico, 54)}</span>`)).join('')}</div></section>`;
}
// cele doua destinatii ale pozelor, cu o mica Galerie si o mica harta in spate
function destCards() {
  const m = mob(), s = m.stops.find(x => x.id === st.place), n = m.stops.indexOf(s) + 1;
  const gal = `<span class="pc-bg gal-mini" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => U.tile({ type: i === 5 ? 'video' : 'photo', caption: 'g' + i, stop: 'mini', place: '' }, i === 0 ? 'g1' : i === 3 ? 'g2' : '')).join('')}</span>`;
  const map = `<span class="pc-bg map-mini" aria-hidden="true"><svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">
      <path d="M0 52H400M0 104H400M0 156H400M0 208H400M80 0V260M160 0V260M240 0V260M320 0V260" stroke="rgba(255,255,255,.07)"/>
      <path d="M-10 190C60 150 90 170 140 120S230 60 290 80 380 40 420 30V-10H-10Z" fill="rgba(110,155,255,.10)" stroke="rgba(150,180,255,.45)" stroke-width="1.2"/>
      <path d="M60 170L130 128 205 96 280 112 340 70" fill="none" stroke="rgba(255,204,0,.22)" stroke-width="8"/>
      <path d="M60 170L130 128 205 96 280 112 340 70" fill="none" stroke="#FFCC00" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>
      ${[[60, 170], [130, 128], [280, 112], [340, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="rgba(16,32,74,.9)" stroke="rgba(255,255,255,.78)" stroke-width="1.5"/>`).join('')}
      <circle cx="205" cy="96" r="25" fill="rgba(255,204,0,.18)"/><circle cx="205" cy="96" r="17" fill="#FFCC00" stroke="#fff" stroke-width="2"/>
      <text x="205" y="102" text-anchor="middle" font-family="Big Shoulders Display,Impact,sans-serif" font-weight="800" font-size="17" fill="#10204A">${n}</text></svg></span>`;
  const card = (name, kicker, title, text, bg) => `<button type="button" class="pcard dcard" data-tog="${name}" aria-pressed="${!!st[name]}">${bg}<span class="pc-shade" aria-hidden="true"></span>
      <span class="pc-txt"><span class="eyebrow">${kicker}</span><b>${title}</b><small>${text}</small></span></button>`;
  return `<div class="dest-grid" role="group" aria-label="Where should they appear">
    ${card('inGallery', 'Gallery page', 'Gallery', 'With all the photos and videos of the project, in the big grid. Visitors can filter by mobility.', gal)}
    ${card('inMap', 'Journey page · Daily activities', 'Journey', `On the map, at ${esc(s ? s.title : '')}. Visitors see them when they open this place.`, map)}</div>`;
}

/* ---------- fiecare pas: intrebarea, textul mic si ce se alege ---------- */
function stepHTML(id) {
  const m = mob(), adv = false;   // editarea nu mai trece prin ghid (are ecranul ei, vezi editHTML)
  switch (id) {
    case 'type': {
      const types = TYPES.filter(t => !t.staff || isStaff() || (adv && t.id === st.type));
      return ['What are you uploading?', adv ? 'This is what you published. The type stays the same, everything after it can change.' : 'Pick one. A few short questions follow, then you see a preview.',
        `<div class="up-tiles" role="group" aria-label="Kind of upload">${types.map(t => {
          const off = adv && t.id !== st.type;
          return `<button type="button" class="up-tile" data-set="type" data-v="${t.id}" aria-pressed="${st.type === t.id}"${off ? ' disabled' : ''}><span class="up-tile-art">${art(ART[t.id])}</span>${tick}<b>${esc(t.name)}</b><span>${esc(t.hint)}</span>${
            adv && t.id === st.type ? '<em class="tag y">Published type</em>' : t.staff ? '<em class="tag y">Teachers &amp; admins</em>' : ''}</button>`;
        }).join('')}</div>`];
    }
    case 'mob': {
      const lock = adv && ['info', 'places'].includes(st.type);
      return ['For which mobility?', lock ? 'This kind of upload stays with its mobility.' : '',
        `<div class="up-opts up-mobs" role="group" aria-label="Mobility">${S.mobilities.map(x => `<button type="button" class="up-opt up-mob" data-set="mob" data-v="${x.id}" aria-pressed="${st.mob === x.id}"${lock && st.mob !== x.id ? ' disabled' : ''}>
          <span class="up-mob-flag" style="background:${flag(x.id)}" aria-hidden="true"></span><span class="up-mob-n" aria-hidden="true">${esc(x.n)}</span>
          <span class="up-opt-t"><b>${esc(x.city)}</b><small>${esc(x.country)} · ${U.tx(x.date)}</small></span>${tick}</button>`).join('')}</div>`];
    }
    case 'files': return ['Which files do you want to add?', 'Choose one or more photos or clips. They stay together as one set.',
      drop('media', 'Drop photos and videos here', 'As many as you want at once. Videos up to 300 MB.', ACCEPT.photos, true)];
    case 'place': return ['Where were they taken?', `Places from the ${m.city} mobility, by town.`,
      placeCards('place', [['custom', 'Custom place', 'A place that is not on the map.', 'M12 21s6-5.4 6-10.2A6 6 0 0 0 6 10.8C6 15.6 12 21 12 21z M12 8v5 M9.5 10.5h5'], ['none', 'No specific place', 'They go to the Gallery only.', ICON.media]]) +
      (st.place === 'custom' ? input('customPlace', 'Name of the place', 'Where were the photos taken?', { max: 80, help: 'A custom place shows as a label in the Gallery. It does not appear on the map.' }) : '')];
    case 'where': return ['Where should they appear?', 'Pick one or both.', destCards()];
    case 'caption': return ['Add a caption?', 'One caption for the whole set. In the preview you can change the caption of each file.',
      input('caption', 'Caption', 'e.g. Guided tour in English', { max: 200 })];
    case 'story': return ['What\'s your story?', '',
      input('title', 'Title', 'Title of the story', { max: 120 }) +
      area('body', 'Story', 'Write the story here. Leave an empty line between paragraphs.', 10, 20000) +
      area('excerpt', 'Short summary', 'Two lines about the day', 2, 300, { opt: true, help: 'Shown on the Journal card. If you leave it empty, the card uses the start of your story.' })];
    case 'day': return ['Which day is it about?', 'This sets the label on the Journal card.',
      dayCards('day', m, [-1, 'More than one day', 'Pick the first and the last day', 'Several days', 'range']) +
      (st.day === -1 ? `<div class="up-range glass"><div class="up-field"><span class="up-label" id="lbl-dayFrom">From</span><div class="up-dd-slot" data-dds="dayFrom"></div></div>
        <span class="up-range-to" aria-hidden="true">${I.arrow}</span>
        <div class="up-field"><span class="up-label" id="lbl-dayTo">To</span><div class="up-dd-slot" data-dds="dayTo"></div></div></div>` : '')];
    case 'photos': return ['Add photos to your story?', 'One of them is the cover of the Journal card. Press “Set as cover” on the one you want.',
      drop('story', 'Drop the photos here', 'You can choose the cover after.', ACCEPT.image, true)];
    case 'author': return ['Show your name?', 'Your choice. The story is published either way.',
      `<button type="button" class="up-switch" data-tog="showAuthor" role="switch" aria-checked="${!!st.showAuthor}">
        <span class="up-ava" aria-hidden="true">${esc(initials(session.me.name))}</span>
        <span class="up-opt-t"><b>Show my name as the author</b><small>${st.showAuthor ? 'The card says: By ' + esc(session.me.name) : 'The card shows no name'}</small></span>
        <span class="up-sw" aria-hidden="true"><i></i></span></button>`];
    case 'cat': return ['Which category fits?', 'This decides where the material shows in Journey → Materials.',
      cards('cat', S.materialCats.map(c => [c.id, c.name, c.text, `${svg(ICON[CAT_ICON[c.id]] || ICON.material, 26)}<em>${esc(c.id.toUpperCase())}</em>`]), 'Category', 'up-opts--2')];
    case 'mat': {
      const names = slots(), q = norm(ui.q);
      const byOf = n => real((m.materials.find(x => x.cat === st.cat && x.title === n) || {}).by);
      const shown = names.map((n, i) => [i, n]).filter(([i, n]) => !q || norm(n).includes(q) || st.mat === i);
      return ['Which material is it?', names.length ? 'Pick the one your file belongs to, or add a new one.' : 'Nothing is waiting in this category. Add a new material.',
        (names.length > 6 ? findBox('Search a material', 'Search materials') : '') +
        (names.length ? `<div class="grp-h"><h3 class="grp-t">Waiting for a file</h3><span class="small">${q ? `${shown.length} of ${names.length}` : names.length}</span></div>` +
          cards('mat', shown.map(([i, n]) => [i, n, byOf(n), 'slot']), 'Materials waiting for a file', 'up-opts--list') : '') +
        cards('mat', [['new', 'Add a new material', 'It gets its own card', 'plus', 'up-opt--new']], 'New material', 'up-opts--list') +
        (st.mat === 'new' ? input('matTitle', 'Title', 'Title of the presentation or worksheet') : '')];
    }
    case 'by': return ['Who made it?', 'Pick everyone who worked on it.', byCards()];
    case 'doc': return ['Add the file', 'Photos, videos, sounds and PDFs show right on the page. PowerPoint, Word, Excel and zip are offered as a download.',
      drop('doc', 'Drop the file here', 'One file, up to 100 MB', ACCEPT.doc, false)];
    case 'sec': return ['Which part does it belong to?', 'Sections of Journey → Results. Every text stays on the page, one under another.', cards('sec', SECS.map((n, i) => [i, n, SEC_UI[i][1], SEC_UI[i][0]]), 'Part', 'up-opts--v')];
    case 'resText': return ['What would you like to share?', '', area('resText', SECS[st.sec] || 'Text', 'Write the text here', 8, 4000)];
    case 'resFile': return ['Attach a file?', 'For example a chart, a questionnaire or a report.',
      drop('res', 'Drop a file here', 'One file, up to 100 MB', ACCEPT.doc, false)];
    case 'linkWhere': return ['Where was it published?', '', cards('where', WHERE.map((n, i) => [i, n, WHERE_UI[i][1], WHERE_UI[i][0]]), 'Where', 'up-opts--v')];
    case 'link': return ['What are you linking to?', '',
      input('linkTitle', 'Title', 'Title of the article or post') +
      input('url', 'Link', 'https://', { type: 'url', max: 500, help: st.url && !validUrl(st.url) ? 'Paste the full link, starting with https://' : '' }) +
      `<div class="up-linkpv" data-linkpv aria-hidden="true">${linkPv()}</div>`];
    case 'info': return ['What are you updating?', 'What you publish here replaces what is on the page now.', cards('info', INFO.map(([v, n]) => [v, n, INFO_UI[v][1], INFO_UI[v][0]]), 'Part', 'up-opts--v')];
    case 'infoFile': return st.info === 'programme'
      ? ['Add the programme', '', drop('info', 'Drop the programme here', 'One file', ACCEPT.pdf, false)]
      : ['Add the cover photo', '', drop('info', 'Drop the photo here', 'One photo of the mobility', ACCEPT.image, false)];
    case 'infoText': return [st.info === 'goals' ? 'What are the goals?' : st.info === 'groups' ? 'Who is taking part?' : 'Describe the mobility', '',
      area('infoText', INFO.find(x => x[0] === st.info)?.[1] || 'Text', 'Write the text here', 7, 3000, { help: st.info === 'goals' ? 'Write one goal on each line.' : '' })];
    case 'dp': return ['What do you want to change?', 'What you publish here replaces what is on the page now.',
      cards('dp', [['day', 'A day', 'In the itinerary', 'cal'], ['place', 'A place on the map', 'A pin on the Journey map', 'places']], 'Day or place', 'up-opts--v up-opts--two')];
    case 'which': return st.dp === 'day'
      ? ['Which day?', '', dayCards('which', m, ['new', 'Add a new day', '', 'New', 'plus'])]
      : ['Which place?', '', placeCards('which', [['new', 'Add a new place', 'A new pin on the map.', 'M12 5v14 M5 12h14']])];
    case 'dayFields': return ['What happened that day?', '',
      `<div class="up-two">${input('dDay', 'Day', 'Monday', { max: 30 })}${input('dDate', 'Date', '16 November', { max: 40, opt: true })}</div>` +
      input('dTitle', 'Title', 'Welcome to Brașov', { max: 120 }) + area('dText', 'Short description', 'One or two sentences', 3, 600, { opt: true })];
    case 'placeFields': return ['What should people know about the place?', '',
      input('sTitle', 'Place name', 'Bran Castle', { max: 120 }) + input('sWhen', 'When', 'Thursday · 19 November', { max: 60, opt: true }) +
      area('sText', 'Short description', 'One or two sentences', 3, 600, { opt: true })];
    case 'loc': return ['Where is it on the map?', st.which === 'new' ? 'Needed for a new place.' : 'Leave it empty to keep the pin where it is.',
      input('sLoc', 'Coordinates or Google Maps link', 'Paste a Google Maps link, or 45.5149, 25.3672', { max: 600, help: locHelp() })];
    case 'preview': return ['Preview', st.type === 'media' ? 'This is how visitors see it. You can write a caption under each one.' : 'This is how visitors see it on the site. Go Back to change something.', previewHTML()];
  }
  return ['', '', ''];
}
// cardul mic de sub link: arata site-ul la care duce, cat timp scrii
function linkPv() {
  let host = ''; try { if (validUrl(st.url)) host = new URL(st.url.trim()).host.replace(/^www\./, ''); } catch (e) {}
  return `<span class="up-opt-ic">${svg(ICON[host ? 'globe' : 'link'], 22)}</span><span class="up-opt-t"><b>${esc(st.linkTitle.trim() || 'Your title')}</b><small>${esc(host || 'The site name shows here')}</small></span>${host ? `<span class="tag y">${esc(WHERE[st.where] || 'Link')}</span>` : ''}`;
}
const locHelp = () => (st.sLoc.trim() ? (coords(st.sLoc) ? `Found: ${coords(st.sLoc).lat.toFixed(4)}, ${coords(st.sLoc).lon.toFixed(4)}` : 'No coordinates found in this text yet.')
  : 'In Google Maps: right click on the place, click the two numbers to copy them, paste them here.');

// "Monday – Wednesday" si "16 – 18 November" pentru un articol care tine mai multe zile (la fel ca in cloud.js)
function rangeLabel(m) {
  const a = m.days[st.dayFrom], b = m.days[st.dayTo];
  if (!a || !b) return ['Story', ''];
  const da = real(a.date), db = real(b.date), [na, ma] = da.split(' '), [nb, mb] = db.split(' ');
  return [`${real(a.day) || 'Day ' + (st.dayFrom + 1)} – ${real(b.day) || 'Day ' + (st.dayTo + 1)}`, da && db ? (ma && ma === mb ? `${na} – ${db}` : `${da} – ${db}`) : ''];
}
// o poza sau un clip pe tot ecranul (vizualizatorul site-ului, cu sageti intre ele)
function zoomFiles(slot, i) {
  const list = st.files[slot].map((f, j) => [f, j]).filter(([f]) => ['image', 'video'].includes(fKind(f)));
  const items = list.map(([f, j]) => ({ type: fKind(f) === 'video' ? 'video' : 'photo', src: f.current ? mediaSrc(f.key) : fileUrl(f), thumb: f.current && f.thumb ? mediaSrc(f.thumb) : '',
    caption: (slot === 'media' ? capOf(j) : '') || fName(f) }));
  const at = list.findIndex(([, j]) => j === i);
  if (items.length) U.lightbox(items, Math.max(0, at));
}
/* ---------- preview: exact componentele de pe site, inainte de click ---------- */
const capOf = i => (st.caps[i] !== undefined ? st.caps[i] : st.caption);
function mediaTile(f, i, small) {
  const k = fKind(f), cap = capOf(i);
  const inner = k === 'video'
    ? (f.current ? (f.thumb ? `<img src="${esc(fileUrl(f))}" alt="">` : '') : `<video src="${esc(fileUrl(f))}" muted playsinline preload="metadata"></video>`) + `<span class="play-badge">${I.play}</span>`
    : `<img src="${esc(fileUrl(f))}" alt="">`;
  return `<figure class="pv-fig${small ? ' sm' : ''}"><button type="button" class="media pv-zoom" data-zoom="media:${i}" aria-label="View ${esc(fName(f))} full screen">${inner}</button>${small ? '' : ui.view === 'wizard'
    ? `<input class="pv-cap" data-cap="${i}" maxlength="200" value="${esc(cap)}" placeholder="Add a caption…" aria-label="Caption for ${esc(fName(f))}" autocomplete="off">`
    : `<figcaption class="${cap ? '' : 'none'}">${esc(cap || 'No caption')}</figcaption>`}</figure>`;
}
// bucatile preview-ului: unde apare (dest), taburile Gallery / Journey si cardul propriu-zis (body)
function pvParts() {
  const m = mob(), head = (page, title) => `<div class="pv-head"><div><span class="eyebrow">${page}</span><h3 class="h2">${esc(title)}</h3></div></div>`;
  let body = '', tabs = '', dest = '';
  if (st.type === 'media') {
    const both = onMap() && st.inGallery && st.inMap, showMap = onMap() && st.inMap && (!st.inGallery || ui.pvTab === 'journey');
    const files = st.files.media.map((f, i) => [f, i]).filter(([f]) => !ui.fileOnly || f.id === ui.fileOnly);
    dest = !onMap() ? 'Gallery' : both ? 'Gallery + Journey' : st.inMap ? 'Journey → Daily activities' : 'Gallery';
    if (both) tabs = `<div class="seg glass" role="tablist" aria-label="Preview">${[['gallery', 'Gallery'], ['journey', 'Journey']].map(([v, t]) => `<button type="button" role="tab" data-pvtab="${v}" aria-selected="${(ui.pvTab === 'journey') === (v === 'journey')}">${t}</button>`).join('')}</div>`;
    if (showMap) {
      const s = m.stops.find(x => x.id === st.place), vids = files.filter(([f]) => fKind(f) === 'video').length;
      body = head('Journey · ' + m.city, 'Daily activities') + `<article class="glass card stop on pv-stop">
        <div class="stop-head"><span class="stop-n">${m.stops.indexOf(s) + 1}</span><div><h3>${U.tx(s.title)}</h3><div class="when">${U.tx(s.when)}</div></div></div>
        <p>${U.tx(s.text)}</p><div class="stop-media">${files.slice(0, 6).map(([f, i]) => mediaTile(f, i, true)).join('')}</div>
        <div class="stop-foot"><span class="count">${files.length - vids} photos · ${vids} ${vids === 1 ? 'video' : 'videos'}</span></div></article>`;
    } else body = head('Gallery', m.city) + `<div class="gal pv-gal">${files.map(([f, i]) => mediaTile(f, i, false)).join('')}</div>`;
  } else if (st.type === 'story') {
    const d = st.day >= 0 ? m.days[st.day] : null, words = st.body.trim().split(/\s+/).filter(Boolean).length, [rDay, rDate] = rangeLabel(m);
    const cover = st.files.story[0];
    dest = 'Journal';
    body = head('Journal', 'Stories from ' + m.city) + `<div class="grid entries pv-entries"><article class="glass card entry pv-rel">
      ${cover ? `<button type="button" class="media pv-zoom" data-zoom="story:0" aria-label="View the cover full screen"><img src="${esc(fileUrl(cover))}" alt=""></button>` : U.tile({ type: 'photo', caption: st.title, stop: 'pv', place: m.city })}
      <div class="entry-in"><div class="entry-meta"><span class="tag b">${esc(d ? real(d.day) || 'Day ' + (st.day + 1) : rDay)}</span><span>${esc(d ? real(d.date) || '' : rDate)}${(d ? real(d.date) : rDate) ? ' · ' : ''}${esc(m.city)}</span></div>
      <h3>${esc(st.title)}</h3><p>${esc(st.excerpt.trim() || st.body.trim().slice(0, 180))}</p>
      <div class="byline">${st.showAuthor ? `By <b>${esc(session.me.name)}</b> · ` : ''}${Math.max(1, Math.round(words / 200))} min read</div></div>
      </article>
      <div class="glass card entry pv-ghost" aria-hidden="true">${U.tile({ type: 'photo', caption: 'older', stop: 'a', place: '' })}<div class="entry-in"><div class="entry-meta"><span class="tag">Older story</span></div></div></div></div>`;
  } else if (st.type === 'material') {
    const c = S.materialCats.find(x => x.id === st.cat), f = st.files.doc[0], title = st.mat === 'new' ? st.matTitle : slots()[st.mat] || '';
    const by = MADE_BY.filter((n, i) => st.by[i]).join(', ');
    dest = 'Journey → Materials';
    body = head('Journey · ' + m.city, 'Materials') + `<section class="mat-cat" style="margin-top:0"><div class="mat-head"><span class="mat-letter" aria-hidden="true">${c.id.toUpperCase()}</span><div><h3 class="h3">${esc(c.name)}</h3><p class="muted">${esc(c.text)}</p></div></div>
      <div class="grid mat-list"><div class="glass card mat pv-rel"><span class="tag b">${f ? esc(extOf(fName(f)).toUpperCase()) : 'File'}</span><b>${esc(title)}</b>${by ? `<span class="small">${esc(by)}</span>` : ''}<span class="link-arrow">Open ${I.ext}</span></div></div></section>`;
  } else if (st.type === 'result') {
    const f = st.files.res[0];
    dest = 'Journey → Results';
    body = head('Journey · ' + m.city, 'Results') + `<div class="grid hub-grid"><div class="glass card pv-rel"><h3 class="h3">${esc(SECS[st.sec])}</h3><div class="res-list"><div class="res-entry"><p class="muted">${esc(st.resText)}</p>${f ? `<span class="link-arrow">Open the file ${I.ext}</span>` : ''}</div></div></div></div>`;
  } else if (st.type === 'link') {
    dest = 'Journey → Dissemination';
    let host = ''; try { host = new URL(st.url.trim()).host; } catch (e) {}
    body = head('Journey · ' + m.city, 'Dissemination') + `<div class="grid mat-list"><div class="glass card mat pv-rel"><span class="tag y">${esc(WHERE[st.where])}</span><b>${esc(st.linkTitle)}</b><span class="small">${esc(host)}</span><span class="link-arrow">Open ${I.ext}</span></div></div>`;
  } else if (st.type === 'info') {
    const f = st.files.info[0], label = INFO.find(x => x[0] === st.info)[1];
    dest = 'Journey → About';
    body = head('Journey · ' + m.city, 'About') + (st.info === 'programme' ? `<div class="btn-row"><span class="btn btn--solid">Programme (PDF) ${I.ext}</span><span class="small" style="align-self:center">${esc(f ? fName(f) : '')}</span></div>`
      : st.info === 'photo' ? `<div class="hub-about"><button type="button" class="media pv-cover pv-zoom" data-zoom="info:0" aria-label="View the photo full screen"><img src="${esc(f ? fileUrl(f) : '')}" alt=""></button></div>`
      : `<div class="glass card pv-rel" style="max-width:760px"><h3 class="hub-theme">${esc(label)}</h3>${st.info === 'goals' ? `<ul class="hub-list">${st.infoText.split('\n').filter(x => x.trim()).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="muted" style="white-space:pre-line">${esc(st.infoText)}</p>`}</div>`);
  } else if (st.type === 'places') {
    dest = 'Journey → Daily activities';
    if (st.dp === 'day') body = head('Journey · ' + m.city, 'Daily activities') + `<div class="grid days-list pv-days"><div class="glass card mat day pv-rel"><div class="entry-meta"><span class="tag b">${esc(st.dDay)}</span><span>${esc(st.dDate)}</span></div><b>${esc(st.dTitle)}</b><p>${esc(st.dText)}</p></div></div>`;
    else {
      const n = st.which === 'new' ? m.stops.length + 1 : m.stops.findIndex(x => x.id === st.which) + 1;
      body = head('Journey · ' + m.city, 'Daily activities') + `<article class="glass card stop on pv-stop pv-rel"><div class="stop-head"><span class="stop-n">${n}</span><div><h3>${esc(st.sTitle)}</h3><div class="when">${esc(st.sWhen)}</div></div></div><p>${esc(st.sText)}</p></article>`;
    }
  }
  return { dest, tabs, body };
}
function previewHTML() {
  const p = pvParts();
  return `<div class="pv-bar"><span class="small">Shows on: <b>${p.dest}</b></span>${p.tabs}</div>
    <div class="pv-frame">${p.body}<p class="up-help">What visitors see before they click. The article, the document and the photo viewer stay closed here.</p></div>`;
}
/* ---------- EDIT: un singur ecran, ca in aplicatiile cunoscute ----------
   Se deschide din butonul Edit al unui rand. Cancel in stanga, Save in dreapta, toate campurile pe o pagina,
   iar alaturi cardul asa cum apare pe site (se schimba in timp ce scrii). Fisierele raman cele publicate. */
const snap = () => JSON.stringify({ ...st, files: 0 });
const dirty = () => !!ui.snap && snap() !== ui.snap;                 // s-a schimbat ceva fata de ce e publicat
const canSave = () => steps().slice(0, -1).every(canNext);           // aceleasi campuri obligatorii ca in ghid
const ddSlot = (k, label) => `<div class="up-field"><span class="up-label">${label}</span><div class="up-dd-slot" data-dde="${k}"></div></div>`;
const sw = (name, title, sub) => `<button type="button" class="up-switch up-switch--s" data-tog="${name}" role="switch" aria-checked="${!!st[name]}"><span class="up-opt-t"><b>${title}</b><small>${sub}</small></span><span class="up-sw" aria-hidden="true"><i></i></span></button>`;
// selectoarele din ecranul de editare: ce optiuni au, ce e ales si ce se intampla cand alegi altceva
function edOptions(k) {
  const m = mob(), dayName = (d, i) => [real(d.day) || 'Day ' + (i + 1), real(d.date)].filter(Boolean).join(' · ');
  switch (k) {
    case 'mob': return { label: 'Mobility', value: st.mob, options: S.mobilities.map(x => [x.id, `${x.city} · ${x.country}`]), set: v => {
      st.mob = v; const n = mob().days.length;
      if (st.type === 'media') Object.assign(st, { place: 'none', customPlace: '', inGallery: true, inMap: false });   // locurile sunt ale mobilitatii vechi
      if (st.type === 'story') { if (st.day >= n) st.day = 0; st.dayFrom = 0; st.dayTo = Math.min(1, n - 1); } } };
    case 'place': return { label: 'Place', value: st.place, options: [...m.stops.filter(x => real(x.title) || x.id === st.place).map(x => [x.id, x.title]), ['none', 'No specific place'], ['custom', 'Another place (write its name)']], set: v => {
      const was = onMap(); st.place = v; if (onMap() && !was) { st.inGallery = true; st.inMap = true; } } };
    case 'day': return { label: 'Day', value: st.day, options: [...m.days.map((d, i) => [i, dayName(d, i)]), [-1, 'More than one day']], set: v => { st.day = v; if (v === -1) { st.dayFrom = 0; st.dayTo = Math.min(1, m.days.length - 1); } } };
    case 'sec': return { label: 'Section', value: st.sec, options: SECS.map((n, i) => [i, n]), set: v => { st.sec = v; } };
    case 'where': return { label: 'Published on', value: st.where, options: WHERE.map((n, i) => [i, n]), set: v => { st.where = v; } };
    default: return { label: 'Category', value: st.cat, options: S.materialCats.map(c => [c.id, `${c.id.toUpperCase()} · ${c.name}`]), set: v => { st.cat = v; } };
  }
}
function editFields() {
  const t = st.type;
  const mobDD = ['media', 'story', 'result', 'link'].includes(t) || (t === 'material' && st.mat === 'new') ? ddSlot('mob', 'Mobility') : '';
  if (t === 'media') {
    const list = st.files.media;
    const row = (f, i) => `<li class="ed-cap"><button type="button" class="th th-s th-btn" data-zoom="media:${i}" aria-label="View ${esc(fName(f))} full screen"><span class="media">${fKind(f) === 'video' && !f.thumb ? '' : `<img src="${esc(fileUrl(f))}" alt="">`}${fKind(f) === 'video' ? `<span class="play-badge">${I.play}</span>` : ''}</span></button>
      <input class="up-input" id="up-cap${i}" data-cap="${i}" maxlength="200" value="${esc(capOf(i))}" placeholder="Add a caption…" aria-label="Caption for ${esc(fName(f))}" autocomplete="off"></li>`;
    return `<div class="up-field"><span class="up-label">${list.length > 1 ? 'Captions' : 'Caption'}</span><ul class="ed-caps">${list.map(row).join('')}</ul></div>` +
      ddSlot('place', 'Place') + (st.place === 'custom' ? input('customPlace', 'Name of the place', 'Where were the photos taken?', { max: 80, help: 'It shows as a label in the Gallery, not on the map.' }) : '') +
      (onMap() ? `<div class="up-field"><span class="up-label">Shows in</span><div class="ed-two">${sw('inGallery', 'Gallery', 'The big photo grid')}${sw('inMap', 'Journey map', 'At this place')}</div>
        ${st.inGallery || st.inMap ? '' : '<p class="up-help up-err">Pick at least one.</p>'}</div>` : '') + mobDD;
  }
  if (t === 'story') return input('title', 'Title', 'Title of the story', { max: 120 }) +
    area('excerpt', 'Short summary', 'Two lines about the day', 2, 300, { opt: true, help: 'Shown on the Journal card. Empty = the start of your story.' }) +
    area('body', 'Story', 'Write the story here. Leave an empty line between paragraphs.', 10, 20000) + ddSlot('day', 'Day') +
    (st.day === -1 ? `<div class="up-range glass"><div class="up-field"><span class="up-label">From</span><div class="up-dd-slot" data-dds="dayFrom"></div></div><span class="up-range-to" aria-hidden="true">${I.arrow}</span>
      <div class="up-field"><span class="up-label">To</span><div class="up-dd-slot" data-dds="dayTo"></div></div></div>` : '') +
    `<div class="up-field"><span class="up-label">Author</span>${sw('showAuthor', 'Show the name of the author', st.showAuthor ? 'The card shows who wrote it' : 'The card shows no name')}</div>` + mobDD;
  if (t === 'material') return (st.mat === 'new' ? input('matTitle', 'Title', 'Title of the presentation or worksheet')
      : `<div class="up-field"><span class="up-label">Title</span><p class="ed-fixed">${esc(slots()[st.mat] || '')}</p><p class="up-help">This title comes from the page, so it stays.</p></div>`) +
    `<div class="up-field"><span class="up-label">Made by</span>${byCards()}</div>` + (st.mat === 'new' ? ddSlot('cat', 'Category') : '') + mobDD;
  if (t === 'result') return ddSlot('sec', 'Section') + area('resText', 'Text', 'Write the text here', 8, 4000) + mobDD;
  if (t === 'link') return input('linkTitle', 'Title', 'Title of the article or post') +
    input('url', 'Link', 'https://', { type: 'url', max: 500, help: st.url && !validUrl(st.url) ? 'Paste the full link, starting with https://' : '' }) + ddSlot('where', 'Published on') + mobDD;
  if (t === 'info') return st.info === 'programme' || st.info === 'photo'
    ? `<div class="ed-note">${svg(ICON.info, 22)}<p>This one is only a file, so there is no text to edit. To change it, upload a new ${st.info === 'photo' ? 'photo' : 'programme'}: the new one takes its place.</p></div>`
    : area('infoText', INFO.find(x => x[0] === st.info)?.[1] || 'Text', 'Write the text here', 7, 3000, { help: st.info === 'goals' ? 'Write one goal on each line.' : '' });
  if (st.dp === 'day') return `<div class="up-two">${input('dDay', 'Day', 'Monday', { max: 30 })}${input('dDate', 'Date', '16 November', { max: 40, opt: true })}</div>` +
    input('dTitle', 'Title', 'Welcome to Brașov', { max: 120 }) + area('dText', 'Short description', 'One or two sentences', 3, 600, { opt: true });
  return input('sTitle', 'Place name', 'Bran Castle', { max: 120 }) + input('sWhen', 'When', 'Thursday · 19 November', { max: 60, opt: true }) +
    area('sText', 'Short description', 'One or two sentences', 3, 600, { opt: true }) +
    input('sLoc', 'New position on the map', 'Paste a Google Maps link, or 45.5149, 25.3672', { max: 600, opt: true, help: locHelp() });
}
function editHTML() {
  const it = ui.edit.items[0], n = ui.edit.items.length, p = pvParts();
  const what = { media: n > 1 ? `${n} photos & videos` : it.kind === 'video' ? 'video' : 'photo', story: 'story', material: 'material', result: 'text', link: 'link', info: 'mobility info', day: 'day', stop: 'place' }[it.type] || 'upload';
  const files = ['media', 'story', 'material'].includes(it.type) || (it.type === 'result' && it.key);
  return `<section class="glass card up-card up-edit" aria-labelledby="up-q">
    <div class="ed-bar">
      <button type="button" class="btn glass" data-act="ed-close">Cancel</button>
      <div class="ed-title"><h2 class="h3 up-q" id="up-q" tabindex="-1">Edit ${esc(what)}</h2><span class="small">${esc(mob().city)} · ${p.dest}</span></div>
      <button type="button" class="btn btn--solid up-go" data-act="ed-save"${canSave() && dirty() ? '' : ' disabled'}>Save</button>
    </div>
    ${ui.error ? `<p class="up-err up-errbox" role="alert">${esc(ui.error)}</p>` : ''}
    <div class="ed-grid">
      <div class="ed-form">${editFields()}
        <div class="ed-foot"><button type="button" class="btn glass ed-del" data-act="ed-delete">${svg(ICON.bin, 18)}Delete</button>
          ${files ? '<p class="up-help">The files stay as they are. To change a file, delete this and upload it again.</p>' : ''}</div></div>
      <aside class="ed-side" aria-label="How it looks on the site"><div class="ed-side-h"><span class="eyebrow">On the site</span>${p.tabs}</div><div class="pv-frame ed-pv" data-edpv>${p.body}</div></aside>
    </div></section>`;
}
// in timp ce scrii: se schimba doar cardul din dreapta si butonul Save (pagina nu se redeseneaza, deci campul ramane cu cursorul)
let edT = 0;
function refreshEdit() {
  const b = root.querySelector('[data-act="ed-save"]'); if (b) b.disabled = !(canSave() && dirty());
  clearTimeout(edT);
  edT = setTimeout(() => { const pv = root.querySelector('[data-edpv]'); if (pv && ui.view === 'edit') pv.innerHTML = pvParts().body; }, 160);
}
// mesajul scurt de jos ("Changes saved"), ca in aplicatii
function toast(text) {
  document.querySelector('.up-toast')?.remove();
  const t = el('div', { class: 'up-toast', role: 'status' }, el('span', { class: 'up-toast-ic', 'aria-hidden': 'true' }, svgEl(ICON.check, 16)), text);
  document.body.appendChild(t);
  const id = setTimeout(() => t.remove(), 2800);
  signal.addEventListener('abort', () => { clearTimeout(id); t.remove(); });
}

/* ---------- ghidul: capul, pasul, butoanele de jos ---------- */
function wizardHTML() {
  const list = steps(), i = Math.min(ui.step, list.length - 1), id = list[i];
  const [q, sub, body] = stepHTML(id);
  const total = st.type ? list.length : 6, mobName = st.mob ? mob().city : '';
  const mode = 'New upload';
  const preview = id === 'preview';
  const next = preview ? 'Publish now' : 'Next';
  const tname = st.type ? TYPES.find(t => t.id === st.type).name : '', jump = ui.mode !== 'edit';
  // ce ai ales pana acum; in ghid, un click te duce inapoi la pasul acela
  const crumb = (n, inner, label) => (jump ? `<button type="button" class="up-crumb" data-goto="${n}" aria-label="${esc(label)}">${inner}</button>` : `<span class="up-crumb">${inner}</span>`);
  const trail = (st.type && id !== 'type' ? crumb(0, `${svg(ICON[st.type], 16)}<span>${esc(tname)}</span>`, 'Change the kind of upload: ' + tname) : '') +
    (mobName && !['type', 'mob'].includes(id) ? crumb(1, `<i class="up-flag up-flag--s" style="background:${flag(st.mob)}"></i><span>${esc(mobName)}</span>`, 'Change the mobility: ' + mobName) : '');
  const ico = id === 'which' && st.dp === 'day' ? 'cal' : STEP_ICON[id] || 'up';
  return `<section class="glass card up-card up-wiz" aria-labelledby="up-q">
    <div class="up-head">
      <div class="up-meta"><span class="eyebrow">${mode}</span>${trail}
        ${optional(id) ? '<span class="tag y">Optional</span>' : ''}<span class="up-stepn">Step ${i + 1} of ${st.type ? list.length : '…'}</span></div>
      <div class="up-segs" role="progressbar" aria-label="Progress" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${i + 1}">${Array.from({ length: total }, (_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>
      <div class="up-qrow"><span class="up-qic" aria-hidden="true">${svg(ICON[ico], 30)}</span>
        <div class="up-qtxt"><h2 class="h3 up-q" id="up-q" tabindex="-1">${q}</h2>${sub ? `<p class="muted up-lede">${esc(sub)}</p>` : ''}</div></div>
    </div>
    <div class="up-body">${body}</div>
    ${ui.error ? `<p class="up-err up-errbox" role="alert">${esc(ui.error)}</p>` : ''}
    <div class="up-nav">
      <button type="button" class="btn glass" data-act="back">${I.back} Back</button>
      <div class="btn-row">
        ${optional(id) && !preview ? '<button type="button" class="btn glass" data-act="skip">Skip</button>' : ''}
        <button type="button" class="btn btn--solid up-go" data-act="next"${canNext(id) ? '' : ' disabled'}>${next} ${I.arrow}</button>
      </div>
    </div>
  </section>`;
}
// dupa ce scrii intr-un camp, se actualizeaza doar butonul Next (fara sa se redeseneze pagina)
function refreshNext() {
  const list = steps(), id = list[Math.min(ui.step, list.length - 1)], b = root.querySelector('[data-act="next"]');
  if (b) b.disabled = !canNext(id);
}

/* ---------- publicarea ---------- */
class Stop extends Error {}
const need = (ok, text) => { if (!ok) throw new Stop(text); };
function progress(text, p) {
  ui.busy = { text, p };
  const box = root.querySelector('.up-busy');
  if (box) { box.querySelector('b').textContent = text; box.querySelector('.up-bar i').style.width = Math.round(p * 100) + '%'; const n = box.querySelector('.up-pct'); if (n) n.textContent = Math.round(p * 100) + '%'; } else render();
}
const post = (type, data) => api('POST', '/items', { json: { type, mob: st.mob, data } });
async function sendDoc(f, label) {
  // o poza pusa ca material se micsoreaza ca orice poza (asa dispare si locul din datele ei); GIF-ul ramane cum e, ca sa se miste
  const e = extOf(f.file.name);
  if (kindOf(f.file) === 'image' && e !== 'gif') {
    progress(label, 0.3);
    try { return (await sendPhoto(f.file)).key; }
    catch (err) {
      if (err.message !== 'unreadable') throw err;
      if (!RAW_IMAGE.includes(e)) throw new Stop(`${f.file.name}: this photo format cannot be read here. Save it as JPG first.`);
    }
  }
  let sent = 0; return send(f.file, f.file.name, n => { sent += n; progress(label, sent / f.file.size); });
}
async function sendPhoto(file) {
  const { full, thumb } = await shrink(file), base = file.name.replace(/\.[^.]+$/, '');
  const key = await send(full.blob, `${base}.${full.ext}`);
  // in Cloudflare Images poza mica se face singura, din cea mare: nu mai trebuie urcata separat
  return { key, thumb: stored.get(key) === 'images' ? '' : await send(thumb.blob, `${base}-small.${thumb.ext}`), w: full.w, h: full.h };
}
const groupId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
async function publish() {
  const m = mob();
  if (st.type === 'media') {
    const list = st.files.media, stopOK = onMap();
    const base = { stop: stopOK ? st.place : '', place: st.place === 'custom' ? st.customPlace : '', gallery: stopOK ? st.inGallery : true, map: stopOK && st.inMap, group: list.length > 1 ? groupId() : '' };
    const total = list.reduce((n, f) => n + f.file.size, 0), failed = [];
    let before = 0, ok = 0;
    for (const [i, f] of list.entries()) {
      const label = `Uploading ${i + 1} of ${list.length}`, caption = capOf(i);
      progress(label, before / total);
      try {
        if (kindOf(f.file) === 'video') {
          const p = await poster(f.file);
          let sent = 0;
          const key = await send(f.file, f.file.name, n => { sent += n; progress(label, (before + sent) / total); }, p?.dur);
          const thumb = p ? await send(p.blob, f.file.name.replace(/\.[^.]+$/, '') + `-poster.${p.ext}`) : '';
          await post('media', { ...base, caption, key, thumb, w: p?.vw, h: p?.vh });
        } else await post('media', { ...base, caption, ...await sendPhoto(f.file) });
        ok++; f.sent = true;
      } catch (e) {
        if (['signed_out', 'offline', 'daily_limit', 'storage_full', 'key_quota'].includes(e.message)) { st.files.media = list.filter(x => !x.sent); throw e; }
        failed.push(`${f.file.name} (${e.message === 'unreadable' ? 'this photo format cannot be read here; save it as JPG first' : say(e.message)})`);
      }
      before += f.file.size;
    }
    st.files.media = list.filter(x => !x.sent);
    need(ok, 'Nothing was uploaded: ' + failed.join('; '));
    return { text: `${ok} ${ok === 1 ? 'file is' : 'files are'} live in ${base.map && base.gallery ? 'the Gallery and on the map' : base.map ? 'Journey, on the map' : 'the Gallery'}.`, href: base.map && !base.gallery ? `journey.html#${m.id}-daily` : 'gallery.html', warn: failed.length ? 'Not uploaded: ' + failed.join('; ') : '' };
  }
  if (st.type === 'story') {
    const photos = [];
    for (const [i, f] of st.files.story.entries()) {
      progress(`Uploading photo ${i + 1} of ${st.files.story.length}`, i / st.files.story.length);
      try { const p = await sendPhoto(f.file); photos.push({ key: p.key, thumb: p.thumb, caption: '' }); }
      catch (e) { if (e.message !== 'unreadable') throw e; throw new Stop(`${f.file.name}: this photo format cannot be read here. Save it as JPG first, or remove it.`); }
    }
    progress('Publishing the story', 1);
    const it = await post('story', { day: +st.day, days: st.day === -1 ? [st.dayFrom, st.dayTo] : [], title: st.title, excerpt: st.excerpt, body: st.body, author: st.showAuthor ? session.me.name : '', photos });
    return { text: 'Your story is live in the Journal.', href: `journal.html#s-${it.id}` };
  }
  if (st.type === 'material') {
    const names = slots(), isNew = st.mat === 'new', f = st.files.doc[0];
    const key = await sendDoc(f, 'Uploading the file');
    await post('material', { cat: st.cat, slot: isNew ? '' : names[st.mat], title: isNew ? st.matTitle : '', by: MADE_BY.filter((n, i) => st.by[i]).join(', '), key });
    return { text: 'The material is live in Journey → Materials.', href: `journey.html#${m.id}-materials` };
  }
  if (st.type === 'result') {
    const f = st.files.res[0], key = f ? await sendDoc(f, 'Uploading the file') : '';
    progress('Publishing', 1);
    await post('result', { sec: +st.sec, text: st.resText, key });
    return { text: 'It is live in Journey → Results.', href: `journey.html#${m.id}-results` };
  }
  if (st.type === 'link') {
    progress('Publishing', 1);
    await post('link', { where: +st.where, title: st.linkTitle, url: st.url.trim() });
    return { text: 'The link is live in Journey → Dissemination.', href: `journey.html#${m.id}-dissemination` };
  }
  if (st.type === 'info') {
    if (st.info === 'programme' || st.info === 'photo') {
      const f = st.files.info[0];
      let data;
      if (st.info === 'photo') { progress('Uploading the photo', 0.3); try { data = { key: (await sendPhoto(f.file)).key }; } catch (e) { if (e.message !== 'unreadable') throw e; throw new Stop('This photo format cannot be read here. Save it as JPG first.'); } }
      else { need(extOf(f.file.name) === 'pdf', 'The programme has to be a PDF file.'); data = { key: await sendDoc(f, 'Uploading the programme') }; }
      await post('info', { part: st.info, ...data });
    } else { progress('Publishing', 1); await post('info', { part: st.info, text: st.infoText }); }
    return { text: 'It is live in Journey → About.', href: `journey.html#${m.id}` };
  }
  progress('Publishing', 1);
  if (st.dp === 'day') await post('day', { i: st.which === 'new' ? m.days.length : +st.which, day: st.dDay, date: st.dDate, title: st.dTitle, text: st.dText });
  else {
    const at = coords(st.sLoc);
    await post('stop', { id: st.which === 'new' ? 'c-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(16) : st.which, title: st.sTitle, when: st.sWhen, text: st.sText, ...(at || {}) });
  }
  return { text: 'It is live in Journey → Daily activities.', href: `journey.html#${m.id}-daily` };
}
// EDIT si ADVANCED EDIT: fisierele raman cele publicate, restul se schimba (pe server: PUT /items/:id)
function dataFor(it, i) {
  const names = slots();
  switch (it.type) {
    case 'media': return { ...it, caption: capOf(i), stop: onMap() ? st.place : '', place: st.place === 'custom' ? st.customPlace : '', gallery: onMap() ? st.inGallery : true, map: onMap() && st.inMap };
    case 'story': return { ...it, day: +st.day, days: st.day === -1 ? [st.dayFrom, st.dayTo] : [], title: st.title, excerpt: st.excerpt, body: st.body, author: st.showAuthor ? (it.author || session.me.name) : '' };
    case 'material': return { ...it, cat: st.cat, slot: st.mat === 'new' ? '' : names[st.mat] ?? it.slot, title: st.mat === 'new' ? st.matTitle : '', by: MADE_BY.filter((n, j) => st.by[j]).join(', ') };
    case 'result': return { ...it, sec: +st.sec, text: st.resText };
    case 'link': return { ...it, where: +st.where, title: st.linkTitle, url: st.url.trim() };
    case 'info': return it.text !== undefined ? { ...it, text: st.infoText } : it;
    case 'day': return { ...it, day: st.dDay, date: st.dDate, title: st.dTitle, text: st.dText };
    default: { const at = coords(st.sLoc); return { ...it, title: st.sTitle, when: st.sWhen, text: st.sText, ...(at || {}) }; }
  }
}
async function save() {
  const list = ui.edit.items;
  for (const [i, it] of list.entries()) {
    progress(list.length > 1 ? `Saving ${i + 1} of ${list.length}` : 'Saving', i / list.length);
    await api('PUT', '/items/' + it.id, { json: { data: dataFor(it, i), mob: st.mob } });
  }
  return { text: 'The site shows the new version now.', href: hrefOf(list[0]), saved: true };
}
async function go() {
  if (ui.busy) return;
  ui.error = '';
  const wasNew = ui.mode === 'new';
  try {
    ui.view = 'busy'; progress('Starting', 0);
    ui.done = wasNew ? await publish() : await save();
    ui.busy = null; stale = true;
    if (!wasNew) { ui.done = null; backToList(); mine(); toast('Changes saved'); return; }
    ui.view = 'done'; st = blank(); ui.draft = false;
    render(); mine();
    root.querySelector('.up-done h2')?.focus({ preventScroll: true });
    scrollTo({ top: Math.max(0, root.getBoundingClientRect().top + scrollY - 120), behavior: 'smooth' });
  } catch (e) {
    ui.busy = null;
    if (e.message === 'signed_out') return;
    ui.view = wasNew ? 'wizard' : 'edit';
    ui.error = (e instanceof Stop ? e.message : say(e.message)) + ' Nothing was lost. Fix it and try again.';
    render();
  }
}


/* ---------- selectorul nostru (in locul <select>, a carui lista o deseneaza browserul si nu primeste stilul site-ului) ----------
   Un buton care deschide o lista de sticla. Merge si din tastatura: sageti, Home/End, Enter sau Space, Esc, prima litera. */
function dropdown({ id, label, options, value, onChange }) {
  const wrap = el('div', { class: 'up-dd' });
  const btn = el('button', { type: 'button', class: 'up-input up-dd-btn', id, 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': label ? `${label}: ${(options.find(o => o[0] === value) || options[0])[1]}` : null });
  const txt = el('span', { class: 'up-dd-t', text: (options.find(o => o[0] === value) || options[0])[1] });
  btn.append(txt, svgEl('M6 9l6 6 6-6', 18));
  const list = el('ul', { class: 'up-dd-list', role: 'listbox', tabindex: '-1', 'aria-label': label || '' });
  list.hidden = true;
  let active = Math.max(0, options.findIndex(o => o[0] === value));
  const lis = options.map(([v, t], i) => el('li', { role: 'option', id: `${id}-o${i}`, 'aria-selected': v === value ? 'true' : 'false', text: t, on: {
    click: () => pick(i), mousemove: () => mark(i) } }));
  list.append(...lis);
  wrap.append(btn, list);
  function mark(i) { active = (i + lis.length) % lis.length; lis.forEach((li, j) => li.classList.toggle('on', j === active)); list.setAttribute('aria-activedescendant', lis[active].id); lis[active].scrollIntoView({ block: 'nearest' }); }
  function open() {
    if (!list.hidden) return;
    document.querySelectorAll('.up-dd.open').forEach(d => d !== wrap && d.dispatchEvent(new Event('ddclose')));
    list.hidden = false; wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    mark(Math.max(0, options.findIndex(o => o[0] === value))); list.focus({ preventScroll: true });
  }
  function close(back = true) { if (list.hidden) return; list.hidden = true; wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus({ preventScroll: true }); }
  function pick(i) {
    value = options[i][0]; txt.textContent = options[i][1];
    if (label) btn.setAttribute('aria-label', `${label}: ${options[i][1]}`);
    lis.forEach((li, j) => li.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    close(); onChange(value);
  }
  wrap.addEventListener('ddclose', () => close(false));
  btn.addEventListener('click', () => (list.hidden ? open() : close()));
  btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); } });
  list.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') mark(active + 1); else if (e.key === 'ArrowUp') mark(active - 1);
    else if (e.key === 'Home') mark(0); else if (e.key === 'End') mark(lis.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') pick(active);
    else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.stopPropagation(); close(e.key === 'Escape'); return; }
    else if (e.key.length === 1) { const i = options.findIndex((o, j) => j > active && norm(o[1]).startsWith(norm(e.key))); const k = i >= 0 ? i : options.findIndex(o => norm(o[1]).startsWith(norm(e.key))); if (k >= 0) mark(k); return; }
    else return;
    e.preventDefault();
  });
  document.addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) close(false); }, { signal });
  return wrap;
}

/* ---------- lista: ce ai urcat, ce a urcat toata echipa, Trash, parole (DOM fara innerHTML pe date de la utilizatori) ---------- */
let items = null, trash = [], storage = null, cloud = null, keys = null, newKey = null, newKeyJustMade = false;
let sideTab = 'live', filterText = '', filterMob = 'all', filterType = 'all', kRoleDraft = 'student';
const openGroups = new Set();
const LABEL = { media: 'Photo', story: 'Journal', material: 'Material', result: 'Results', link: 'Link', info: 'Mobility info', day: 'Day', stop: 'Place' };
function describe(it) {
  const m = S.mob(it.mob), stop = it.stop && m?.stops.find(s => s.id === it.stop);
  const city = m ? m.city : '';
  if (it.type === 'media') return [it.kind === 'video' ? 'Video' : 'Photo', it.caption || (stop ? stop.title : it.place) || fileName(it.key) || 'No caption', [city, stop ? stop.title : it.place].filter(Boolean).join(' · ')];
  if (it.type === 'story') return ['Journal', it.title, city];
  if (it.type === 'material') return ['Material', it.title || it.slot, `${city} · category ${String(it.cat || '').toUpperCase()}`];
  if (it.type === 'result') return ['Results', (it.text || '').slice(0, 70), `${city} · ${SECS[it.sec] || ''}`];
  if (it.type === 'link') return ['Link', it.title, `${city} · ${WHERE[it.where] || ''}`];
  if (it.type === 'info') return ['Mobility info', (INFO.find(x => x[0] === it.part) || [])[1] || 'Info', city];
  if (it.type === 'day') return ['Day', `${it.day}: ${it.title}`, city];
  return ['Place', it.title || '', city];
}
function hrefOf(it) {
  const m = it.mob;
  return { media: it.map && !it.gallery ? `journey.html#${m}-daily` : 'gallery.html', story: `journal.html#s-${it.id}`, material: `journey.html#${m}-materials`, result: `journey.html#${m}-results`,
    link: `journey.html#${m}-dissemination`, info: `journey.html#${m}`, day: `journey.html#${m}-daily`, stop: `journey.html#${m}-daily` }[it.type] || 'index.html';
}
function filterMatches(it) {
  if (filterMob !== 'all' && it.mob !== filterMob) return false;
  if (filterType !== 'all' && it.type !== filterType) return false;
  if (!filterText.trim()) return true;
  const q = filterText.trim().toLowerCase();
  const [tag, title, meta] = describe(it);
  return [tag, title, meta, it.uploader].some(v => v && String(v).toLowerCase().includes(q));
}
// seriile de poze (acelasi "group") stau impreuna; cele urcate inainte de grupuri raman cate una
function grouped(list) {
  const out = [], at = {};
  for (const it of list) {
    if (it.type === 'media' && it.group) {
      if (at[it.group] === undefined) { at[it.group] = out.length; out.push({ items: [] }); }
      out[at[it.group]].items.push(it);
    } else out.push({ items: [it] });
  }
  return out;
}
// miniatura din stanga fiecarui rand
// ce se deschide pe tot ecranul cand dai click pe miniatura unui rand (null = nimic, de ex. un document)
function zoomOf(row, at = 0) {
  const it = row.items[0];
  if (it.type === 'media') return [row.items.map(x => ({ type: x.kind === 'video' ? 'video' : 'photo', src: mediaSrc(x.key), thumb: mediaSrc(x.thumb), caption: x.caption || fileName(x.key) })), at];
  if (it.type === 'story' && it.photos?.length) return [it.photos.map(ph => ({ type: 'photo', src: mediaSrc(ph.key), thumb: mediaSrc(ph.thumb), caption: ph.caption || it.title })), 0];
  if (it.type === 'info' && it.part === 'photo' && it.key) return [[{ type: 'photo', src: mediaSrc(it.key), caption: 'Cover photo' }], 0];
  return null;
}
function thumbEl(row, zoom = zoomOf(row)) {
  const it = row.items[0];
  const box = zoom ? el('button', { type: 'button', class: 'th th-btn', 'aria-label': `View ${row.items.length > 1 ? 'all ' + row.items.length + ' files' : 'it'} full screen`, on: { click: () => U.lightbox(...zoom) } })
    : el('span', { class: 'th', 'aria-hidden': 'true' });
  const pic = (key, video) => {
    const m = el('span', { class: 'media' });
    if (key) m.appendChild(el('img', { src: mediaSrc(key), alt: '', loading: 'lazy' }));
    else m.classList.add('ph');
    if (video) { const pb = el('span', { class: 'play-badge' }); pb.innerHTML = I.play; m.appendChild(pb); }   // iconita fixa, nu date de la utilizatori
    return m;
  };
  if (it.type === 'media' && row.items.length > 1) {
    box.classList.add('stack');
    row.items.slice(0, 3).reverse().forEach((x, i) => { const p = pic(x.thumb || (x.kind === 'photo' ? x.key : ''), false); p.classList.add('s' + (i + 1)); box.appendChild(p); });
    box.appendChild(el('span', { class: 'th-n', text: String(row.items.length) }));
  } else if (it.type === 'media') box.appendChild(pic(it.thumb || (it.kind === 'photo' ? it.key : ''), it.kind === 'video'));
  else if (it.type === 'story' && it.photos?.length) { box.appendChild(pic(it.photos[0].thumb || it.photos[0].key)); box.appendChild(el('span', { class: 'th-badge' }, svgEl(ICON.story, 13))); }
  else if (it.type === 'info' && it.part === 'photo') box.appendChild(pic(it.key));
  else if (it.key && (it.key.startsWith('doc/') || /\.(pdf|pptx?|docx?)$/.test(it.key))) {
    const e = extOf(it.key), [c, l] = DOC[e] || ['#4A5A8A', e.slice(0, 1).toUpperCase()];
    box.appendChild(el('span', { class: 'doc', style: `--c:${c}` }, el('span', { class: 'doc-l', text: l }), l.length > 1 ? null : el('span', { class: 'doc-e', text: e.toUpperCase() })));
  } else box.appendChild(el('span', { class: 'ico-box' }, svgEl({ story: ICON.story, result: ICON.result, link: ICON.link, info: ICON.info, day: ICON.cal, stop: ICON.places }[it.type] || ICON.story, 22)));
  return box;
}
// butonul "..." de pe fiecare rand. Meniul sta in <body> (nu in lista), ca sa nu fie taiat de marginea listei.
// entries = [text, iconita, functie sau adresa, rosu?]. Tastatura: sageti, Esc, Tab.
let menuOpen = null;
function closeMenu(focusBack) {
  if (!menuOpen) return;
  const { menu, btn } = menuOpen; menuOpen = null;
  menu.remove(); btn.setAttribute('aria-expanded', 'false');
  if (focusBack && btn.isConnected) btn.focus({ preventScroll: true });
}
function moreBtn(label, entries) {
  const btn = el('button', { type: 'button', class: 'up-ic up-more', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': `Options for ${label}` }, svgEl(ICON.more, 22));
  btn.firstChild.setAttribute('stroke-width', '2.8');
  btn.addEventListener('click', () => {
    if (menuOpen && menuOpen.btn === btn) { closeMenu(true); return; }
    closeMenu(false);
    const menu = el('div', { class: 'up-menu', role: 'menu', 'aria-label': `Options for ${label}` });
    for (const [text, ico, act, danger] of entries) {
      menu.appendChild(typeof act === 'string'
        ? el('a', { class: 'up-mi', role: 'menuitem', href: act, on: { click: () => closeMenu(false) } }, svgEl(ico, 18), text)
        : el('button', { type: 'button', class: 'up-mi' + (danger ? ' is-danger' : ''), role: 'menuitem', on: { click: () => { closeMenu(false); act(); } } }, svgEl(ico, 18), text));
    }
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect(), mh = menu.offsetHeight, mw = menu.offsetWidth;
    menu.style.top = Math.max(8, r.bottom + 8 + mh > innerHeight - 8 ? r.top - mh - 8 : r.bottom + 8) + 'px';
    menu.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    menuOpen = { menu, btn };
    menu.firstChild.focus({ preventScroll: true });
    menu.addEventListener('keydown', e => {
      const all = [...menu.children], at = all.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); all[(at + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length].focus(); }
      else if (e.key === 'Tab') closeMenu(false);
    });
  });
  return btn;
}
document.addEventListener('pointerdown', e => { if (menuOpen && !menuOpen.menu.contains(e.target) && !menuOpen.btn.contains(e.target)) closeMenu(false); }, { signal });
addEventListener('scroll', () => closeMenu(false), { passive: true, capture: true, signal });
addEventListener('resize', () => closeMenu(false), { signal });
signal.addEventListener('abort', () => closeMenu(false));
function editBtn(items, oneFile = false) {
  return el('button', { type: 'button', class: 'up-ic up-ic--text', text: 'Edit', on: { click: () => {
    closeMenu(false);
    startEdit(items, oneFile);
  } } });
}
function rowEl(row, { trashView = false, showWho = false, key = '' } = {}) {
  const it = row.items[0], group = row.items.length > 1, admin = session?.me?.role === 'admin';
  const [tag, title, meta] = describe(it);
  const m = S.mob(it.mob), stop = it.stop && m?.stops.find(s => s.id === it.stop);
  const t = group ? (stop ? stop.title : it.place || 'Photos & videos') : title;
  const what = group ? `${row.items.length} files · ${it.map && it.gallery ? 'Gallery + Journey' : it.map ? 'Journey' : 'Gallery'} · ${m ? m.city : ''}` : meta;
  const when = shortDate(trashView ? (it.deletedAt || it.t) : it.t);
  const gk = key + (it.group || it.id), open = openGroups.has(gk);
  const li = el('li', { class: 'up-row-li' });
  const actions = el('div', { class: 'up-acts' });
  if (group) actions.appendChild(el('button', { type: 'button', class: 'btn glass up-sm', 'aria-expanded': open ? 'true' : 'false', text: open ? 'Hide files' : `Show all ${row.items.length}`, on: {
    click: () => { if (open) openGroups.delete(gk); else openGroups.add(gk); renderLists(); } } }));
  if (trashView) {
    if (admin) {
      actions.appendChild(el('button', { type: 'button', class: 'up-ic', 'aria-label': `Restore ${title}`, on: { click: () => restoreUpload(it) } }, svgEl(ICON.restore, 18)));
      actions.appendChild(el('button', { type: 'button', class: 'up-ic up-ic--danger', 'aria-label': `Delete permanently ${title}`, on: { click: () => purgeUpload(it) } }, svgEl(ICON.bin, 18)));
    }
  } else {
    actions.append(editBtn(row.items), moreBtn(t, [['View on site', ICON.eye, hrefOf(it)], ['Delete', ICON.bin, () => remove(row.items, t), true]]));
  }
  li.appendChild(el('div', { class: 'up-li-row' },
    thumbEl(row),
    el('div', { class: 'up-li' },
      el('span', { class: 'tag b', text: group ? 'Photos & videos' : tag }),
      el('b', { text: t }),
      el('small', { text: `${what} · ${trashView ? 'deleted ' : ''}${when}${showWho && it.uploader ? ` · ${it.uploader}` : ''}` })
    ),
    actions
  ));
  if (group && open) {
    const sub = el('ul', { class: 'up-sub' });
    row.items.forEach(x => {
      const one = { items: [x] };
      const subActs = el('div', { class: 'up-acts' });
      if (!trashView) {
        subActs.append(editBtn(one.items, true), moreBtn(fileName(x.key), [['Delete', ICON.bin, () => remove([x], fileName(x.key), true), true]]));
      }
      sub.appendChild(el('li', null, thumbEl(one, zoomOf(row, row.items.indexOf(x))), el('div', { class: 'up-li' }, el('b', { text: x.caption || fileName(x.key) }), el('small', { text: `${x.kind === 'video' ? 'Video' : 'Photo'} · ${fileName(x.key)}` })), subActs));
    });
    li.appendChild(sub);
  }
  return li;
}
function listCard(title, list, { trashView = false, showWho = false, key, empty, foot, tabs } = {}) {
  const card = el('section', { class: 'glass card up-side up-listcard' });
  const head = el('div', { class: 'up-list-head' }, el('span', { class: 'eyebrow', text: title }));
  if (tabs) head.appendChild(tabs);
  head.appendChild(el('span', { class: 'small', text: list ? `${list.length} ${list.length === 1 ? 'item' : 'items'}` : '' }));
  card.appendChild(head);
  const box = el('div', { class: 'up-scroll' });
  if (!list) box.appendChild(el('p', { class: 'up-help', text: 'Loading…' }));
  else if (!list.length) box.appendChild(el('p', { class: 'up-help up-empty', text: empty }));
  else { const ul = el('ul', { class: 'up-list' }); grouped(list).forEach(r => ul.appendChild(rowEl(r, { trashView, showWho, key }))); box.appendChild(ul); }
  card.appendChild(box);
  if (foot) card.appendChild(el('p', { class: 'up-help', text: foot }));
  return card;
}
function renderLists() {
  const box = root.querySelector('.up-lists'); if (!box) return;
  closeMenu(false);
  const admin = session?.me?.role === 'admin';
  const frag = document.createDocumentFragment();
  frag.appendChild(listCard('Your uploads', items && items.filter(x => x.own), { key: 'mine:', empty: 'Nothing yet. Press Upload to add your first one.', foot: 'The newest is at the top.' }));
  if (isStaff()) {
    let tabs = null;
    if (admin) {
      tabs = el('div', { class: 'seg glass up-tabs', role: 'tablist' });
      for (const [v, t] of [['live', `Live (${items ? items.length : 0})`], ['trash', `Trash (${trash ? trash.length : 0})`]]) {
        tabs.appendChild(el('button', { type: 'button', role: 'tab', 'aria-selected': sideTab === v ? 'true' : 'false', text: t, on: { click: () => { sideTab = v; renderLists(); } } }));
      }
    }
    const inTrash = admin && sideTab === 'trash';
    const raw = inTrash ? trash : items;
    const card = listCard('All uploads', raw && (admin ? raw.filter(filterMatches) : raw), { trashView: inTrash, showWho: admin, key: inTrash ? 'trash:' : 'all:', tabs,
      empty: inTrash ? 'Trash is empty.' : raw && raw.length ? 'No uploads match this filter.' : 'Nothing here yet.',
      foot: inTrash ? 'Deleted items stay in Trash for 7 days. Only an admin can restore them.' : 'Deleted items go to Trash. Only an admin can bring them back.' });
    if (admin) {
      const search = el('input', { class: 'up-input up-fsearch', id: 'up-fsearch', type: 'search', placeholder: 'Filter by title, person, key…', value: filterText, on: {
        input: e => { filterText = e.target.value; renderLists(); const f = root.querySelector('#up-fsearch'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } } } });
      const mobSel = dropdown({ id: 'up-fmob', label: 'Filter by mobility', value: filterMob, options: [['all', 'All mobilities'], ...S.mobilities.map(x => [x.id, x.city])],
        onChange: v => { filterMob = v; renderLists(); root.querySelector('#up-fmob')?.focus({ preventScroll: true }); } });
      const typeSel = dropdown({ id: 'up-ftype', label: 'Filter by type', value: filterType, options: [['all', 'All types'], ...Object.entries(LABEL)],
        onChange: v => { filterType = v; renderLists(); root.querySelector('#up-ftype')?.focus({ preventScroll: true }); } });
      card.insertBefore(el('div', { class: 'up-filters' }, search, el('div', { class: 'up-two' }, mobSel, typeSel)), card.children[1]);
    }
    frag.appendChild(card);
  }
  if (admin) frag.appendChild(buildKeysCard());
  const keepIds = ['#up-klabel', '#up-kcustom', '#up-kmaxdev', '#up-kquota', '#up-kdays'];
  const keep = keepIds.map(q => box.querySelector(q)?.value || '');
  const detailsOpen = box.querySelector('.up-kopts')?.open || false;
  const scroll = [...box.querySelectorAll('.up-scroll')].map(x => x.scrollTop);
  box.replaceChildren(frag);
  box.querySelectorAll('.up-scroll').forEach((x, i) => { x.scrollTop = scroll[i] || 0; });
  if (admin && !newKeyJustMade) {
    keepIds.forEach((q, i) => { const f = box.querySelector(q); if (f) f.value = keep[i]; });
    const det = box.querySelector('.up-kopts'); if (det && detailsOpen) det.open = true;
  }
  newKeyJustMade = false;
}
async function mine() {
  try {
    const r = await api('GET', '/mine');
    items = r.items || [];
    trash = r.trash || [];
    storage = r.storage || null; cloud = r.cloud || null;
  } catch (e) { if (e.message === 'signed_out') return; items = items || []; }
  if (session?.me.role === 'admin') try { keys = (await api('GET', '/admin/keys')).keys; } catch (e) { keys = keys || []; }
  if (session && ui.view === 'list') renderLists();
}

function buildKeysCard(errBox) {
  const sec = el('section', { class: 'glass card up-side' }, el('span', { class: 'eyebrow', text: 'Access keys & devices' }));
  const meter = (name, value, used, max, note) => sec.appendChild(el('div', { class: 'up-meter' },
    el('div', { class: 'up-meter-top' }, el('span', { text: name }), el('b', { text: value })),
    el('div', { class: 'up-bar' }, el('i', { style: `width:${Math.min(100, Math.round((used / max) * 100))}%` })),
    note ? el('small', { class: 'up-help', text: note }) : null));
  // cand Images & Stream sunt legate, in R2 raman doar documentele (si pozele / video-urile urcate inainte)
  if (storage && storage.maxBytes) meter(cloud?.on ? 'R2 storage (documents)' : 'R2 storage', `${size(storage.usedBytes)} / ${size(storage.maxBytes)}`, storage.usedBytes, storage.maxBytes);
  if (cloud?.on) {
    const im = cloud.images, sv = cloud.stream, n = x => Number(x).toLocaleString('en-GB');
    meter('Photos (Cloudflare Images)', `${n(im.count)} / ${n(im.max)}`, im.count, im.max, im.count >= im.max ? 'Full: new photos are stored in R2.' : '');
    meter('Videos (Cloudflare Stream)', `${n(sv.minutes)} / ${n(sv.max)} min`, sv.minutes, sv.max,
      [sv.minutes >= sv.max ? 'Full: new videos are stored in R2.' : '', sv.pending ? `${sv.pending} still processing.` : '', sv.failed ? `${sv.failed} could not be processed.` : ''].filter(Boolean).join(' '));
    if (cloud.error) sec.appendChild(el('p', { class: 'up-help up-err', role: 'status',
      text: `Images & Stream problem on ${shortDate(cloud.error.at)} (${cloud.error.where}): ${cloud.error.msg}. Uploads that could not go there were stored in R2.` }));
  }
  if (newKey) {
    const copyBtn = el('button', { type: 'button', class: 'btn glass', text: 'Copy', on: {
      click: async e => { try { await navigator.clipboard.writeText(newKey.key); e.currentTarget.textContent = 'Copied'; } catch (err) {} }
    } });
    sec.appendChild(el('div', { class: 'up-newkey', role: 'status' },
      el('small', { text: `New key for ${newKey.label}. Write it down now, it is shown only once:` }),
      el('code', { text: newKey.key }),
      copyBtn
    ));
  }
  if (!keys) {
    sec.appendChild(el('p', { class: 'up-help', text: 'Loading…' }));
  } else if (!keys.length) {
    sec.appendChild(el('p', { class: 'up-help', text: 'No keys yet. Make the first one below.' }));
  } else {
    const kList = el('div', { class: 'up-klist' });
    const now = Date.now();
    for (const k of keys) {
      const tags = el('div', { class: 'up-ktags' },
        el('span', { class: `tag ${k.role === 'teacher' ? 'y' : 'b'}`, text: k.role === 'teacher' ? 'Teachers' : 'Students' })
      );
      if (!k.active) tags.appendChild(el('span', { class: 'tag r', text: 'Off' }));
      if (k.locked) tags.appendChild(el('span', { class: 'tag r', text: 'Locked' }));
      if (k.max_devices > 0) tags.appendChild(el('span', { class: 'tag', text: `${k.devices}/${k.max_devices} dev` }));
      if (k.quota_mb > 0) tags.appendChild(el('span', { class: 'tag', text: `Cap ${k.quota_mb} MB` }));
      if (k.expires_at > 0) tags.appendChild(el('span', { class: `tag ${k.expires_at < now ? 'r' : 'g'}`, text: k.expires_at < now ? 'Expired' : `Exp ${shortDate(k.expires_at)}` }));

      const kCard = el('div', { class: 'up-kcard' },
        el('div', { class: 'up-khead' },
          tags,
          el('b', { text: k.label }),
          el('small', { text: `${k.devices} active ${k.devices === 1 ? 'device' : 'devices'} · ${size(k.used_bytes || 0)} used` })
        ),
        el('div', { class: 'up-kacts' },
          el('button', { type: 'button', class: 'btn glass up-xs', text: k.active ? 'Turn off' : 'Turn on', on: {
            click: async () => { try { await api('PUT', '/admin/keys/' + k.id, { json: { active: !k.active } }); } catch (err) {} mine(); }
          } }),
          el('button', { type: 'button', class: 'btn glass up-xs', text: k.locked ? 'Unlock new' : 'Lock new', on: {
            click: async () => { try { await api('PUT', '/admin/keys/' + k.id, { json: { locked: !k.locked } }); } catch (err) {} mine(); }
          } }),
          el('button', { type: 'button', class: 'btn glass up-xs', text: 'Limits', on: { click: () => editKeyLimits(k) } }),
          el('button', { type: 'button', class: 'btn glass up-xs up-xs--danger', text: 'Delete', on: { click: () => deleteKeyDialog(k) } })
        )
      );
      if (k.deviceList && k.deviceList.length) {
        const dList = el('ul', { class: 'up-devs' });
        for (const d of k.deviceList) {
          const dRow = el('li', { class: 'up-dev' },
            el('div', { class: 'up-dev-info' },
              el('span', { class: `up-dot${d.online ? ' on' : ''}`, title: d.online ? 'Signed in' : 'Signed out' }),
              el('div', { class: 'up-dev-txt' },
                el('b', { text: d.name }),
                el('small', { text: `${d.online ? 'Active' : 'Signed out'} · ${shortDate(d.seen)} · ${d.uploads} ${d.uploads === 1 ? 'upload' : 'uploads'}` })
              )
            )
          );
          if (d.online) {
            dRow.appendChild(el('button', { type: 'button', class: 'btn glass up-xs', text: 'Disconnect', on: { click: () => kickDeviceDialog(k, d) } }));
          } else if (d.uploads > 0) {
            dRow.appendChild(el('button', { type: 'button', class: 'btn glass up-xs', text: 'Hide uploads', on: { click: () => kickDeviceDialog(k, d, true) } }));
          }
          dList.appendChild(dRow);
        }
        kCard.appendChild(dList);
      }
      kList.appendChild(kCard);
    }
    sec.appendChild(kList);
  }

  // Formular creare cheie noua
  const kLabel = el('input', { class: 'up-input', id: 'up-klabel', type: 'text', maxlength: '60', placeholder: 'Honterus students, class 10A', autocomplete: 'off' });
  const kCustom = el('input', { class: 'up-input', id: 'up-kcustom', type: 'text', maxlength: '100', placeholder: 'Leave empty to get a random one', autocomplete: 'off' });
  const kMaxDev = el('input', { class: 'up-input', id: 'up-kmaxdev', type: 'number', min: '0', max: '500', placeholder: '0 = no limit' });
  const kQuota = el('input', { class: 'up-input', id: 'up-kquota', type: 'number', min: '0', max: '8000', placeholder: '0 = default' });
  const kDays = el('input', { class: 'up-input', id: 'up-kdays', type: 'number', min: '0', max: '365', placeholder: '0 = never' });
  const kErr = el('p', { class: 'up-help up-kerr', role: 'alert' });
  const roleBtns = el('div', { class: 'up-chips', role: 'group', 'aria-label': 'Kind of key' });
  for (const [val, label] of [['student', 'Students'], ['teacher', 'Teachers']]) {
    roleBtns.appendChild(el('button', {
      type: 'button', class: 'up-chip', 'aria-pressed': kRoleDraft === val ? 'true' : 'false', text: label,
      on: { click: () => { kRoleDraft = val; [...roleBtns.children].forEach((b, i) => b.setAttribute('aria-pressed', (i === 0 ? 'student' : 'teacher') === val ? 'true' : 'false')); } }
    }));
  }

  sec.append(
    el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'up-klabel', text: 'New key for' }), kLabel),
    roleBtns,
    el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'up-kcustom', text: 'Your own key (optional)' }), kCustom),
    el('details', { class: 'up-kopts' },
      el('summary', { text: 'Optional limits (devices, quota, expiry)' }),
      el('div', { class: 'up-three' },
        el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'up-kmaxdev', text: 'Max devices' }), kMaxDev),
        el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'up-kquota', text: 'Quota (MB)' }), kQuota),
        el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'up-kdays', text: 'Days valid' }), kDays)
      )
    ),
    kErr,
    el('button', { type: 'button', class: 'btn btn--solid', text: 'Create key', on: {
      click: async () => {
        const label = kLabel.value.trim();
        if (!label) { kErr.textContent = 'Write who the key is for.'; return; }
        const numOr0 = inp => { const n = parseInt(inp.value, 10); return Number.isFinite(n) && n > 0 ? n : 0; };
        try {
          newKey = await api('POST', '/admin/keys', { json: {
            label, role: kRoleDraft, key: kCustom.value.trim(),
            max_devices: numOr0(kMaxDev), quota_mb: numOr0(kQuota), expires_days: numOr0(kDays),
          } });
          newKeyJustMade = true;
          await mine();
        } catch (err) { kErr.textContent = say(err.message); }
      }
    } }),
    el('p', { class: 'up-help', text: 'Lock new prevents new logins on that key while keeping existing devices signed in.' })
  );
  return sec;
}

/* ---------- ferestre de dialog sigure (DOM nodes, fara innerHTML pe date user) ---------- */
/* ---------- ferestre de dialog sigure (DOM nodes, fara innerHTML pe date user) ---------- */
function dialog(title, bodyNode, okText, onOK, danger = false, { cancelText = 'Cancel', refresh = true } = {}) {
  const d = document.createElement('dialog');
  d.className = 'up-dialog glass';
  const err = el('p', { class: 'up-help up-derr', role: 'alert' });
  const closeBtn = el('button', { type: 'button', class: 'btn glass', text: cancelText, on: { click: () => close() } });
  const okBtn = el('button', { type: 'submit', class: `btn ${danger ? 'btn--solid up-btn-danger' : 'btn--solid'}`, text: okText });
  const form = el('form', { method: 'dialog' },
    el('h2', { class: 'h3', text: title }),
    bodyNode,
    err,
    el('div', { class: 'btn-row' }, closeBtn, okBtn)
  );
  d.appendChild(form);
  document.body.appendChild(d);
  const close = () => { d.close(); d.remove(); };
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    okBtn.disabled = true;
    try { await onOK(form); close(); if (refresh) { mine(); stale = true; } }
    catch (errObj) { err.textContent = say(errObj.message); okBtn.disabled = false; }
  });
  signal.addEventListener('abort', () => d.isConnected && close());
  d.showModal();
}
function editKeyLimits(k) {
  const maxInp = el('input', { class: 'up-input', id: 'kl-max', name: 'max_devices', type: 'number', min: '0', max: '500', value: String(k.max_devices || 0) });
  const quotaInp = el('input', { class: 'up-input', id: 'kl-quota', name: 'quota_mb', type: 'number', min: '0', max: '8000', value: String(k.quota_mb || 0) });
  const expInp = el('input', { class: 'up-input', id: 'kl-days', name: 'expires_days', type: 'number', min: '0', max: '365', placeholder: 'Leave empty to keep, 0 = never expires' });
  const box = el('div', { class: 'up-dialog-body' },
    el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'kl-max', text: 'Max active devices (0 = unlimited)' }), maxInp),
    el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'kl-quota', text: 'Total storage quota in MB (0 = default)' }), quotaInp),
    el('div', { class: 'up-field' }, el('label', { class: 'up-label', for: 'kl-days', text: 'Set new expiry in days from now (optional)' }), expInp)
  );
  dialog(`Limits · ${k.label}`, box, 'Save limits', async form => {
    const payload = {
      max_devices: Math.max(0, Math.min(500, parseInt(maxInp.value, 10) || 0)),
      quota_mb: Math.max(0, Math.min(8000, parseInt(quotaInp.value, 10) || 0)),
    };
    if (expInp.value.trim() !== '') payload.expires_days = Math.max(0, Math.min(365, parseInt(expInp.value, 10) || 0));
    await api('PUT', '/admin/keys/' + k.id, { json: payload });
  });
}
function deleteKeyDialog(k) {
  const hideChk = el('input', { type: 'checkbox', name: 'hideUploads' });
  const box = el('div', { class: 'up-dialog-body' },
    el('p', { class: 'muted', text: `All ${k.devices} active devices using “${k.label}” will be signed out immediately and can never sign in with this key again.` }),
    el('label', { class: 'up-check' }, hideChk, el('span', { text: 'Also move all uploads from this key to Trash' }))
  );
  dialog(`Delete key “${k.label}”?`, box, 'Delete key', () => api('DELETE', `/admin/keys/${k.id}${hideChk.checked ? '?hide_uploads=1' : ''}`), true);
}
function kickDeviceDialog(k, d, hideOnly = false) {
  const lockChk = el('input', { type: 'checkbox', name: 'lockKey', checked: false });
  const hideChk = el('input', { type: 'checkbox', name: 'hideUploads', checked: hideOnly });
  const box = el('div', { class: 'up-dialog-body' },
    el('p', { class: 'muted', text: hideOnly
      ? `Hide all live uploads from “${d.name}” (moves them to Trash for 7 days).`
      : `Signs out “${d.name}” immediately. Only this device is removed; other devices stay signed in.` })
  );
  if (!hideOnly) {
    box.appendChild(el('label', { class: 'up-check' }, lockChk,
      el('span', null, `Lock “${k.label}” for new devices`, el('small', { text: 'Tick this so this person cannot sign in again with the same key.' }))
    ));
  }
  if (d.uploads > 0) {
    box.appendChild(el('label', { class: 'up-check' }, hideChk,
      el('span', null, `Move ${d.uploads} ${d.uploads === 1 ? 'upload' : 'uploads'} to Trash`, el('small', { text: 'You can restore them from Trash within 7 days.' }))
    ));
  }
  dialog(hideOnly ? `Hide uploads from “${d.name}”?` : `Disconnect “${d.name}”?`, box, hideOnly ? 'Move to Trash' : 'Disconnect',
    () => api('POST', `/admin/devices/${d.id}/kick`, { json: { lockKey: !hideOnly && lockChk.checked, hideUploads: hideChk.checked } }), true);
}


/* ---------- stergere si Trash ---------- */
function remove(list, title, oneFile = false, after = null) {
  const many = list.length > 1;
  const text = many ? `“${title}” and all ${list.length} files in it disappear from the website.` : oneFile ? `Only this file disappears from the website. The rest of the set stays.` : `“${title}” disappears from the website.`;
  const body = el('div', { class: 'up-dialog-body' }, el('p', { class: 'muted', text }),
    el('p', { class: 'up-help', text: 'It goes to Trash. Only an admin can bring it back.' }));
  dialog('Delete this?', body, 'Delete', async () => { for (const it of list) await api('DELETE', '/items/' + it.id); if (after) after(); }, true);
}
async function restoreUpload(it) {
  try { await api('POST', `/items/${it.id}/restore`); stale = true; mine(); } catch (e) {}
}
function purgeUpload(it) {
  const [, title] = describe(it);
  dialog('Delete permanently?',
    el('p', { class: 'muted', text: `This permanently deletes “${title}” and removes its uploaded files from storage. This cannot be undone.` }),
    'Delete forever', () => api('DELETE', `/items/${it.id}?permanent=1`), true);
}

/* ---------- EDIT: ce e publicat se pune in st (aceleasi campuri ca in ghid), apoi se deschide ecranul de editare ---------- */
function fromItem(list) {
  const it = list[0], m = S.mob(it.mob) || S.mobilities[0], s = blank();
  const cur = (key, extra = {}) => ({ current: true, key, ...extra });
  s.mob = m.id;
  if (it.type === 'media') {
    s.type = 'media';
    s.place = it.stop && m.stops.some(x => x.id === it.stop) ? it.stop : it.place ? 'custom' : 'none';
    s.customPlace = it.place || '';
    s.inGallery = it.gallery !== false; s.inMap = !!it.map;
    const caps = list.map(x => x.caption || ''), same = caps.every(c => c === caps[0]);
    s.caption = same ? caps[0] : '';
    if (!same) caps.forEach((c, i) => { s.caps[i] = c; });
    s.files.media = list.map(x => cur(x.key, { thumb: x.thumb, kind: x.kind, id: x.id }));
  } else if (it.type === 'story') {
    Object.assign(s, { type: 'story', day: it.day, dayFrom: it.days?.[0] ?? 0, dayTo: it.days?.[1] ?? 1, title: it.title, excerpt: it.excerpt || '', body: it.body, showAuthor: !!it.author });
    s.files.story = (it.photos || []).map(p => cur(p.key, { thumb: p.thumb, kind: 'photo' }));
  } else if (it.type === 'material') {
    s.type = 'material'; s.cat = it.cat;
    s.mat = it.slot ? 'slot' : 'new'; s.matTitle = it.title || '';
    s.slot = it.slot || '';
    MADE_BY.forEach((n, i) => { s.by[i] = (it.by || '').split(',').map(x => x.trim()).includes(n); });
    s.files.doc = [cur(it.key)];
  } else if (it.type === 'result') {
    Object.assign(s, { type: 'result', sec: it.sec, resText: it.text });
    if (it.key) s.files.res = [cur(it.key)];
  } else if (it.type === 'link') Object.assign(s, { type: 'link', where: it.where, linkTitle: it.title, url: it.url });
  else if (it.type === 'info') {
    Object.assign(s, { type: 'info', info: it.part, infoText: it.text || '' });
    if (it.key) s.files.info = [cur(it.key, { kind: it.part === 'photo' ? 'photo' : '' })];
  } else if (it.type === 'day') Object.assign(s, { type: 'places', dp: 'day', which: it.i, dDay: it.day, dDate: it.date, dTitle: it.title, dText: it.text });
  else Object.assign(s, { type: 'places', dp: 'place', which: it.id, sTitle: it.title, sWhen: it.when, sText: it.text });
  return s;
}
// la material, "slot" e titlul unui material deja listat pe pagina; in ghid il gasim dupa titlu
function fixSlot() {
  if (st.mat !== 'slot') return;
  const i = slots().indexOf(st.slot);
  if (i >= 0) st.mat = i;
  else { st.mat = 'new'; st.matTitle = st.slot; }
}
function startEdit(list, oneFile = false) {
  if (ui.mode === 'new' && st.type) ui.draft = true;   // draftul nou ramane pentru mai tarziu
  ui.saved = ui.mode === 'new' ? st : ui.saved;
  st = fromItem(list);
  // un material deja listat isi pierde locul gol de pe pagina cand primeste fisier; il punem inapoi, ca sa apara in lista
  if (st.type === 'material' && st.mat === 'slot') {
    const m = mob();
    if (!m.materials.some(x => x.cat === st.cat && x.title === st.slot && !x.file)) m.materials.push({ cat: st.cat, title: st.slot, by: '', file: '', fromEdit: true });
    fixSlot();
  }
  Object.assign(ui, { view: 'edit', mode: 'edit', step: 0, error: '', pvTab: 'gallery', q: '', edit: { items: list }, fileOnly: oneFile ? list[0].id : null, snap: snap() });
  render(false);
  root.querySelector('#up-q')?.focus({ preventScroll: true });
  toTop();
}
function backToList() {
  if (ui.mode !== 'new') { st = ui.saved || blank(); ui.saved = null; ui.mode = 'new'; ui.edit = null; ui.fileOnly = null; }
  ui.view = 'list'; ui.error = ''; ui.snap = null;
  render();
}

/* ---------- desenarea ---------- */
function homeHTML() {
  const me = session.me, admin = me.role === 'admin';
  const what = admin ? 'You can publish everything, manage what the team added and make access keys.'
    : isStaff() ? 'You can publish photos, stories and materials, and manage everything the team added.'
    : 'You can publish photos, stories and materials, and manage what you added.';
  const draft = ui.draft && st.type ? `<section class="glass card up-draft">
      <div><span class="tag y">Draft</span><b>${esc(TYPES.find(t => t.id === st.type).name)}${st.mob ? ' · ' + esc(mob().city) : ''}</b><p class="up-help">Kept while this page is open. A refresh clears it.</p></div>
      <div class="btn-row"><button type="button" class="btn glass" data-act="discard">Discard</button><button type="button" class="btn btn--solid" data-act="resume">Continue ${I.arrow}</button></div></section>` : '';
  const role = admin ? 'Admin' : isStaff() ? 'Teacher' : 'Student';
  const quick = TYPES.filter(t => !t.staff || isStaff());
  return `<section class="glass card up-me">
      <span class="up-ava up-ava--l" aria-hidden="true">${esc(initials(me.name))}</span>
      <div class="up-me-t"><span class="eyebrow">Signed in · ${role}</span><p class="h3 up-name">${esc(me.name)}</p><p class="up-help">${what}${DEMO ? ' <b class="tag y">Demo mode: nothing goes to the website</b>' : ''}</p></div>
      <div class="up-me-a"><button type="button" class="btn glass" data-act="logout">Log out</button>
      <button type="button" class="btn btn--solid up-big" data-act="new">${svg(ICON.up, 26)} Upload</button></div>
    </section>${draft}
    <section class="up-quick" aria-labelledby="up-quick-t"><div class="grp-h"><h2 class="grp-t" id="up-quick-t">What do you want to add?</h2><span class="small">Pick one to start</span></div>
      <div class="up-quick-row">${quick.map(t => `<button type="button" class="up-qcard" data-quick="${t.id}"><span class="up-tile-art">${art(ART[t.id])}</span><b>${esc(t.name)}</b>${t.staff ? '<em class="tag y">Staff</em>' : ''}</button>`).join('')}</div></section>
    <aside class="up-aside up-lists" aria-label="Uploads"></aside>`;
}
function busyHTML() {
  const pct = Math.round((ui.busy?.p || 0) * 100);
  return `<section class="glass up-publish up-busy" aria-live="polite"><span class="up-spin" aria-hidden="true">${svg(ICON.up, 28)}</span><div class="up-pub-txt"><div class="up-busy-top"><b>${esc(ui.busy?.text || 'Starting')}</b><span class="up-pct" aria-hidden="true">${pct}%</span></div>
    <div class="up-bar"><i style="width:${pct}%"></i></div><p class="up-help">Keep this page open until it is done.</p></div></section>`;
}
function doneHTML() {
  const d = ui.done || {};
  return `<section class="glass card up-done">
    <span class="up-done-ic" aria-hidden="true"><svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="28"/><path d="M20 33l8.5 8.500L45 24"/></svg></span>
    <span class="eyebrow">${d.saved ? 'Saved' : 'Done'}</span>
    <h2 class="outline up-done-t" tabindex="-1">${d.saved ? 'Changes saved' : 'Published'}</h2>
    <p class="lead">${esc(d.text || '')}</p>${d.warn ? `<p class="up-err">${esc(d.warn)}</p>` : ''}
    <div class="btn-row"><a class="btn btn--solid" href="${esc(d.href || 'index.html')}" data-site="1">View on site ${I.arrow}</a>
    <button type="button" class="btn glass" data-act="list">Back to your uploads</button></div></section>`;
}
function render(keepFocus = true) {
  const focus = keepFocus && document.activeElement?.closest?.('#uploadRoot') ? document.activeElement : null;
  const key = focus && (focus.id ? '#' + focus.id : focus.dataset.set ? `[data-set="${focus.dataset.set}"][data-v="${CSS.escape(focus.dataset.v)}"]` : focus.dataset.act ? `[data-act="${focus.dataset.act}"]` : focus.dataset.tog ? `[data-tog="${focus.dataset.tog}"]` : focus.dataset.by ? `[data-by="${focus.dataset.by}"]` : '');
  const pos = focus && 'selectionStart' in focus && focus.type !== 'checkbox' ? [focus.selectionStart, focus.selectionEnd] : null;
  const scrolls = [...root.querySelectorAll('.h-scroll')].map(x => x.scrollLeft);
  if (ui.view === 'list') { root.innerHTML = homeHTML(); renderLists(); }
  else if (ui.view === 'wizard') root.innerHTML = wizardHTML();
  else if (ui.view === 'edit') root.innerHTML = editHTML();
  else if (ui.view === 'busy') root.innerHTML = busyHTML();
  else if (ui.view === 'done') root.innerHTML = doneHTML();
  root.querySelectorAll('.h-scroll').forEach((x, i) => { if (scrolls[i]) x.scrollLeft = scrolls[i]; });
  root.querySelectorAll('.up-dd-slot[data-dds]').forEach(slot => {   // From / To la un articol de mai multe zile
    const k = slot.dataset.dds, m = mob(), all = m.days.map((d, i) => [i, [real(d.day) || 'Day ' + (i + 1), real(d.date)].filter(Boolean).join(' · ')]);
    const options = k === 'dayTo' ? all.filter(([i]) => i > st.dayFrom) : all.slice(0, -1);
    slot.replaceWith(dropdown({ id: 'up-' + k, label: k === 'dayFrom' ? 'From' : 'To', options, value: st[k], onChange: v => {
      st[k] = v;
      if (k === 'dayFrom' && st.dayTo <= v) st.dayTo = Math.min(v + 1, m.days.length - 1);
      render(); root.querySelector('#up-' + k)?.focus({ preventScroll: true });
    } }));
  });
  root.querySelectorAll('.up-dd-slot[data-dde]').forEach(slot => {   // selectoarele din ecranul de editare
    const k = slot.dataset.dde, o = edOptions(k);
    slot.replaceWith(dropdown({ id: 'up-' + k, label: o.label, options: o.options, value: o.value, onChange: v => { o.set(v); render(); root.querySelector('#up-' + k)?.focus({ preventScroll: true }); } }));
  });
  root.querySelectorAll('.seg').forEach(s => U.segPill(s));
  if (key) { const n = root.querySelector(key); if (n) { n.focus({ preventScroll: true }); if (pos) try { n.setSelectionRange(pos[0], pos[1]); } catch (e) {} } }
}
// daca ai derulat mai jos de inceputul ghidului, urci la el
function toTop() { const top = root.getBoundingClientRect().top + scrollY - 110; if (scrollY > top) scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
function goStep(i) {
  ui.step = i; ui.error = ''; ui.q = '';
  render(false);
  root.querySelector('.up-body')?.classList.add('up-in');   // continutul pasului nou apare de jos (doar la schimbarea pasului, nu la fiecare redesenare)
  const q = root.querySelector('#up-q');
  if (q) { q.focus({ preventScroll: true }); toTop(); }
}
function app() { ui.view = 'list'; render(false); mine(); }
function gate(note = '') {
  ui.view = 'login';
  root.innerHTML = `
  <form class="glass card up-gate" novalidate>
    <div class="up-head"><span class="eyebrow">Project team only</span><h2 class="h3 up-h">Enter your access key</h2></div>
    <p class="muted">You got a key from your teacher. You enter it once, then this device stays signed in.</p>
    ${DEMO ? '<p class="up-help"><b class="tag y">Demo mode</b> Any key works. A key with “admin” in it signs you in as admin, one with “prof” as a teacher.</p>' : ''}
    <div class="up-field"><label class="up-label" for="up-key">Access key</label><input class="up-input" id="up-key" type="password" autocomplete="off" maxlength="200" placeholder="Your key" required></div>
    <div class="up-field"><label class="up-label" for="up-who">Your name</label><input class="up-input" id="up-who" type="text" autocomplete="name" maxlength="60" placeholder="First and last name" required>
      <p class="up-help">Only the website team sees who uploaded what.</p></div>
    <p class="up-help up-gerr" role="alert"></p>
    <button type="submit" class="btn btn--solid">Unlock ${I.arrow}</button>
  </form>`;
  const form = root.querySelector('.up-gate'), err = form.querySelector('.up-gerr');
  err.textContent = note;
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
  const want = { media: ['image', 'video'], story: ['image'], doc: ['doc', 'image', 'video'], res: ['doc', 'image', 'video'], info: st.info === 'photo' ? ['image'] : ['doc'] }[slot];
  const multiple = slot === 'media' || slot === 'story', bad = [];
  for (const file of fileList) {
    const kind = kindOf(file);
    if (!want.includes(kind)) bad.push(`${file.name}: this kind of file does not go here`);
    else if (file.size > LIMIT[kind]) bad.push(`${file.name}: too big (${size(file.size)}, the limit is ${size(LIMIT[kind])})${kind === 'video' ? '. Make the clip shorter or export it at 1080p.' : ''}`);
    else if (multiple) st.files[slot].push({ file }); else st.files[slot] = [{ file }];
  }
  ui.error = bad.join(' · ');
  render();
}
let autoT = 0;
signal.addEventListener('abort', () => clearTimeout(autoT));
root.addEventListener('click', e => {
  const t = e.target.closest('button, a[data-site]');
  if (!t || !root.contains(t) || ui.busy || ui.view === 'login') return;
  const list = steps(), i = Math.min(ui.step, list.length - 1), id = list[i];
  if (t.dataset.set) {
    const name = t.dataset.set, v = t.dataset.v, numeric = ['day', 'sec', 'where'].includes(name) || (name === 'mat' && v !== 'new') || (name === 'which' && st.dp === 'day' && v !== 'new');
    const val = numeric ? +v : v, changed = st[name] !== val;
    st[name] = val; ui.error = '';
    if (changed) {
      if (name === 'type') { const keep = { type: st.type, mob: st.mob }; st = { ...blank(), ...keep }; }
      if (name === 'mob') Object.assign(st, { place: null, day: null, mat: null, which: null, inGallery: false, inMap: false });
      if (name === 'cat') st.mat = null;
      if (name === 'day' && val === -1) { st.dayFrom = 0; st.dayTo = Math.min(1, mob().days.length - 1); }
      if (name === 'info') { st.files.info = []; const a = mob().about; st.infoText = st.info === 'goals' ? a.goals.filter(real).join('\n') : st.info === 'groups' ? real(a.groups) : st.info === 'text' ? real(a.text) : ''; }
      if (name === 'dp') st.which = null;
      if (name === 'which') {
        const m = mob();
        if (st.dp === 'day') { const d = st.which === 'new' ? {} : m.days[st.which] || {}; Object.assign(st, { dDay: real(d.day) || (st.which === 'new' ? '' : 'Day ' + (st.which + 1)), dDate: real(d.date), dTitle: real(d.title), dText: real(d.text) }); }
        else { const s = m.stops.find(x => x.id === st.which) || {}; Object.assign(st, { sTitle: real(s.title), sWhen: real(s.when), sText: real(s.text), sLoc: '' }); }
      }
    }
    render();
    // pas cu un singur raspuns si fara alt camp de completat: mergi singur mai departe, dupa ce se vede ce ai ales
    const alone = !(name === 'day' && val === -1) && !(name === 'mat' && val === 'new') && !(name === 'place' && val === 'custom');
    clearTimeout(autoT);
    if (AUTO_NEXT && alone && ui.mode !== 'edit' && id !== 'preview' && canNext(id)) autoT = setTimeout(() => {
      if (ui.view === 'wizard' && !ui.busy && Math.min(ui.step, steps().length - 1) === i && steps()[i] === id && canNext(id)) goStep(i + 1);
    }, 340);
  } else if (t.dataset.tog) { st[t.dataset.tog] = !st[t.dataset.tog]; render(); }
  else if (t.dataset.by) { st.by[+t.dataset.by] = !st.by[+t.dataset.by]; render(); }
  else if (t.dataset.goto) { if (+t.dataset.goto < i) goStep(+t.dataset.goto); }
  else if (t.dataset.quick) { st = { ...blank(), type: t.dataset.quick }; ui.draft = false; Object.assign(ui, { view: 'wizard', mode: 'new', step: 1, error: '', edit: null, fileOnly: null, q: '' }); render(false); root.querySelector('#up-q')?.focus({ preventScroll: true }); toTop(); }
  else if (t.dataset.pvtab) { ui.pvTab = t.dataset.pvtab; render(); }
  else if (t.classList.contains('up-pick')) t.parentElement.querySelector('input[type=file]').click();
  else if (t.dataset.zoom) { const [slot, n] = t.dataset.zoom.split(':'); zoomFiles(slot, +n); }
  else if (t.dataset.cover) { const f = st.files.story.splice(+t.dataset.cover, 1)[0]; st.files.story.unshift(f); render(false); root.querySelector('.up-files .tag.y')?.closest('li')?.querySelector('.up-file-n b') && root.querySelector('[data-cover]')?.focus({ preventScroll: true }); }
  else if (t.dataset.rm) { const [slot, n] = t.dataset.rm.split(':'); st.files[slot].splice(+n, 1); st.caps = {}; render(false); }
  else if (t.dataset.site) { /* link catre site: il lasam sa mearga */ }
  else switch (clearTimeout(autoT), t.dataset.act) {
    case 'new': st = blank(); ui.draft = false; Object.assign(ui, { view: 'wizard', mode: 'new', step: 0, error: '', edit: null, fileOnly: null, q: '' }); render(false); root.querySelector('#up-q')?.focus({ preventScroll: true }); toTop(); break;
    case 'resume': Object.assign(ui, { view: 'wizard', mode: 'new', step: 0, error: '' }); render(false); root.querySelector('#up-q')?.focus({ preventScroll: true }); toTop(); break;
    case 'discard': st = blank(); ui.draft = false; render(false); break;
    case 'logout': api('POST', '/logout').catch(() => {}); forget(); items = keys = newKey = null; trash = []; storage = cloud = null; st = blank(); ui.draft = false; gate(); break;
    case 'list': ui.done = null; backToList(); break;
    case 'next':
      if (!canNext(id)) return;
      if (id === 'preview') go(); else goStep(i + 1);
      break;
    case 'skip': Object.assign(st, SKIP[id] || {}); if (id === 'photos') st.files.story = []; if (id === 'resFile') st.files.res = []; goStep(i + 1); break;
    case 'back':
      if (ui.mode === 'edit' || i === 0) { if (ui.mode === 'new' && st.type) ui.draft = true; backToList(); }
      else goStep(i - 1);
      break;
    case 'ed-save': if (canSave() && dirty()) go(); break;
    case 'ed-close':
      if (!dirty()) backToList();
      else dialog('Discard changes?', el('p', { class: 'muted', text: 'If you leave now, what you changed is not saved.' }), 'Discard', async () => backToList(), true, { cancelText: 'Keep editing', refresh: false });
      break;
    case 'ed-delete': { const its = ui.edit.items; remove(its, its.length > 1 ? 'This set' : describe(its[0])[1], !!ui.fileOnly, backToList); break; }
  }
});
root.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f) {
    st[t.dataset.f] = t.value;
    if (t.dataset.f === 'sLoc') { const h = root.querySelector('[data-help="sLoc"]'); if (h) h.textContent = locHelp(); }
    if (t.dataset.f === 'url') { const h = root.querySelector('[data-help="url"]'); if (h) h.textContent = st.url && !validUrl(st.url) ? 'Paste the full link, starting with https://' : ''; }
    if (t.dataset.f === 'url' || t.dataset.f === 'linkTitle') { const pv = root.querySelector('[data-linkpv]'); if (pv) pv.innerHTML = linkPv(); }
    const cnt = root.querySelector(`[data-cnt="${t.dataset.f}"]`); if (cnt) cnt.textContent = `${t.value.length} / ${cnt.dataset.max}`;
    refreshNext();
    if (ui.view === 'edit') refreshEdit();
  } else if (t.dataset.cap) { st.caps[+t.dataset.cap] = t.value; if (ui.view === 'edit') refreshEdit(); }
  else if (t.dataset.q) { ui.q = t.value; render(); }
});
root.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.c) { if (t.dataset.c.startsWith('by:')) st.by[+t.dataset.c.slice(3)] = t.checked; else st[t.dataset.c] = t.checked; refreshNext(); }
  else if (t.dataset.file) addFiles(t.dataset.file, [...t.files]);
});
root.addEventListener('keydown', e => {   // Enter intr-un camp de un rand = Next
  if (e.key === 'Enter' && e.target.matches?.('input.up-input[data-f]')) { e.preventDefault(); root.querySelector('[data-act="next"]:not([disabled])')?.click(); }
});
for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) root.addEventListener(type, e => {
  const zone = e.target.closest?.('.up-drop'); if (!zone || !zone.dataset.drop) return;
  e.preventDefault();
  zone.classList.toggle('over', type === 'dragenter' || type === 'dragover');
  if (type === 'drop' && !ui.busy) addFiles(zone.dataset.drop, [...e.dataTransfer.files]);
});
// dupa ce ai publicat ceva, celelalte pagini se reincarca de pe server, ca sa vezi ce ai urcat
let stale = false;
document.addEventListener('click', e => {
  if (!stale || DEMO || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest?.('a[href]');
  if (!a || a.target || a.origin !== location.origin || a.getAttribute('href').startsWith('#')) return;
  e.preventDefault(); e.stopImmediatePropagation(); location.assign(a.href);
}, { capture: true, signal });
addEventListener('beforeunload', e => { if (ui.busy) { e.preventDefault(); e.returnValue = ''; } }, { signal });

if (location.protocol === 'file:' && !DEMO) { root.innerHTML = '<p class="glass note">Upload works on the website itself, not when the page is opened from a folder on the computer. To see how it looks, open <a href="upload.html?demo">upload.html?demo</a>.</p>'; return; }
if (!session) { gate(); return; }
app();
// verifica la server ca accesul salvat mai e bun (parola poate fi anulata intre timp)
api('GET', '/me').then(r => { session.me = r.me; try { localStorage.setItem(STORE, JSON.stringify(session)); } catch (e) {} if (ui.view === 'list') render(false); }).catch(() => {});
};
