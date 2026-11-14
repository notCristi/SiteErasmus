/* =========================================================
   Erasmus+ · partea de server a sectiunii UPLOAD
   Ruleaza pe Cloudflare Pages (advanced mode): fisierul trebuie sa stea in radacina site-ului publicat.
   Are nevoie de trei lucruri legate de proiectul Pages (Settings > Bindings / Variables and Secrets):
     DB         = baza de date D1   (cine a urcat ce; parolele, doar ca amprenta)
     MEDIA      = bucket-ul R2      (pozele, video-urile, fisierele)
     ADMIN_KEY  = secret            (parola ta de admin, minimum 10 caractere)
   Fara ele site-ul merge normal, doar UPLOAD spune ca nu e inca pornit.
   Optional, pentru Cloudflare Images & Stream (pachetul Starter):
     CF_ACCOUNT_ID  = variabila     (Account ID-ul contului Cloudflare, 32 de caractere)
     CF_MEDIA_TOKEN = secret        (API token cu drepturile: Cloudflare Images Edit + Stream Edit)
   Cu ele, pozele noi ajung in Cloudflare Images, iar video-urile noi in Cloudflare Stream;
   documentele raman in R2. Fara ele (sau daca Images / Stream dau eroare), totul merge in R2, ca inainte.
   Parolele nu ajung niciodata in paginile site-ului: se verifica doar aici.
   ========================================================= */

const MB = 1024 * 1024;
const MAX = { image: 25 * MB, video: 300 * MB, doc: 100 * MB };   // marimea maxima a unui fisier
const PART = 20 * MB;                                            // fisierele mari urca in bucati de atat
const MAX_TOTAL_BYTES = Math.round(8.5 * 1024 * MB);             // plafon global in R2 (sub limita gratuita de 10 GB)
const IMAGES_MAX = 100000;                                       // cate poze intra in pachet (Images); peste, pozele noi merg in R2
const IMAGES_MAX_BYTES = 10 * MB;                                // Cloudflare Images primeste poze de cel mult 10 MB
const IMAGES_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];        // formatele pe care le primeste Cloudflare Images
const IMAGE_VARIANTS = { full: 2560, thumb: 640 };               // marimile in care se dau pozele (latura lunga, px)
const STREAM_MAX_MIN = 1000;                                     // cate minute de video intra in pachet (Stream); peste, video-urile noi merg in R2
const CF_API = 'https://api.cloudflare.com/client/v4/accounts/';
const MEDIA_CACHE = 'public, max-age=2592000';                   // pozele si clipurile raman 30 de zile in memoria browserului
const TRASH_DAYS_MS = 7 * 24 * 3600 * 1000;                      // postarile ascunse se sterg definitiv dupa 7 zile
const ORPHAN_MS = 24 * 3600 * 1000;                              // fisierele nepublicate/intrerupte se curata dupa 24h
const FILES = {
  jpg: ['image/jpeg', 'image'], jpeg: ['image/jpeg', 'image'], png: ['image/png', 'image'], webp: ['image/webp', 'image'],
  gif: ['image/gif', 'image'], avif: ['image/avif', 'image'],
  mp4: ['video/mp4', 'video'], m4v: ['video/mp4', 'video'], mov: ['video/quicktime', 'video'], webm: ['video/webm', 'video'],
  pdf: ['application/pdf', 'doc'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'doc'], ppt: ['application/vnd.ms-powerpoint', 'doc'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc'], doc: ['application/msword', 'doc'],
  ppsx: ['application/vnd.openxmlformats-officedocument.presentationml.slideshow', 'doc'], pps: ['application/vnd.ms-powerpoint', 'doc'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'doc'], xls: ['application/vnd.ms-excel', 'doc'],
  odt: ['application/vnd.oasis.opendocument.text', 'doc'], ods: ['application/vnd.oasis.opendocument.spreadsheet', 'doc'],
  odp: ['application/vnd.oasis.opendocument.presentation', 'doc'], rtf: ['application/rtf', 'doc'],
  txt: ['text/plain; charset=utf-8', 'doc'], csv: ['text/csv; charset=utf-8', 'doc'], zip: ['application/zip', 'doc'],
  mp3: ['audio/mpeg', 'doc'], m4a: ['audio/mp4', 'doc'], wav: ['audio/wav', 'doc'], ogg: ['audio/ogg', 'doc'],   // sunetul sta langa documente
};
const MOBS = ['ro', 'fr', 'dk'];
const STAFF_TYPES = ['info', 'day', 'stop'];        // doar profesorii si adminul: inlocuiesc un text care exista deja
const TYPES = ['media', 'story', 'material', 'result', 'link', ...STAFF_TYPES];
const TRIES = 1000, TRY_WINDOW = 15 * 60 * 1000;   // 1000 de incercari gresite pe IP (Wi-Fi scoala) = pauza 15 minute

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS keys (id TEXT PRIMARY KEY, label TEXT NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, locked INTEGER NOT NULL DEFAULT 0, max_devices INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL DEFAULT 0, quota_mb INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, key_id TEXT, role TEXT NOT NULL, name TEXT NOT NULL, adm TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS devices_key ON devices (key_id)`,
  `CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, type TEXT NOT NULL, mob TEXT NOT NULL, skey TEXT, data TEXT NOT NULL, device_id TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS items_live ON items (deleted, created)`,
  `CREATE INDEX IF NOT EXISTS items_device ON items (device_id, deleted)`,
  `CREATE TABLE IF NOT EXISTS files (key TEXT PRIMARY KEY, device_id TEXT NOT NULL, size INTEGER NOT NULL, cls TEXT NOT NULL, name TEXT, upload_id TEXT, item_id TEXT, hidden INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, store TEXT NOT NULL DEFAULT 'r2', ref TEXT, url TEXT, dur REAL NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, ready INTEGER NOT NULL DEFAULT 1)`,
  `CREATE INDEX IF NOT EXISTS files_device ON files (device_id, created)`,
  `CREATE TABLE IF NOT EXISTS attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS attempts_ip ON attempts (ip, ts)`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
];
const MIGRATIONS = [
  `ALTER TABLE keys ADD COLUMN locked INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE keys ADD COLUMN max_devices INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE keys ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE keys ADD COLUMN quota_mb INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE files ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE files ADD COLUMN item_id TEXT`,
  `CREATE INDEX IF NOT EXISTS files_orphan ON files (upload_id, item_id, created)`,
  // unde sta fisierul: 'r2', 'images' (Cloudflare Images) sau 'stream' (Cloudflare Stream); ref = id-ul lui acolo, url = adresa de unde se da
  `ALTER TABLE files ADD COLUMN store TEXT NOT NULL DEFAULT 'r2'`,
  `ALTER TABLE files ADD COLUMN ref TEXT`,
  `ALTER TABLE files ADD COLUMN url TEXT`,
  `ALTER TABLE files ADD COLUMN dur REAL NOT NULL DEFAULT 0`,       // durata video-ului, in secunde
  `ALTER TABLE files ADD COLUMN sent INTEGER NOT NULL DEFAULT 0`,   // cati octeti au ajuns deja in Stream (upload pe bucati)
  `ALTER TABLE files ADD COLUMN ready INTEGER NOT NULL DEFAULT 1`,  // Stream: 0 = inca se prelucreaza, 1 = gata, -1 = nu a putut fi prelucrat
  `CREATE INDEX IF NOT EXISTS files_store ON files (store, ready)`,
];
const SCHEMA_V = '3';   // se schimba de fiecare data cand se adauga ceva in MIGRATIONS
let schemaReady = null, lastCleanup = 0;
function ready(env) {
  if (!schemaReady) schemaReady = (async () => {
    await env.DB.batch(SCHEMA.map(q => env.DB.prepare(q)));
    const v = await env.DB.prepare("SELECT v FROM meta WHERE k = 'schema'").first('v');
    if (v === SCHEMA_V) return;   // coloanele noi exista deja
    for (const q of MIGRATIONS) await env.DB.prepare(q).run().catch(() => {});
    await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('schema', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(SCHEMA_V).run();
  })().catch(e => { schemaReady = null; throw e; });
  return schemaReady;
}

/* ---------- unelte mici ---------- */
class Bad extends Error { constructor(code, status = 400) { super(code); this.code = code; this.status = status; } }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const rand = bytes => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const enc = text => new TextEncoder().encode(String(text ?? ''));
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', enc(text)));
// comparare in timp constant pe doua digest-uri SHA-256 de 32 de octeti
async function same(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc(a)),
    crypto.subtle.digest('SHA-256', enc(b)),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === 'function') return crypto.subtle.timingSafeEqual(ha, hb);
  const ua = new Uint8Array(ha), ub = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}
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
    `SELECT d.id, d.key_id, d.role, d.name, d.adm, d.created, d.seen,
            k.active AS k_active, k.label AS k_label, k.expires_at AS k_expires
     FROM devices d LEFT JOIN keys k ON k.id = d.key_id WHERE d.token_hash = ?`).bind(await sha256(m[1])).first();
  if (!dev) return null;
  const now = Date.now();
  if (dev.role === 'admin') {
    if (!adminOn(env) || !(await same(dev.adm || '', await adminHash(env)))) return null;   // parola de admin schimbata = toti adminii ies
  } else {
    if (!dev.k_active) return null;                                                          // parola anulata = toti cei cu ea ies
    if (dev.k_expires > 0 && now > dev.k_expires) return null;
  }
  if (now - dev.seen > 15 * 60 * 1000) await env.DB.prepare('UPDATE devices SET seen = ? WHERE id = ?').bind(now, dev.id).run();
  return dev;
}
const me = dev => ({ id: dev.id, role: dev.role, name: dev.name, label: dev.role === 'admin' ? 'Admin' : dev.k_label });

async function login(request, env, ctx) {
  const ip = request.headers.get('cf-connecting-ip') || 'local', now = Date.now();
  const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM attempts WHERE ip = ? AND ts > ?').bind(ip, now - TRY_WINDOW).first('n');
  if (fails >= TRIES) throw new Bad('too_many_tries', 429);
  const b = await body(request, 2000);
  const key = typeof b.key === 'string' ? b.key.trim().slice(0, 200) : '';
  const name = str(b.name, 60);
  if (!key || name.length < 2) throw new Bad('missing_field');
  let role = '', keyId = null, label = 'Admin', adm = null, matchedKey = null;
  if (adminOn(env) && await same('cmp:' + key, 'cmp:' + env.ADMIN_KEY)) {
    role = 'admin'; adm = await adminHash(env);
  } else {
    const { results } = await env.DB.prepare('SELECT id, label, role, salt, hash, locked, max_devices, expires_at FROM keys WHERE active = 1').all();
    for (const k of results) {
      if (await same(await sha256(k.salt + ':' + key), k.hash)) { matchedKey = k; break; }
    }
  }
  if (!role && !matchedKey) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO attempts (ip, ts) VALUES (?, ?)').bind(ip, now),
      env.DB.prepare('DELETE FROM attempts WHERE ts < ?').bind(now - 24 * 3600 * 1000),
    ]);
    throw new Bad('wrong_key', 401);
  }
  if (matchedKey) {
    if (matchedKey.expires_at > 0 && now > matchedKey.expires_at) throw new Bad('key_expired', 403);
    if (matchedKey.locked) throw new Bad('key_locked', 403);
    role = matchedKey.role; keyId = matchedKey.id; label = matchedKey.label;
  }
  const token = rand(32), id = rand(8), tokHash = await sha256(token);
  if (matchedKey && matchedKey.max_devices > 0) {
    // verificare atomica a limitei de dispozitive intr-o singura interogare SQL
    const ins = await env.DB.prepare(
      `INSERT INTO devices (id, token_hash, key_id, role, name, adm, created, seen)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM devices WHERE key_id = ? AND token_hash NOT LIKE 'out:%') < ?`)
      .bind(id, tokHash, keyId, role, name, adm, now, now, keyId, matchedKey.max_devices).run();
    if (!ins.meta.changes) throw new Bad('device_limit', 403);
  } else {
    await env.DB.prepare('INSERT INTO devices (id, token_hash, key_id, role, name, adm, created, seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, tokHash, keyId, role, name, adm, now, now).run();
  }
  maybeCleanup(env, ctx);
  return json({ token, me: { id, role, name, label } });
}

/* ---------- curatare automata fara Cron Trigger (ruleaza cel mult o data pe ora) ---------- */
function maybeCleanup(env, ctx) {
  const now = Date.now();
  if (now - lastCleanup < 3600 * 1000) return;
  lastCleanup = now;
  ctx.waitUntil(cleanup(env).catch(() => {}));
}
async function cleanup(env) {
  const now = Date.now();
  // 1. upload-uri multipart neterminate mai vechi de 24h
  const { results: pendingParts } = await env.DB.prepare(
    'SELECT key, upload_id, store, ref FROM files WHERE upload_id IS NOT NULL AND created < ? LIMIT 50').bind(now - ORPHAN_MS).all();
  for (const r of pendingParts) {
    if (r.store === 'stream') { if (!(await streamDelete(env, r.ref))) continue; }   // nu a mers acum: se incearca din nou ora viitoare
    else await env.MEDIA.resumeMultipartUpload(r.key, r.upload_id).abort().catch(() => {});
    await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(r.key).run();
  }
  // 2. postari din Trash mai vechi de 7 zile -> sterse definitiv din R2 si D1
  const { results: expiredTrash } = await env.DB.prepare(
    'SELECT id, data FROM items WHERE deleted = 1 AND updated < ? LIMIT 50').bind(now - TRASH_DAYS_MS).all();
  for (const r of expiredTrash) {
    let keys = [];
    try { keys = itemKeys(JSON.parse(r.data)); } catch (e) {}
    await dropFiles(env, keys);
    await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(r.id).run();
  }
  // 3. fisiere finalizate mai vechi de 24h neasociate niciunei postari (item_id IS NULL)
  const { results: oldFiles } = await env.DB.prepare(
    'SELECT key FROM files WHERE upload_id IS NULL AND item_id IS NULL AND created < ? LIMIT 100').bind(now - ORPHAN_MS).all();
  if (oldFiles.length) {
    const { results: allItems } = await env.DB.prepare('SELECT id, data FROM items').all();
    const keyToItem = new Map();
    for (const it of allItems) {
      try { for (const k of itemKeys(JSON.parse(it.data))) keyToItem.set(k, it.id); } catch (e) {}
    }
    const orphans = [], backfill = [];
    for (const f of oldFiles) {
      const ownerId = keyToItem.get(f.key);
      if (ownerId) backfill.push(env.DB.prepare('UPDATE files SET item_id = ? WHERE key = ?').bind(ownerId, f.key));
      else orphans.push(f.key);
    }
    if (backfill.length) await env.DB.batch(backfill);
    if (orphans.length) await dropFiles(env, orphans);
  }
  // 4. video-urile din Stream care inca se prelucrau: afla daca sunt gata si cat dureaza
  await streamSync(env, 20).catch(() => {});
}

/* ---------- Cloudflare Images & Stream ----------
   Pozele noi stau in Cloudflare Images, video-urile noi in Cloudflare Stream. Cheia fisierului ramane la fel ca in R2
   (image/2026-11/....webp, video/2026-11/....mp4), iar adresa din pagini ramane /media/<cheie>: serverul trimite de acolo
   browserul la poza (marimea potrivita) sau la playerul video. Asa o postare din Trash da in continuare 404.
   Daca Images / Stream nu sunt legate, sunt pline sau dau eroare, fisierul ajunge in R2, ca inainte. */
const cfOn = env => typeof env.CF_ACCOUNT_ID === 'string' && /^[a-f0-9]{32}$/i.test(env.CF_ACCOUNT_ID.trim()) && typeof env.CF_MEDIA_TOKEN === 'string' && env.CF_MEDIA_TOKEN.trim().length >= 20;
class CfError extends Error {}
const cfHeaders = (env, extra = {}) => ({ authorization: 'Bearer ' + env.CF_MEDIA_TOKEN.trim(), ...extra });
const cfUrl = (env, path) => CF_API + env.CF_ACCOUNT_ID.trim() + path;
async function cfJson(env, path, init = {}) {
  let r, j = null;
  try { r = await fetch(cfUrl(env, path), { ...init, headers: cfHeaders(env, init.headers) }); } catch (e) { throw new CfError('network: ' + (e?.message || e)); }
  try { j = await r.json(); } catch (e) {}
  if (!r.ok || (j && j.success === false)) {
    const err = new CfError(`HTTP ${r.status}` + (j?.errors?.length ? ': ' + j.errors.map(x => `${x.code} ${x.message}`).join('; ') : ''));
    err.status = r.status; throw err;
  }
  return j ? j.result : null;
}
const metaGet = (env, k) => env.DB.prepare('SELECT v FROM meta WHERE k = ?').bind(k).first('v');
const metaSet = (env, k, v) => env.DB.prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, String(v)).run();
// ultima eroare de la Images / Stream ramane notata, ca adminul sa o vada in UPLOAD (fisierul a ajuns oricum in R2)
async function cfNote(env, where, e) {
  console.error('Cloudflare ' + where, e?.message || e);
  await metaSet(env, 'cf_error', JSON.stringify({ at: Date.now(), where, msg: str(String(e?.message || e), 300) })).catch(() => {});
}

/* ---- Images ---- */
let variantsReady = false;
async function imagesVariants(env) {   // marimile "full" si "thumb" se fac o singura data, singure
  if (variantsReady) return;
  if (await metaGet(env, 'img_variants') !== '2') {
    for (const [id, px] of Object.entries(IMAGE_VARIANTS)) {
      try {
        await cfJson(env, '/images/v1/variants', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, options: { fit: 'scale-down', metadata: 'none', width: px, height: px }, neverRequireSignedURLs: true }) });
      } catch (e) { await cfJson(env, '/images/v1/variants/' + id); }   // exista deja = e bine; altfel eroarea iese de aici
    }
    await metaSet(env, 'img_variants', '2');
  }
  variantsReady = true;
}
async function imagesWanted(env, f, size) {
  if (!cfOn(env) || f.cls !== 'image' || !IMAGES_EXT.includes(f.ext) || size > IMAGES_MAX_BYTES) return false;
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM files WHERE store = 'images'").first('n');
  return n < IMAGES_MAX;
}
async function imagesPut(env, f, buf) {
  await imagesVariants(env);
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: f.type }), f.key.split('/').pop());
  fd.append('requireSignedURLs', 'false');
  fd.append('metadata', JSON.stringify({ key: f.key }));
  const res = await cfJson(env, '/images/v1', { method: 'POST', body: fd });
  // adresa de livrare vine in raspuns: https://imagedelivery.net/<cod cont>/<id>/<marime>
  const m = /^(https:\/\/[^/?#]+\/[^/?#]+)\//.exec((res?.variants || [])[0] || '');
  if (!res?.id || !m) throw new CfError('unexpected upload answer');
  return { ref: String(res.id), url: `${m[1]}/${res.id}` };
}
async function imagesDelete(env, ref) {
  try { await cfJson(env, '/images/v1/' + encodeURIComponent(ref), { method: 'DELETE' }); return true; }
  catch (e) { if (e.status === 404) return true; await cfNote(env, 'images delete', e); return false; }
}

/* ---- Stream (upload prin protocolul tus, in aceleasi bucati de 20 MB) ---- */
const TUS = { 'tus-resumable': '1.0.0' };
// tokenul pleaca doar spre api.cloudflare.com
const tusHeaders = (env, loc, extra = {}) => ({ ...TUS, ...extra, ...(new URL(loc).hostname === 'api.cloudflare.com' ? { authorization: 'Bearer ' + env.CF_MEDIA_TOKEN.trim() } : {}) });
const b64 = text => { let bin = ''; for (const b of enc(text)) bin += String.fromCharCode(b); return btoa(bin); };
async function streamUsage(env, fresh = false) {   // cate minute sunt ocupate in cont (raspunsul se tine minte 5 minute)
  const now = Date.now();
  let c = null; try { c = JSON.parse(await metaGet(env, 'stream_usage')); } catch (e) {}
  if (!c || fresh || now - c.at > 5 * 60 * 1000) {
    try {
      const r = await cfJson(env, '/stream/storage-usage');
      c = { at: now, min: Number(r?.totalStorageMinutes) || 0, limit: Number(r?.totalStorageMinutesLimit) || 0, n: Number(r?.videoCount) || 0 };
      await metaSet(env, 'stream_usage', JSON.stringify(c));
    } catch (e) { if (!c) c = { at: 0, min: 0, limit: 0, n: 0 }; }
  }
  const ours = (await env.DB.prepare("SELECT COALESCE(SUM(dur), 0) AS n FROM files WHERE store = 'stream' AND ready >= 0").first('n')) / 60;
  return { minutes: Math.max(c.min, ours), max: c.limit > 0 ? Math.min(c.limit, STREAM_MAX_MIN) : STREAM_MAX_MIN, videos: c.n };
}
async function streamWanted(env, f) {
  if (!cfOn(env) || f.cls !== 'video') return false;
  const u = await streamUsage(env);
  return u.minutes + f.dur / 60 <= u.max;
}
async function streamCreate(env, f, size) {
  let r;
  try {
    r = await fetch(cfUrl(env, '/stream'), { method: 'POST',
      headers: cfHeaders(env, { ...TUS, 'upload-length': String(size), 'upload-metadata': 'name ' + b64(f.name || f.key) }) });
  } catch (e) { throw new CfError('network: ' + (e?.message || e)); }
  const loc = r.headers.get('location'), uid = r.headers.get('stream-media-id');
  if (r.status !== 201 || !loc || !/^[a-z0-9]{16,64}$/i.test(uid || '')) {
    let msg = ''; try { msg = (await r.text()).slice(0, 200); } catch (e) {}
    throw new CfError(`HTTP ${r.status} ${msg}`.trim());
  }
  const at = new URL(loc, cfUrl(env, '/stream'));
  if (at.protocol !== 'https:') throw new CfError('unexpected upload address');
  return { uid, loc: at.href };
}
const tusOffset = async (env, loc) => {
  const h = await fetch(loc, { method: 'HEAD', headers: tusHeaders(env, loc) });
  const n = Number(h.headers.get('upload-offset'));
  return h.ok && Number.isInteger(n) ? n : -1;
};
// trimite o bucata; daca o incercare de dinainte a ajuns pe jumatate, continua de unde a ramas
async function tusPatch(env, loc, offset, buf) {
  const end = offset + buf.byteLength;
  for (let turn = 0, at = offset; turn < 2; turn++) {
    const r = await fetch(loc, { method: 'PATCH', body: at === offset ? buf : buf.slice(at - offset),
      headers: tusHeaders(env, loc, { 'upload-offset': String(at), 'content-type': 'application/offset+octet-stream' }) });
    const got = Number(r.headers.get('upload-offset'));
    if (r.ok && got === end) return end;
    const real = await tusOffset(env, loc).catch(() => -1);
    if (real === end) return end;
    if (!(real > at && real < end)) throw new CfError(`HTTP ${r.status} at byte ${at}`);
    at = real;
  }
  throw new CfError('part not accepted');
}
async function streamDelete(env, ref) {
  try { await cfJson(env, '/stream/' + encodeURIComponent(ref), { method: 'DELETE' }); return true; }
  catch (e) { if (e.status === 404) return true; await cfNote(env, 'stream delete', e); return false; }
}
// adresa de la care se da video-ul: https://customer-<cod>.cloudflarestream.com (vine in detaliile video-ului)
const streamHost = v => { for (const u of [v?.preview, v?.thumbnail, v?.playback?.hls]) { try { const x = new URL(u); if (x.protocol === 'https:') return x.origin; } catch (e) {} } return ''; };
async function streamCheck(env, row) {   // intreaba Stream cum sta video-ul si noteaza: gata / eroare, durata, adresa
  const v = await cfJson(env, '/stream/' + encodeURIComponent(row.ref));
  const host = streamHost(v), state = v?.status?.state;
  const ready = v?.readyToStream || state === 'ready' ? 1 : state === 'error' ? -1 : 0;
  const dur = Number(v?.duration) > 0 ? Number(v.duration) : row.dur || 0;
  const url = host ? `${host}/${row.ref}` : row.url || null;
  await env.DB.prepare('UPDATE files SET ready = ?, dur = ?, url = ? WHERE key = ?').bind(ready, dur, url, row.key).run();
  if (host) await metaSet(env, 'stream_host', host);
  return { ...row, ready, dur, url };
}
async function streamSync(env, limit) {
  if (!cfOn(env)) return;
  const { results } = await env.DB.prepare("SELECT key, ref, dur, url FROM files WHERE store = 'stream' AND ready = 0 AND upload_id IS NULL ORDER BY created ASC LIMIT ?").bind(limit).all();
  for (const row of results) { try { await streamCheck(env, row); } catch (e) { if (e.status === 404) await env.DB.prepare('UPDATE files SET ready = -1 WHERE key = ?').bind(row.key).run(); } }
}
// unde trimite /media/<cheie> pentru un fisier care sta in Images sau in Stream
async function cloudTarget(env, row, url) {
  const v = url.searchParams.get('v');
  if (row.store === 'images') return row.url ? `${row.url}/${v === 'thumb' ? 'thumb' : 'full'}` : '';
  if (row.ready < 0) return '';
  let base = row.url;
  if (!base && cfOn(env)) {
    const host = await metaGet(env, 'stream_host');
    if (host) base = `${host}/${row.ref}`;
    else { try { base = (await streamCheck(env, row)).url; } catch (e) {} }
  }
  if (!base) return '';
  const poster = `${base}/thumbnails/thumbnail.jpg?time=1s&width=960&height=960&fit=clip`;
  if (v === 'poster') return poster;
  return `${base}/iframe?poster=${encodeURIComponent(poster)}${url.searchParams.get('autoplay') ? '&autoplay=true' : ''}`;
}

/* ---------- fisierele (R2, Images, Stream) ---------- */
function describe(url) {
  const name = str(url.searchParams.get('name'), 120), e = ext(name), def = FILES[e];
  const size = Number(url.searchParams.get('size')), dur = Number(url.searchParams.get('dur'));
  if (!def) throw new Bad('file_type');
  if (!(size > 0)) throw new Bad('bad_size');
  if (size > MAX[def[1]]) throw new Bad('file_too_big', 413);
  const d = new Date();
  return { name, size, ext: e, type: def[0], cls: def[1], dur: dur > 0 && dur < 6 * 3600 ? Math.round(dur * 10) / 10 : 0,   // durata spusa de browser (video); cea adevarata vine apoi de la Stream
    key: `${def[1]}/${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}/${rand(12)}.${e}` };
}
const r2meta = f => ({ httpMetadata: { contentType: f.type }, customMetadata: { name: f.name } });
// plafonul total e doar pentru R2 (r2 = false: fisierul merge in Images / Stream, care au limitele lor); cota pe cheie numara tot
async function quota(env, dev, size, r2 = true) {
  if (r2) {
    const total = await env.DB.prepare("SELECT COALESCE(SUM(size), 0) AS n FROM files WHERE store = 'r2'").first('n');
    if (total + size > MAX_TOTAL_BYTES) throw new Bad('storage_full', 429);
  }
  if (dev.key_id) {
    const kRow = await env.DB.prepare('SELECT quota_mb FROM keys WHERE id = ?').bind(dev.key_id).first();
    if (kRow && kRow.quota_mb > 0) {
      const totalKey = await env.DB.prepare('SELECT COALESCE(SUM(f.size), 0) AS n FROM files f JOIN devices d ON d.id = f.device_id WHERE d.key_id = ?').bind(dev.key_id).first('n');
      if (totalKey + size > kRow.quota_mb * MB) throw new Bad('key_quota', 429);
    }
  }
}
async function putFile(request, env, dev, url) {
  const f = describe(url);
  if (f.size > 95 * MB) throw new Bad('use_parts', 413);
  if (Number(request.headers.get('content-length')) > 95 * MB) throw new Bad('use_parts', 413);
  await quota(env, dev, f.size, false);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) throw new Bad('bad_size');
  if (buf.byteLength > MAX[f.cls] || buf.byteLength > 95 * MB) throw new Bad('file_too_big', 413);
  if (buf.byteLength > f.size) await quota(env, dev, buf.byteLength, false);
  const row = (store, ref, link, ready) => env.DB.prepare('INSERT INTO files (key, device_id, size, cls, name, created, store, ref, url, dur, ready) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(f.key, dev.id, buf.byteLength, f.cls, f.name, Date.now(), store, ref, link, store === 'stream' ? f.dur : 0, ready).run();
  // pozele: Cloudflare Images
  if (await imagesWanted(env, f, buf.byteLength)) {
    try {
      const im = await imagesPut(env, f, buf);
      await row('images', im.ref, im.url, 1);
      return json({ key: f.key, size: buf.byteLength, store: 'images' });
    } catch (e) { if (e instanceof Bad) throw e; await cfNote(env, 'images upload', e); }
  }
  // video-urile mici: Cloudflare Stream
  if (await streamWanted(env, f).catch(() => false)) {
    let up = null;
    try {
      up = await streamCreate(env, f, buf.byteLength);
      await tusPatch(env, up.loc, 0, buf);
      await row('stream', up.uid, null, 0);
      return json({ key: f.key, size: buf.byteLength, store: 'stream' });
    } catch (e) { if (up) await streamDelete(env, up.uid); if (e instanceof Bad) throw e; await cfNote(env, 'stream upload', e); }
  }
  // restul (si tot ce nu a incaput sau nu a mers mai sus): R2
  await quota(env, dev, buf.byteLength);
  await env.MEDIA.put(f.key, buf, r2meta(f));
  await row('r2', null, null, 1);
  return json({ key: f.key, size: buf.byteLength, store: 'r2' });
}
async function partsStart(env, dev, url) {
  const f = describe(url);
  if (await streamWanted(env, f).catch(() => false)) {   // video-urile mari: Cloudflare Stream, in aceleasi bucati
    await quota(env, dev, f.size, false);
    try {
      const up = await streamCreate(env, f, f.size);
      await env.DB.prepare("INSERT INTO files (key, device_id, size, cls, name, upload_id, created, store, ref, dur, ready) VALUES (?, ?, ?, ?, ?, ?, ?, 'stream', ?, ?, 0)")
        .bind(f.key, dev.id, f.size, f.cls, f.name, up.loc, Date.now(), up.uid, f.dur).run();
      return json({ key: f.key, uploadId: up.uid, partSize: PART, store: 'stream' });
    } catch (e) { if (e instanceof Bad) throw e; await cfNote(env, 'stream upload', e); }
  }
  await quota(env, dev, f.size);
  const up = await env.MEDIA.createMultipartUpload(f.key, r2meta(f));
  await env.DB.prepare('INSERT INTO files (key, device_id, size, cls, name, upload_id, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(f.key, dev.id, f.size, f.cls, f.name, up.uploadId, Date.now()).run();
  return json({ key: f.key, uploadId: up.uploadId, partSize: PART, store: 'r2' });
}
async function pending(env, dev, url) {
  const key = fileKey(url.searchParams.get('key'));
  const row = key && await env.DB.prepare('SELECT * FROM files WHERE key = ? AND device_id = ? AND upload_id IS NOT NULL').bind(key, dev.id).first();
  if (!row) throw new Bad('no_upload', 404);
  return { row, up: row.store === 'stream' ? null : env.MEDIA.resumeMultipartUpload(row.key, row.upload_id) };
}
async function partsPut(request, env, dev, url) {
  const { row, up } = await pending(env, dev, url);
  const n = Number(url.searchParams.get('n'));
  if (!Number.isInteger(n) || n < 1 || n > Math.ceil(MAX[row.cls] / PART) + 1) throw new Bad('bad_part');
  if (Number(request.headers.get('content-length')) > PART + MB) throw new Bad('part_too_big', 413);
  if (row.store === 'stream') {
    const offset = (n - 1) * PART, buf = await request.arrayBuffer();
    const end0 = offset + buf.byteLength;   // toate bucatile au exact 20 MB, mai putin ultima
    if (!buf.byteLength || end0 > row.size || (end0 < row.size && buf.byteLength !== PART)) throw new Bad('bad_part');
    let end;
    try { end = await tusPatch(env, row.upload_id, offset, buf); }
    catch (e) { await cfNote(env, 'stream upload', e); throw new Bad('upload_failed', 502); }
    await env.DB.prepare('UPDATE files SET sent = MAX(sent, ?) WHERE key = ?').bind(end, row.key).run();
    return json({ partNumber: n, etag: 'tus-' + end });
  }
  const part = await up.uploadPart(n, request.body);
  return json({ partNumber: part.partNumber, etag: part.etag });
}
async function partsDone(request, env, dev, url) {
  const { row, up } = await pending(env, dev, url);
  if (row.store === 'stream') {   // la Stream nu e nimic de incheiat: video-ul e intreg cand au ajuns toti octetii
    if (row.sent !== row.size) throw new Bad('bad_part');
    await env.DB.prepare('UPDATE files SET upload_id = NULL WHERE key = ?').bind(row.key).run();
    return json({ key: row.key, size: row.size, store: 'stream' });
  }
  const b = await body(request, 20000);
  const parts = (Array.isArray(b.parts) ? b.parts : []).map(p => ({ partNumber: int(p.partNumber, 1, 1000, 0), etag: str(p.etag, 400) })).filter(p => p.partNumber && p.etag);
  if (!parts.length) throw new Bad('bad_part');
  const obj = await up.complete(parts);
  if (obj.size > MAX[row.cls]) {
    await env.MEDIA.delete(row.key); await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(row.key).run();
    throw new Bad('file_too_big', 413);
  }
  if (obj.size > row.size) {
    try { await quota(env, dev, obj.size - row.size); }
    catch (e) { await env.MEDIA.delete(row.key); await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(row.key).run(); throw e; }
  }
  await env.DB.prepare('UPDATE files SET upload_id = NULL, size = ? WHERE key = ?').bind(obj.size, row.key).run();
  return json({ key: row.key, size: obj.size });
}
async function partsAbort(env, dev, url) {
  const { row, up } = await pending(env, dev, url);
  if (row.store === 'stream') await streamDelete(env, row.ref);
  else await up.abort().catch(() => {});
  await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(row.key).run();
  return json({ ok: true });
}
// sterge fisierele de unde stau (R2, Images sau Stream). Ce nu s-a putut sterge acum din Images / Stream ramane notat
// fara postare (item_id NULL) si il mai incearca o data curatarea automata, ca sa nu ramana platit degeaba.
async function dropFiles(env, keys) {
  keys = [...new Set(keys.filter(Boolean))];
  if (!keys.length) return;
  const { results } = await env.DB.prepare(`SELECT key, store, ref FROM files WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const where = new Map(results.map(r => [r.key, r])), gone = [], kept = [];
  for (const k of keys) {
    const r = where.get(k);
    if (!r || r.store === 'r2' || !r.ref) { gone.push(k); continue; }
    const ok = cfOn(env) && (r.store === 'images' ? await imagesDelete(env, r.ref) : await streamDelete(env, r.ref));
    (ok ? gone : kept).push(k);
  }
  const r2 = gone.filter(k => !where.get(k) || where.get(k).store === 'r2');
  if (r2.length) await env.MEDIA.delete(r2);
  const stmts = [...gone.map(k => env.DB.prepare('DELETE FROM files WHERE key = ?').bind(k)),
    ...kept.map(k => env.DB.prepare('UPDATE files SET item_id = NULL, hidden = 1 WHERE key = ?').bind(k))];
  if (stmts.length) await env.DB.batch(stmts);
}
async function setFilesHidden(env, datas, hidden) {
  const keys = [...new Set(datas.flatMap(d => {
    try { return itemKeys(typeof d === 'string' ? JSON.parse(d) : d); } catch (e) { return []; }
  }))];
  if (!keys.length) return;
  await env.DB.batch(keys.map(k => env.DB.prepare('UPDATE files SET hidden = ? WHERE key = ?').bind(hidden ? 1 : 0, k)));
}
// pozele si fisierele se dau direct din R2 si raman in memoria browserului (o postare din Trash da 404 la orice cerere noua).
// Ce sta in Images / Stream: browserul e trimis de aici la poza (?v=thumb = cea mica) sau la playerul video (?v=poster = imaginea lui).
async function media(request, env, key, url) {
  if (env.DB) {
    await ready(env);
    const fRow = await env.DB.prepare(
      'SELECT f.key, f.hidden, f.store, f.ref, f.url, f.dur, f.ready, i.deleted AS item_deleted FROM files f LEFT JOIN items i ON i.id = f.item_id WHERE f.key = ?'
    ).bind(key).first();
    if (fRow && (fRow.hidden || fRow.item_deleted === 1)) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
    if (fRow && fRow.store !== 'r2') {
      const to = await cloudTarget(env, fRow, url);
      if (!to) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
      return new Response(null, { status: 302, headers: { location: to, 'cache-control': MEDIA_CACHE, 'x-content-type-options': 'nosniff' } });
    }
  }
  const obj = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set('etag', obj.httpEtag);
  h.set('cache-control', MEDIA_CACHE);
  h.set('accept-ranges', 'bytes');
  h.set('x-content-type-options', 'nosniff');
  const type = (FILES[ext(key)] || [])[0] || 'application/octet-stream';
  h.set('content-type', type);
  if (type !== 'application/pdf') h.set('content-security-policy', "default-src 'none'; sandbox");   // PDF-urile se deschid in vizualizatorul Chrome fara sandbox
  if (key.startsWith('doc/')) {   // PDF-ul, textul simplu si sunetul se deschid in pagina; restul (PowerPoint, Word, Excel, zip) se descarca, cu numele lor
    const name = (obj.customMetadata?.name || key.split('/').pop()).replace(/[^\w. ()\-]+/g, '_');
    const inPage = type === 'application/pdf' || type.startsWith('text/plain') || type.startsWith('audio/');
    h.set('content-disposition', `${inPage ? 'inline' : 'attachment'}; filename="${name}"`);
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
    const k = kept('key'); if (!k) throw new Bad('missing_file');   // orice fel de fisier permis: document, poza, video, sunet
    data = { cat: ['a', 'b', 'c', 'd'].includes(d.cat) ? d.cat : 'a', slot: str(d.slot, 160), title: str(d.title, 160), by: str(d.by, 120), key: k };
    if (!data.slot && !data.title) throw new Bad('missing_field');
  } else if (type === 'result') {
    data = { sec: int(d.sec, 0, 4, 0), text: str(d.text, 4000, { req: true, lines: true }), key: kept('key') };
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
  if (skey) {   // un singur text / fisier de felul asta pe mobilitate: cel vechi trece in Trash si fisierele lui se ascund
    const { results: oldRows } = await env.DB.prepare('SELECT data FROM items WHERE deleted = 0 AND type = ? AND mob = ? AND skey = ?').bind(type, mob, skey).all();
    if (oldRows.length) {
      await env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE deleted = 0 AND type = ? AND mob = ? AND skey = ?').bind(now, type, mob, skey).run();
      await setFilesHidden(env, oldRows.map(r => r.data), true);
    }
  }
  await env.DB.prepare('INSERT INTO items (id, type, mob, skey, data, device_id, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, type, mob, skey, JSON.stringify(data), dev.id, now, now).run();
  if (keys.length) {
    await env.DB.batch([...new Set(keys)].map(k => env.DB.prepare('UPDATE files SET item_id = ?, hidden = 0 WHERE key = ?').bind(id, k)));
  }
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
async function deleteItem(request, env, ctx, dev, id, url) {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Bad('not_found', 404);
  if (dev.role === 'admin' && url.searchParams.get('permanent') === '1') {
    const row = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
    if (!row) throw new Bad('not_found', 404);
    await dropFiles(env, itemKeys(JSON.parse(row.data)));
    await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
    purge(ctx, request);
    return json({ ok: true, permanent: true });
  }
  const row = await ownItem(env, dev, id);
  await env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE id = ?').bind(Date.now(), id).run();
  await setFilesHidden(env, [row.data], true);
  purge(ctx, request);
  return json({ ok: true });
}
async function restoreItem(request, env, ctx, dev, id) {
  if (!staff(dev)) throw new Bad('not_allowed', 403);
  const row = /^[a-f0-9]{16}$/.test(id) && await env.DB.prepare('SELECT * FROM items WHERE id = ? AND deleted = 1').bind(id).first();
  if (!row) throw new Bad('not_found', 404);
  const now = Date.now();
  if (row.skey) {
    const { results: oldRows } = await env.DB.prepare('SELECT data FROM items WHERE deleted = 0 AND type = ? AND mob = ? AND skey = ?')
      .bind(row.type, row.mob, row.skey).all();
    if (oldRows.length) {
      await env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE deleted = 0 AND type = ? AND mob = ? AND skey = ?')
        .bind(now, row.type, row.mob, row.skey).run();
      await setFilesHidden(env, oldRows.map(r => r.data), true);
    }
  }
  await env.DB.prepare('UPDATE items SET deleted = 0, updated = ? WHERE id = ?').bind(now, id).run();
  await setFilesHidden(env, [row.data], false);
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
    const [{ results }, st] = await Promise.all([
      env.DB.prepare('SELECT id, type, mob, data, created FROM items WHERE deleted = 0 ORDER BY created ASC LIMIT 5000').all(),
      env.DB.prepare("SELECT key FROM files WHERE store = 'stream'").all(),
    ]);
    const inStream = new Set(st.results.map(r => r.key));   // sv = video-ul sta in Stream: pagina il arata in playerul lui, nu intr-un <video>
    items = JSON.stringify(results.map(r => { const o = pub(r); if (o.key && inStream.has(o.key)) o.sv = 1; return o; }));
    ctx.waitUntil(caches.default.put(cacheKey, new Response(items, { headers: { 'cache-control': 'public, max-age=20' } })).catch(() => {}));
  }
  return asScript
    ? new Response(`window.CLOUD=${items.replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16))};`, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' } })
    : new Response(items, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
// lista din UPLOAD: ale tale; profesorii si adminul le vad pe toate; doar adminul vede cine le-a urcat si Trash
async function mine(env, dev) {
  const q = staff(dev)
    ? env.DB.prepare(`SELECT i.*, d.name AS by_name, d.key_id AS by_key_id, k.label AS by_label FROM items i LEFT JOIN devices d ON d.id = i.device_id LEFT JOIN keys k ON k.id = d.key_id WHERE i.deleted = 0 ORDER BY i.created DESC LIMIT 400`)
    : env.DB.prepare('SELECT * FROM items WHERE deleted = 0 AND device_id = ? ORDER BY created DESC LIMIT 400').bind(dev.id);
  const { results } = await q.all();
  const mapRow = r => ({
    ...pub(r),
    own: r.device_id === dev.id,
    ...(dev.role === 'admin' ? {
      uploader: r.device_id === dev.id ? 'You' : `${r.by_name || '?'} · ${r.by_label || (r.by_key_id ? 'Deleted key' : 'Admin')}`,
      byKey: r.by_key_id || 'admin',
      byDevice: r.device_id,
    } : {}),
  });
  const out = { items: results.map(mapRow) };
  if (dev.role === 'admin') {
    const [tr, used] = await Promise.all([
      env.DB.prepare(`SELECT i.*, d.name AS by_name, d.key_id AS by_key_id, k.label AS by_label FROM items i LEFT JOIN devices d ON d.id = i.device_id LEFT JOIN keys k ON k.id = d.key_id WHERE i.deleted = 1 ORDER BY i.updated DESC LIMIT 200`).all(),
      env.DB.prepare("SELECT COALESCE(SUM(size), 0) AS n FROM files WHERE store = 'r2'").first('n'),
    ]);
    out.trash = tr.results.map(r => ({ ...mapRow(r), deletedAt: r.updated }));
    out.storage = { usedBytes: used || 0, maxBytes: MAX_TOTAL_BYTES };
    out.cloud = await cloudStatus(env);
  }
  return json(out);
}
// ce vede adminul despre Images & Stream: cate poze, cate minute, ce se mai prelucreaza si ultima eroare (din ultimele 24h)
async function cloudStatus(env) {
  if (!cfOn(env)) return { on: false };
  await streamSync(env, 10).catch(() => {});
  const [images, st, usage, errRaw] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM files WHERE store = 'images'").first('n'),
    env.DB.prepare("SELECT COALESCE(SUM(CASE WHEN ready = 0 THEN 1 ELSE 0 END), 0) AS pending, COALESCE(SUM(CASE WHEN ready < 0 THEN 1 ELSE 0 END), 0) AS failed, COUNT(*) AS n FROM files WHERE store = 'stream' AND upload_id IS NULL").first(),
    streamUsage(env, true),
    metaGet(env, 'cf_error'),
  ]);
  let error = null; try { const e = JSON.parse(errRaw); if (Date.now() - e.at < 24 * 3600 * 1000) error = e; } catch (e) {}
  return { on: true, images: { count: images || 0, max: IMAGES_MAX },
    stream: { minutes: Math.round(usage.minutes * 10) / 10, max: usage.max, videos: st?.n || 0, pending: st?.pending || 0, failed: st?.failed || 0 }, error };
}

/* ---------- adminul: parolele si dispozitivele ---------- */
async function adminKeys(env) {
  const [ks, ds] = await Promise.all([
    env.DB.prepare(
      `SELECT k.id, k.label, k.role, k.active, k.locked, k.max_devices, k.expires_at, k.quota_mb, k.created,
         (SELECT COUNT(*) FROM devices d WHERE d.key_id = k.id AND d.token_hash NOT LIKE 'out:%') AS devices,
         (SELECT COALESCE(SUM(f.size), 0) FROM files f JOIN devices d ON d.id = f.device_id WHERE d.key_id = k.id) AS used_bytes
       FROM keys k ORDER BY k.created DESC`).all(),
    env.DB.prepare(
      `SELECT d.id, d.key_id, d.name, d.created, d.seen,
         CASE WHEN d.token_hash LIKE 'out:%' THEN 0 ELSE 1 END AS online,
         (SELECT COUNT(*) FROM items i WHERE i.device_id = d.id AND i.deleted = 0) AS uploads
       FROM devices d WHERE d.key_id IS NOT NULL ORDER BY online DESC, d.seen DESC LIMIT 500`).all(),
  ]);
  const byKey = new Map();
  for (const d of ds.results) {
    if (!byKey.has(d.key_id)) byKey.set(d.key_id, []);
    byKey.get(d.key_id).push({ id: d.id, name: d.name, created: d.created, seen: d.seen, online: !!d.online, uploads: d.uploads });
  }
  return json({ keys: ks.results.map(k => ({ ...k, deviceList: byKey.get(k.id) || [] })) });
}
async function adminNewKey(request, env) {
  const b = await body(request, 2000);
  const label = str(b.label, 60, { req: true }), role = b.role === 'teacher' ? 'teacher' : 'student';
  const maxDevices = int(b.max_devices, 0, 500, 0);
  const expiresDays = int(b.expires_days, 0, 365, 0);
  const expiresAt = expiresDays > 0 ? Date.now() + expiresDays * 24 * 3600 * 1000 : 0;
  const quotaMb = int(b.quota_mb, 0, 8000, 0);
  let key = typeof b.key === 'string' ? b.key.trim() : '';
  if (key && key.length < 8) throw new Bad('key_too_short');
  if (!key) {   // o parola usor de dictat: ELEV-7F3K-Q2M9-...
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', pick = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => abc[x % 32]).join('');
    key = `${role === 'teacher' ? 'PROF' : 'ELEV'}-${pick(4)}-${pick(4)}-${pick(4)}`;
  }
  if (adminOn(env) && await same('cmp:' + key, 'cmp:' + env.ADMIN_KEY)) throw new Bad('key_taken');
  const { results } = await env.DB.prepare('SELECT salt, hash FROM keys').all();
  for (const k of results) if (await same(await sha256(k.salt + ':' + key), k.hash)) throw new Bad('key_taken');
  const salt = rand(8), id = rand(6), created = Date.now();
  await env.DB.prepare(
    'INSERT INTO keys (id, label, role, salt, hash, active, locked, max_devices, expires_at, quota_mb, created) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)')
    .bind(id, label, role, salt, await sha256(salt + ':' + key), maxDevices, expiresAt, quotaMb, created).run();
  return json({ id, label, role, key });   // parola se vede o singura data, acum
}
async function adminSetKey(request, env, id) {
  const row = await env.DB.prepare('SELECT id, active, locked, max_devices, expires_at, quota_mb FROM keys WHERE id = ?').bind(id).first();
  if (!row) throw new Bad('not_found', 404);
  const b = await body(request, 1000);
  const active = 'active' in b ? (b.active ? 1 : 0) : row.active;
  const locked = 'locked' in b ? (b.locked ? 1 : 0) : row.locked;
  const maxDevices = 'max_devices' in b ? int(b.max_devices, 0, 500, row.max_devices) : row.max_devices;
  const quotaMb = 'quota_mb' in b ? int(b.quota_mb, 0, 8000, row.quota_mb) : row.quota_mb;
  let expiresAt = row.expires_at;
  if ('expires_days' in b) {
    const days = int(b.expires_days, 0, 365, -1);
    if (days === 0) expiresAt = 0;
    else if (days > 0) expiresAt = Date.now() + days * 24 * 3600 * 1000;
  } else if ('expires_at' in b && Number.isInteger(b.expires_at) && b.expires_at >= 0) {
    expiresAt = b.expires_at;
  }
  await env.DB.prepare('UPDATE keys SET active = ?, locked = ?, max_devices = ?, expires_at = ?, quota_mb = ? WHERE id = ?')
    .bind(active, locked, maxDevices, expiresAt, quotaMb, id).run();
  return json({ ok: true });
}
async function adminDeleteKey(request, env, ctx, id, url) {
  const row = await env.DB.prepare('SELECT id FROM keys WHERE id = ?').bind(id).first();
  if (!row) throw new Bad('not_found', 404);
  const hideUploads = url.searchParams.get('hide_uploads') === '1';
  const now = Date.now();
  const { results: devs } = await env.DB.prepare('SELECT id FROM devices WHERE key_id = ?').bind(id).all();
  const stmts = devs.map(d => env.DB.prepare('UPDATE devices SET token_hash = ? WHERE id = ?').bind('out:' + rand(16), d.id));
  let hiddenDatas = [];
  if (hideUploads && devs.length) {
    const { results: liveRows } = await env.DB.prepare(
      'SELECT i.data FROM items i JOIN devices d ON d.id = i.device_id WHERE d.key_id = ? AND i.deleted = 0').bind(id).all();
    hiddenDatas = liveRows.map(r => r.data);
    for (const d of devs) {
      stmts.push(env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE device_id = ? AND deleted = 0').bind(now, d.id));
    }
  }
  stmts.push(env.DB.prepare('DELETE FROM keys WHERE id = ?').bind(id));
  await env.DB.batch(stmts);
  if (hiddenDatas.length) await setFilesHidden(env, hiddenDatas, true);
  if (hideUploads) purge(ctx, request);
  return json({ ok: true });
}
async function adminKickDevice(request, env, ctx, id) {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Bad('not_found', 404);
  const dev = await env.DB.prepare('SELECT id, key_id FROM devices WHERE id = ?').bind(id).first();
  if (!dev) throw new Bad('not_found', 404);
  const b = await body(request, 500).catch(() => ({}));
  const stmts = [
    env.DB.prepare('UPDATE devices SET token_hash = ? WHERE id = ?').bind('out:' + rand(16), id),
  ];
  if (b.lockKey && dev.key_id) {
    stmts.push(env.DB.prepare('UPDATE keys SET locked = 1 WHERE id = ?').bind(dev.key_id));
  }
  let hiddenDatas = [];
  if (b.hideUploads) {
    const { results: liveRows } = await env.DB.prepare('SELECT data FROM items WHERE device_id = ? AND deleted = 0').bind(id).all();
    hiddenDatas = liveRows.map(r => r.data);
    stmts.push(env.DB.prepare('UPDATE items SET deleted = 1, updated = ? WHERE device_id = ? AND deleted = 0').bind(Date.now(), id));
  }
  await env.DB.batch(stmts);
  if (hiddenDatas.length) await setFilesHidden(env, hiddenDatas, true);
  if (b.hideUploads) purge(ctx, request);
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
  if (path === '/api/login' && method === 'POST') return login(request, env, ctx);
  const dev = await auth(request, env);
  if (!dev) throw new Bad('signed_out', 401);
  maybeCleanup(env, ctx);
  if (path === '/api/me' && method === 'GET') return json({ me: me(dev) });
  if (path === '/api/logout' && method === 'POST') {   // codul de acces moare, dar randul ramane: se stie in continuare cine a urcat ce
    await env.DB.prepare('UPDATE devices SET token_hash = ? WHERE id = ?').bind('out:' + rand(16), dev.id).run();
    return json({ ok: true });
  }
  if (path === '/api/mine' && method === 'GET') return mine(env, dev);
  if (path === '/api/items' && method === 'POST') return createItem(request, env, ctx, dev);
  const item = /^\/api\/items\/([a-f0-9]{16})$/.exec(path);
  if (item && method === 'PUT') return editItem(request, env, ctx, dev, item[1]);
  if (item && method === 'DELETE') return deleteItem(request, env, ctx, dev, item[1], url);
  const restore = /^\/api\/items\/([a-f0-9]{16})\/restore$/.exec(path);
  if (restore && method === 'POST') return restoreItem(request, env, ctx, dev, restore[1]);
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
    if (k && method === 'DELETE') return adminDeleteKey(request, env, ctx, k[1], url);
    const kd = /^\/api\/admin\/devices\/([a-f0-9]{16})\/kick$/.exec(path);
    if (kd && method === 'POST') return adminKickDevice(request, env, ctx, kd[1]);
  }
  throw new Bad('not_found', 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env, ctx, url);
      if (url.pathname.startsWith('/media/')) {
        let key = ''; try { key = fileKey(decodeURIComponent(url.pathname.slice(7))); } catch (e) {}
        if (key) {
          if (!env.MEDIA || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
          return await media(request, env, key, url);
        }
        // altfel nu e un fisier urcat, ci unul al site-ului (video-urile de fundal stau in /media/fundal-1.mp4 ...): se da ca orice alt fisier
      }
    } catch (e) {
      if (e instanceof Bad) return json({ error: e.code }, e.status);
      console.error(e);
      return json({ error: 'server_error' }, 500);
    }
    return env.ASSETS.fetch(request);   // restul site-ului: fisierele obisnuite
  },
};
