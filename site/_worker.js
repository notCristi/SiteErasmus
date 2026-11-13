/* =========================================================
   Erasmus+ · partea de server a sectiunii UPLOAD
   Ruleaza pe Cloudflare Pages (advanced mode): fisierul trebuie sa stea in radacina site-ului publicat.
   Are nevoie de trei lucruri legate de proiectul Pages (Settings > Bindings / Variables and Secrets):
     DB         = baza de date D1   (cine a urcat ce; parolele, doar ca amprenta)
     MEDIA      = bucket-ul R2      (pozele, video-urile, fisierele)
     ADMIN_KEY  = secret            (parola ta de admin, minimum 10 caractere)
   Fara ele site-ul merge normal, doar UPLOAD spune ca nu e inca pornit.
   Parolele nu ajung niciodata in paginile site-ului: se verifica doar aici.
   ========================================================= */

const MB = 1024 * 1024;
const MAX = { image: 25 * MB, video: 300 * MB, doc: 100 * MB };   // marimea maxima a unui fisier
const PART = 20 * MB;                                            // fisierele mari urca in bucati de atat
const DAY_BYTES = 10 * 1024 * MB;                                // cat poate urca un dispozitiv in 24 de ore
const DAY_BYTES_KEY = 40 * 1024 * MB;                            // ...si cat pot urca, impreuna, toti cei cu aceeasi parola
const FILES = {
  jpg: ['image/jpeg', 'image'], jpeg: ['image/jpeg', 'image'], png: ['image/png', 'image'], webp: ['image/webp', 'image'],
  mp4: ['video/mp4', 'video'], m4v: ['video/mp4', 'video'], mov: ['video/quicktime', 'video'], webm: ['video/webm', 'video'],
  pdf: ['application/pdf', 'doc'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'doc'], ppt: ['application/vnd.ms-powerpoint', 'doc'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc'], doc: ['application/msword', 'doc'],
};
const MOBS = ['ro', 'fr', 'dk'];
const STAFF_TYPES = ['info', 'day', 'stop'];        // doar profesorii si adminul: inlocuiesc un text care exista deja
const TYPES = ['media', 'story', 'material', 'result', 'link', ...STAFF_TYPES];
const TRIES = 8, TRY_WINDOW = 15 * 60 * 1000;       // 8 parole gresite de pe aceeasi adresa = pauza 15 minute

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS keys (id TEXT PRIMARY KEY, label TEXT NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, key_id TEXT, role TEXT NOT NULL, name TEXT NOT NULL, adm TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, type TEXT NOT NULL, mob TEXT NOT NULL, skey TEXT, data TEXT NOT NULL, device_id TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS items_live ON items (deleted, created)`,
  `CREATE INDEX IF NOT EXISTS items_device ON items (device_id, deleted)`,
  `CREATE TABLE IF NOT EXISTS files (key TEXT PRIMARY KEY, device_id TEXT NOT NULL, size INTEGER NOT NULL, cls TEXT NOT NULL, name TEXT, upload_id TEXT, created INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS files_device ON files (device_id, created)`,
  `CREATE TABLE IF NOT EXISTS attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS attempts_ip ON attempts (ip, ts)`,
];
let schemaReady = null;
function ready(env) {
  if (!schemaReady) schemaReady = env.DB.batch(SCHEMA.map(q => env.DB.prepare(q))).catch(e => { schemaReady = null; throw e; });
  return schemaReady;
}

/* ---------- unelte mici ---------- */
class Bad extends Error { constructor(code, status = 400) { super(code); this.code = code; this.status = status; } }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const rand = bytes => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const adminHash = env => sha256('erasmus-admin:' + env.ADMIN_KEY);
const adminOn = env => typeof env.ADMIN_KEY === 'string' && env.ADMIN_KEY.length >= 10;
const staff = dev => dev.role === 'admin' || dev.role === 'teacher';
async function body(request, max = 200 * 1024) {
  const text = await request.text();
  if (text.length > max) throw new Bad('too_large', 413);
  try { const v = JSON.parse(text); if (v && typeof v === 'object') return v; } catch (e) {}
  throw new Bad('bad_json');
}
// text curat: fara caractere de control, taiat la lungimea maxima
function str(v, max, { req = false, lines = false } = {}) {
  let s = typeof v === 'string' ? v : '';
  s = s.replace(lines ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ').replace(/\r/g, '').trim().slice(0, max);
  if (req && !s) throw new Bad('missing_field');
  return s;
}
const int = (v, min, max, def) => (Number.isInteger(v) && v >= min && v <= max ? v : def);
const num = (v, min, max) => { const n = typeof v === 'number' ? v : NaN; if (!(n >= min && n <= max)) throw new Bad('bad_number'); return Math.round(n * 1e6) / 1e6; };
const fileKey = v => (typeof v === 'string' && /^(image|video|doc)\/\d{4}-\d{2}\/[a-f0-9]{24}\.[a-z0-9]{2,5}$/.test(v) ? v : '');
const ext = name => (/\.([a-z0-9]{2,5})$/i.exec(name || '') || [])[1]?.toLowerCase() || '';

/* ---------- cine face cererea ---------- */
async function auth(request, env) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '');
  if (!m) return null;
  const dev = await env.DB.prepare(
    `SELECT d.id, d.key_id, d.role, d.name, d.adm, d.seen, k.active AS k_active, k.label AS k_label
     FROM devices d LEFT JOIN keys k ON k.id = d.key_id WHERE d.token_hash = ?`).bind(await sha256(m[1])).first();
  if (!dev) return null;
  if (dev.role === 'admin') { if (!adminOn(env) || dev.adm !== await adminHash(env)) return null; }   // parola de admin schimbata = toti adminii ies
  else if (!dev.k_active) return null;                                                                 // parola anulata = toti cei cu ea ies
  if (Date.now() - dev.seen > 6 * 3600 * 1000) await env.DB.prepare('UPDATE devices SET seen = ? WHERE id = ?').bind(Date.now(), dev.id).run();
  return dev;
}
const me = dev => ({ id: dev.id, role: dev.role, name: dev.name, label: dev.role === 'admin' ? 'Admin' : dev.k_label });

async function login(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'local', now = Date.now();
  const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM attempts WHERE ip = ? AND ts > ?').bind(ip, now - TRY_WINDOW).first('n');
  if (fails >= TRIES) throw new Bad('too_many_tries', 429);
  const b = await body(request, 2000);
  const key = typeof b.key === 'string' ? b.key.trim().slice(0, 200) : '';
  const name = str(b.name, 60);
  if (!key || name.length < 2) throw new Bad('missing_field');
  let role = '', keyId = null, label = 'Admin', adm = null;
  if (adminOn(env) && await sha256('cmp:' + key) === await sha256('cmp:' + env.ADMIN_KEY)) { role = 'admin'; adm = await adminHash(env); }
  else {
    const { results } = await env.DB.prepare('SELECT id, label, role, salt, hash FROM keys WHERE active = 1').all();
    for (const k of results) if (await sha256(k.salt + ':' + key) === k.hash) { role = k.role; keyId = k.id; label = k.label; break; }
  }
  if (!role) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO attempts (ip, ts) VALUES (?, ?)').bind(ip, now),
      env.DB.prepare('DELETE FROM attempts WHERE ts < ?').bind(now - 24 * 3600 * 1000),
    ]);
    throw new Bad('wrong_key', 401);
  }
  const token = rand(32), id = rand(8);
  await env.DB.prepare('INSERT INTO devices (id, token_hash, key_id, role, name, adm, created, seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, await sha256(token), keyId, role, name, adm, now, now).run();
  return json({ token, me: { id, role, name, label } });
}

/* ---------- fisierele (R2) ---------- */
function describe(url) {
  const name = str(url.searchParams.get('name'), 120), e = ext(name), def = FILES[e];
  const size = Number(url.searchParams.get('size'));
  if (!def) throw new Bad('file_type');
  if (!(size > 0)) throw new Bad('bad_size');
  if (size > MAX[def[1]]) throw new Bad('file_too_big', 413);
  const d = new Date();
  return { name, size, type: def[0], cls: def[1], key: `${def[1]}/${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}/${rand(12)}.${e}` };
}
const r2meta = f => ({ httpMetadata: { contentType: f.type }, customMetadata: { name: f.name } });
async function quota(env, dev, size) {
  const used = await env.DB.prepare('SELECT COALESCE(SUM(size), 0) AS n FROM files WHERE device_id = ? AND created > ?').bind(dev.id, Date.now() - 24 * 3600 * 1000).first('n');
  if (used + size > DAY_BYTES) throw new Bad('daily_limit', 429);
  if (dev.key_id) {
    const all = await env.DB.prepare('SELECT COALESCE(SUM(f.size), 0) AS n FROM files f JOIN devices d ON d.id = f.device_id WHERE d.key_id = ? AND f.created > ?').bind(dev.key_id, Date.now() - 24 * 3600 * 1000).first('n');
    if (all + size > DAY_BYTES_KEY) throw new Bad('daily_limit', 429);
  }
}
async function putFile(request, env, dev, url) {
  const f = describe(url);
  if (f.size > 95 * MB) throw new Bad('use_parts', 413);
  await quota(env, dev, f.size);
  const obj = await env.MEDIA.put(f.key, request.body, r2meta(f));
  if (obj.size > MAX[f.cls]) { await env.MEDIA.delete(f.key); throw new Bad('file_too_big', 413); }
  await env.DB.prepare('INSERT INTO files (key, device_id, size, cls, name, created) VALUES (?, ?, ?, ?, ?, ?)').bind(f.key, dev.id, obj.size, f.cls, f.name, Date.now()).run();
  return json({ key: f.key, size: obj.size });
}
async function partsStart(env, dev, url) {
  const f = describe(url);
  await quota(env, dev, f.size);
  const up = await env.MEDIA.createMultipartUpload(f.key, r2meta(f));
  await env.DB.prepare('INSERT INTO files (key, device_id, size, cls, name, upload_id, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(f.key, dev.id, f.size, f.cls, f.name, up.uploadId, Date.now()).run();
  return json({ key: f.key, uploadId: up.uploadId, partSize: PART });
}
async function pending(env, dev, url) {
  const key = fileKey(url.searchParams.get('key'));
  const row = key && await env.DB.prepare('SELECT * FROM files WHERE key = ? AND device_id = ? AND upload_id IS NOT NULL').bind(key, dev.id).first();
  if (!row) throw new Bad('no_upload', 404);
  return { row, up: env.MEDIA.resumeMultipartUpload(row.key, row.upload_id) };
}
async function partsPut(request, env, dev, url) {
  const { row, up } = await pending(env, dev, url);
  const n = Number(url.searchParams.get('n'));
  if (!Number.isInteger(n) || n < 1 || n > Math.ceil(MAX[row.cls] / PART) + 1) throw new Bad('bad_part');
  if (Number(request.headers.get('content-length')) > PART + MB) throw new Bad('part_too_big', 413);
  const part = await up.uploadPart(n, request.body);
  return json({ partNumber: part.partNumber, etag: part.etag });
}
async function partsDone(request, env, dev, url) {
  const { row, up } = await pending(env, dev, url);
  const b = await body(request, 20000);
  const parts = (Array.isArray(b.parts) ? b.parts : []).map(p => ({ partNumber: int(p.partNumber, 1, 1000, 0), etag: str(p.etag, 400) })).filter(p => p.partNumber && p.etag);
  if (!parts.length) throw new Bad('bad_part');
  const obj = await up.complete(parts);
  if (obj.size > MAX[row.cls]) {
    await env.MEDIA.delete(row.key); await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(row.key).run();
    throw new Bad('file_too_big', 413);
  }
  await env.DB.prepare('UPDATE files SET upload_id = NULL, size = ? WHERE key = ?').bind(obj.size, row.key).run();
  return json({ key: row.key, size: obj.size });
}
async function partsAbort(env, dev, url) {
  const { row, up } = await pending(env, dev, url);
  await up.abort().catch(() => {});
  await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(row.key).run();
  return json({ ok: true });
}
async function dropFiles(env, keys) {
  keys = keys.filter(Boolean);
  if (!keys.length) return;
  await env.MEDIA.delete(keys);
  await env.DB.batch(keys.map(k => env.DB.prepare('DELETE FROM files WHERE key = ?').bind(k)));
}
// pozele si fisierele se dau direct din R2; se pastreaza in browser un an (numele lor nu se repeta niciodata)
async function media(request, env, key) {
  if (!fileKey(key)) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('cache-control', 'public, max-age=31536000, immutable');
  h.set('accept-ranges', 'bytes');
  h.set('x-content-type-options', 'nosniff');
  const type = (FILES[ext(key)] || [])[0] || 'application/octet-stream';
  h.set('content-type', type);
  if (key.startsWith('doc/')) {   // PDF-ul se deschide in pagina; PowerPoint si Word se descarca, cu numele lor
    const name = (obj.customMetadata?.name || key.split('/').pop()).replace(/[^\w. ()\-]+/g, '_');
    h.set('content-disposition', `${type === 'application/pdf' ? 'inline' : 'attachment'}; filename="${name}"`);
  }
  if (!obj.body) return new Response(null, { status: 304, headers: h });
  if (request.headers.has('range') && obj.range) {
    const r = obj.range, start = r.offset ?? (r.suffix !== undefined ? Math.max(0, obj.size - r.suffix) : 0);
    const length = Math.min(r.length ?? obj.size - start, obj.size - start);
    if (length < obj.size) {
      h.set('content-range', `bytes ${start}-${start + length - 1}/${obj.size}`);
      h.set('content-length', String(length));
      return new Response(obj.body, { status: 206, headers: h });
    }
  }
  h.set('content-length', String(obj.size));
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers: h });
}

/* ---------- continutul: ce are voie sa fie in fiecare fel de intrare ----------
   Tot ce vine din formular trece pe aici. Ce nu e in lista de mai jos se arunca. */
function clean(type, d, old) {
  const keys = [];
  const key = (v, cls) => { const k = fileKey(v); if (!k || (cls && !k.startsWith(cls + '/'))) return ''; keys.push(k); return k; };
  const kept = (name, cls) => (old ? (old[name] ? key(old[name], cls) : '') : key(d[name], cls));   // la editare, fisierele raman cele vechi
  let data, skey = null;
  if (type === 'media') {
    const k = kept('key'); if (!k) throw new Bad('missing_file');
    const video = k.startsWith('video/');
    if (!video && !k.startsWith('image/')) throw new Bad('file_type');
    data = { kind: video ? 'video' : 'photo', key: k, thumb: kept('thumb', 'image'), caption: str(d.caption, 200),
      stop: /^[a-z0-9-]{1,40}$/.test(d.stop || '') ? d.stop : '', place: str(d.place, 80),
      gallery: d.gallery !== false, map: d.map !== false, w: int(old ? old.w : d.w, 1, 20000, 0), h: int(old ? old.h : d.h, 1, 20000, 0) };
  } else if (type === 'story') {
    const photos = (old ? old.photos || [] : Array.isArray(d.photos) ? d.photos.slice(0, 40) : []).map((p, i) => ({
      key: key(p.key, 'image'), thumb: key(p.thumb, 'image'),
      caption: str(old && Array.isArray(d.photos) && d.photos[i] ? d.photos[i].caption : p.caption, 200) })).filter(p => p.key);
    data = { day: int(d.day, -1, 30, -1), title: str(d.title, 120, { req: true }), excerpt: str(d.excerpt, 300),
      body: str(d.body, 20000, { req: true, lines: true }), author: str(d.author, 60), photos };
  } else if (type === 'material') {
    const k = kept('key', 'doc'); if (!k) throw new Bad('missing_file');
    data = { cat: ['a', 'b', 'c', 'd'].includes(d.cat) ? d.cat : 'a', slot: str(d.slot, 160), title: str(d.title, 160), by: str(d.by, 120), key: k };
    if (!data.slot && !data.title) throw new Bad('missing_field');
  } else if (type === 'result') {
    data = { sec: int(d.sec, 0, 4, 0), text: str(d.text, 4000, { req: true, lines: true }), key: kept('key', 'doc') };
  } else if (type === 'link') {
    const url = str(d.url, 500, { req: true });
    let ok = false; try { ok = ['http:', 'https:'].includes(new URL(url).protocol); } catch (e) {}
    if (!ok) throw new Bad('bad_link');
    data = { where: int(d.where, 0, 3, 0), title: str(d.title, 160, { req: true }), url };
  } else if (type === 'info') {
    const part = ['programme', 'photo', 'text', 'goals', 'groups'].includes(d.part) ? d.part : '';
    if (!part) throw new Bad('missing_field');
    data = { part };
    if (part === 'programme') { data.key = kept('key', 'doc'); if (!data.key.endsWith('.pdf')) throw new Bad('file_type'); }
    else if (part === 'photo') { data.key = kept('key', 'image'); if (!data.key) throw new Bad('missing_file'); }
    else data.text = str(d.text, 3000, { req: true, lines: true });
    skey = part;
  } else if (type === 'day') {
    data = { i: int(d.i, 0, 30, -1), day: str(d.day, 30, { req: true }), date: str(d.date, 40), title: str(d.title, 120, { req: true }), text: str(d.text, 600, { lines: true }) };
    if (data.i < 0) throw new Bad('missing_field');
    skey = 'day-' + data.i;
  } else if (type === 'stop') {
    const id = /^[a-z0-9-]{1,40}$/.test(d.id || '') ? d.id : '';
    if (!id) throw new Bad('missing_field');
    data = { id, title: str(d.title, 120, { req: true }), when: str(d.when, 60), text: str(d.text, 600, { lines: true }) };
    if (d.lat !== undefined && d.lat !== null && d.lat !== '') { data.lat = num(d.lat, -90, 90); data.lon = num(d.lon, -180, 180); }
    skey = 'stop-' + id;
  } else throw new Bad('bad_type');
  return { data, skey, keys };
}
const itemKeys = data => [data.key, data.thumb, ...(data.photos || []).flatMap(p => [p.key, p.thumb])].filter(Boolean);
const purge = (ctx, request) => ctx.waitUntil(caches.default.delete(new Request(new URL('/api/content.js', request.url))).catch(() => {}));

async function createItem(request, env, ctx, dev) {
  const b = await body(request);
  const type = TYPES.includes(b.type) ? b.type : '', mob = MOBS.includes(b.mob) ? b.mob : '';
  if (!type || !mob) throw new Bad('missing_field');
  if (STAFF_TYPES.includes(type) && !staff(dev)) throw new Bad('not_allowed', 403);
  const { data, skey, keys } = clean(type, b.data || {});
  if (keys.length) {   // fisierele trebuie sa fi fost urcate de acelasi dispozitiv, prin acest server
    const { results } = await env.DB.prepare(`SELECT key, device_id FROM files WHERE upload_id IS NULL AND key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
    if (results.length !== new Set(keys).size || results.some(r => r.device_id !== dev.id)) throw new Bad('unknown_file');
  }
  const now = Date.now(), id = rand(8);
  if (skey) {   // un singur text / fisier de felul asta pe mobilitate: cel vechi iese
    const { results } = await env.DB.prepare('SELECT id, data FROM items WHERE deleted = 0 AND type = ? AND mob = ? AND skey = ?').bind(type, mob, skey).all();
    for (const r of results) {
      await env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE id = ?').bind(now, r.id).run();
      await dropFiles(env, itemKeys(JSON.parse(r.data)));
    }
  }
  await env.DB.prepare('INSERT INTO items (id, type, mob, skey, data, device_id, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, type, mob, skey, JSON.stringify(data), dev.id, now, now).run();
  purge(ctx, request);
  return json({ id, type, mob, t: now, ...data });
}
async function ownItem(env, dev, id) {
  const row = /^[a-f0-9]{16}$/.test(id) && await env.DB.prepare('SELECT * FROM items WHERE id = ? AND deleted = 0').bind(id).first();
  if (!row) throw new Bad('not_found', 404);
  if (row.device_id !== dev.id && !staff(dev)) throw new Bad('not_allowed', 403);
  return row;
}
async function editItem(request, env, ctx, dev, id) {
  const row = await ownItem(env, dev, id), b = await body(request);
  const { data, skey } = clean(row.type, b.data || {}, JSON.parse(row.data));
  if (skey !== row.skey) throw new Bad('not_allowed', 403);
  const mob = MOBS.includes(b.mob) && !row.skey ? b.mob : row.mob;
  await env.DB.prepare('UPDATE items SET data = ?, mob = ?, updated = ? WHERE id = ?').bind(JSON.stringify(data), mob, Date.now(), id).run();
  purge(ctx, request);
  return json({ id, type: row.type, mob, t: row.created, ...data });
}
async function deleteItem(request, env, ctx, dev, id) {
  const row = await ownItem(env, dev, id);
  await env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE id = ?').bind(Date.now(), id).run();
  await dropFiles(env, itemKeys(JSON.parse(row.data)));
  purge(ctx, request);
  return json({ ok: true });
}
const pub = r => ({ id: r.id, type: r.type, mob: r.mob, t: r.created, ...JSON.parse(r.data) });
// ce vede toata lumea: fara nume, fara dispozitive
async function content(request, env, ctx, asScript) {
  const cacheKey = new Request(new URL('/api/content.js', request.url));
  let items;
  const hit = await caches.default.match(cacheKey).catch(() => null);
  if (hit) items = await hit.text();
  else {
    const { results } = await env.DB.prepare('SELECT id, type, mob, data, created FROM items WHERE deleted = 0 ORDER BY created ASC LIMIT 5000').all();
    items = JSON.stringify(results.map(pub));
    ctx.waitUntil(caches.default.put(cacheKey, new Response(items, { headers: { 'cache-control': 'public, max-age=20' } })).catch(() => {}));
  }
  return asScript
    ? new Response(`window.CLOUD=${items.replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16))};`, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' } })
    : new Response(items, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
// lista din UPLOAD: ale tale; profesorii si adminul le vad pe toate; doar adminul vede si cine le-a urcat
async function mine(env, dev) {
  const q = staff(dev)
    ? env.DB.prepare(`SELECT i.*, d.name AS by_name, k.label AS by_label FROM items i LEFT JOIN devices d ON d.id = i.device_id LEFT JOIN keys k ON k.id = d.key_id WHERE i.deleted = 0 ORDER BY i.created DESC LIMIT 400`)
    : env.DB.prepare('SELECT * FROM items WHERE deleted = 0 AND device_id = ? ORDER BY created DESC LIMIT 400').bind(dev.id);
  const { results } = await q.all();
  return json({ items: results.map(r => ({ ...pub(r), own: r.device_id === dev.id,
    ...(dev.role === 'admin' ? { uploader: r.device_id === dev.id ? 'You' : `${r.by_name || '?'} · ${r.by_label || 'Admin'}` } : {}) })) });
}

/* ---------- adminul: parolele ---------- */
async function adminKeys(env) {
  const { results } = await env.DB.prepare(
    `SELECT k.id, k.label, k.role, k.active, k.created, (SELECT COUNT(*) FROM devices d WHERE d.key_id = k.id) AS devices,
       (SELECT GROUP_CONCAT(name, ', ') FROM (SELECT DISTINCT name FROM devices d WHERE d.key_id = k.id LIMIT 40)) AS names
     FROM keys k ORDER BY k.created DESC`).all();
  return json({ keys: results });
}
async function adminNewKey(request, env) {
  const b = await body(request, 2000);
  const label = str(b.label, 60, { req: true }), role = b.role === 'teacher' ? 'teacher' : 'student';
  let key = typeof b.key === 'string' ? b.key.trim() : '';
  if (key && key.length < 8) throw new Bad('key_too_short');
  if (!key) {   // o parola usor de dictat: ELEVI-7F3K-Q2M9
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', pick = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => abc[x % 32]).join('');
    key = `${role === 'teacher' ? 'PROF' : 'ELEV'}-${pick(4)}-${pick(4)}-${pick(4)}`;
  }
  if (adminOn(env) && key === env.ADMIN_KEY) throw new Bad('key_taken');
  const { results } = await env.DB.prepare('SELECT salt, hash FROM keys').all();
  for (const k of results) if (await sha256(k.salt + ':' + key) === k.hash) throw new Bad('key_taken');
  const salt = rand(8), id = rand(6);
  await env.DB.prepare('INSERT INTO keys (id, label, role, salt, hash, active, created) VALUES (?, ?, ?, ?, ?, 1, ?)').bind(id, label, role, salt, await sha256(salt + ':' + key), Date.now()).run();
  return json({ id, label, role, key });   // parola se vede o singura data, acum
}
async function adminSetKey(request, env, id) {
  const b = await body(request, 500);
  const r = await env.DB.prepare('UPDATE keys SET active = ? WHERE id = ?').bind(b.active ? 1 : 0, id).run();
  if (!r.meta.changes) throw new Bad('not_found', 404);
  return json({ ok: true });
}

/* ---------- drumurile ---------- */
async function api(request, env, ctx, url) {
  const path = url.pathname.replace(/\/+$/, ''), method = request.method;
  const configured = env.DB && env.MEDIA;
  if (path === '/api/content.js' || path === '/api/content') {
    if (!configured) return path.endsWith('.js') ? new Response('window.CLOUD=null;', { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } }) : json([]);
    await ready(env);
    return content(request, env, ctx, path.endsWith('.js'));
  }
  if (!configured) throw new Bad('not_configured', 503);
  // cererile care schimba ceva trebuie sa vina din paginile site-ului, nu de pe alt site
  const origin = request.headers.get('origin');
  if (method !== 'GET' && origin && origin !== url.origin) throw new Bad('not_allowed', 403);
  await ready(env);
  if (path === '/api/login' && method === 'POST') return login(request, env);
  const dev = await auth(request, env);
  if (!dev) throw new Bad('signed_out', 401);
  if (path === '/api/me' && method === 'GET') return json({ me: me(dev) });
  if (path === '/api/logout' && method === 'POST') {   // codul de acces moare, dar randul ramane: se stie in continuare cine a urcat ce
    await env.DB.prepare('UPDATE devices SET token_hash = ? WHERE id = ?').bind('out:' + rand(16), dev.id).run();
    return json({ ok: true });
  }
  if (path === '/api/mine' && method === 'GET') return mine(env, dev);
  if (path === '/api/items' && method === 'POST') return createItem(request, env, ctx, dev);
  const item = /^\/api\/items\/([a-f0-9]{16})$/.exec(path);
  if (item && method === 'PUT') return editItem(request, env, ctx, dev, item[1]);
  if (item && method === 'DELETE') return deleteItem(request, env, ctx, dev, item[1]);
  if (path === '/api/files' && method === 'POST') return putFile(request, env, dev, url);
  if (path === '/api/files/parts' && method === 'POST') return partsStart(env, dev, url);
  if (path === '/api/files/parts' && method === 'PUT') return partsPut(request, env, dev, url);
  if (path === '/api/files/parts/done' && method === 'POST') return partsDone(request, env, dev, url);
  if (path === '/api/files/parts' && method === 'DELETE') return partsAbort(env, dev, url);
  if (path.startsWith('/api/admin/')) {
    if (dev.role !== 'admin') throw new Bad('not_allowed', 403);
    if (path === '/api/admin/keys' && method === 'GET') return adminKeys(env);
    if (path === '/api/admin/keys' && method === 'POST') return adminNewKey(request, env);
    const k = /^\/api\/admin\/keys\/([a-f0-9]{12})$/.exec(path);
    if (k && method === 'PUT') return adminSetKey(request, env, k[1]);
  }
  throw new Bad('not_found', 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env, ctx, url);
      if (url.pathname.startsWith('/media/')) {
        if (!env.MEDIA || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
        return await media(request, env, decodeURIComponent(url.pathname.slice(7)));
      }
    } catch (e) {
      if (e instanceof Bad) return json({ error: e.code }, e.status);
      console.error(e);
      return json({ error: 'server_error' }, 500);
    }
    return env.ASSETS.fetch(request);   // restul site-ului: fisierele obisnuite
  },
};
