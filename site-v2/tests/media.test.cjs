// Cloudflare Images & Stream: where new photos and videos are stored, how /media/* answers for them,
// and that everything still lands in R2 when Images / Stream are not connected, full or failing.
// The Cloudflare API is imitated here (fakeCloudflare); nothing leaves this computer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');
const workerUrl = pathToFileURL(path.join(root, '_worker.js')).href;
const MB = 1024 * 1024, PART = 20 * MB;
const ACCOUNT = 'a'.repeat(32), TOKEN = 'tok_' + 'x'.repeat(36);
const STREAM_HOST = 'https://customer-abc123.cloudflarestream.com';

globalThis.caches = globalThis.caches || { default: { async match() { return null; }, async put() {}, async delete() { return true; } } };
let modSeq = 0;
const loadWorker = async () => (await import(`${workerUrl}?media=${++modSeq}`)).default;

function makeD1() {
  const db = new DatabaseSync(':memory:');
  const wrap = (sql, params = []) => ({
    bind: (...args) => wrap(sql, args),
    async run() { return { meta: { changes: Number(db.prepare(sql).run(...params).changes) } }; },
    async first(col) { const row = db.prepare(sql).get(...params); return !row ? null : col ? row[col] : row; },
    async all() { return { results: db.prepare(sql).all(...params) }; },
    _exec() { return { meta: { changes: Number(db.prepare(sql).run(...params).changes) } }; },
  });
  return { _db: db, prepare: sql => wrap(sql), async batch(stmts) { return stmts.map(s => s._exec()); } };
}
function makeR2() {
  const map = new Map();
  let seq = 0;
  const upload = (key, uploadId) => ({
    uploadId, async abort() {}, async uploadPart(n) { return { partNumber: n, etag: 'e' + n }; },
    async complete() { map.set(key, { bytes: new Uint8Array([1, 2, 3]) }); return { key, size: 100 }; },
  });
  return {
    _map: map,
    async put(key, body) { map.set(key, { bytes: new Uint8Array(body) }); return { key }; },
    async createMultipartUpload(key) { return upload(key, 'up-' + (++seq)); },
    resumeMultipartUpload: (key, id) => upload(key, id),
    async get(key) {
      const o = map.get(key);
      return o ? { size: o.bytes.byteLength, httpEtag: '"e"', customMetadata: {}, body: new ReadableStream({ start(c) { c.enqueue(o.bytes); c.close(); } }), writeHttpMetadata() {} } : null;
    },
    async delete(keys) { for (const k of [].concat(keys)) map.delete(k); },
  };
}

// A small stand-in for api.cloudflare.com: Images (variants, upload, delete) and Stream (tus upload, details, usage, delete).
function fakeCloudflare() {
  const cf = { images: new Map(), variants: new Set(), videos: new Map(), calls: [], usedMinutes: 0, limitMinutes: 1000,
    failImages: false, failStream: false, dropAckOnce: false, uploadHost: 'https://api.cloudflare.com', strangers: [] };
  const ok = (result, status = 200, headers = {}) => new Response(JSON.stringify({ success: true, errors: [], result }), { status, headers });
  const bad = (status, code, message) => new Response(JSON.stringify({ success: false, errors: [{ code, message }], result: null }), { status });
  let seq = 0;
  cf.fetch = async (input, init = {}) => {
    const req = new Request(input, init), url = new URL(req.url), method = req.method;
    // the upload address answers HEAD and PATCH; on api.cloudflare.com the same address is also the video itself (GET, DELETE)
    const tus = ['HEAD', 'PATCH'].includes(method) && [...cf.videos.values()].find(v => v.loc === url.origin + url.pathname);
    // the token must only ever travel to api.cloudflare.com
    if (url.hostname !== 'api.cloudflare.com') { if (req.headers.get('authorization')) cf.strangers.push(url.hostname); }
    else assert.equal(req.headers.get('authorization'), 'Bearer ' + TOKEN, 'API token on ' + url.pathname);
    cf.calls.push(`${method} ${url.hostname === 'api.cloudflare.com' ? url.pathname.replace(`/client/v4/accounts/${ACCOUNT}`, '') : url.origin + url.pathname}`);
    if (tus) {
      assert.equal(req.headers.get('tus-resumable'), '1.0.0');
      if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'upload-offset': String(tus.bytes), 'upload-length': String(tus.length) } });
      if (method === 'PATCH') {
        assert.equal(req.headers.get('content-type'), 'application/offset+octet-stream');
        if (Number(req.headers.get('upload-offset')) !== tus.bytes) return new Response(null, { status: 409 });
        tus.bytes += (await req.arrayBuffer()).byteLength;
        if (cf.dropAckOnce) { cf.dropAckOnce = false; return new Response(null, { status: 502 }); }   // the bytes arrived, the answer got lost
        return new Response(null, { status: 204, headers: { 'upload-offset': String(tus.bytes) } });
      }
    }
    const p = url.pathname.replace(`/client/v4/accounts/${ACCOUNT}`, '');
    assert.equal(url.hostname, 'api.cloudflare.com', 'unexpected request to ' + url.href);
    if (p === '/images/v1/variants' && method === 'POST') {
      const b = await req.json();
      if (cf.variants.has(b.id)) return bad(409, 5409, 'variant exists');
      cf.variants.add(b.id); cf.variantOptions = { ...(cf.variantOptions || {}), [b.id]: b.options };
      return ok({ variant: b });
    }
    if (p.startsWith('/images/v1/variants/') && method === 'GET') return cf.variants.has(p.split('/').pop()) ? ok({ variant: {} }) : bad(404, 5401, 'no variant');
    if (p === '/images/v1' && method === 'POST') {
      if (cf.failImages) return bad(500, 5500, 'images are down');
      const fd = await req.formData(), file = fd.get('file'), id = `img-${++seq}`;
      assert.ok(file && file.size > 0, 'image file field');
      cf.images.set(id, { size: file.size, type: file.type, meta: JSON.parse(fd.get('metadata')) });
      return ok({ id, filename: file.name, requireSignedURLs: false, variants: [`https://imagedelivery.net/HASH123/${id}/public`] });
    }
    if (p.startsWith('/images/v1/') && method === 'DELETE') { const id = decodeURIComponent(p.slice(11)); return cf.images.delete(id) ? ok({}) : bad(404, 5404, 'not found'); }
    if (p === '/stream/storage-usage') return ok({ totalStorageMinutes: cf.usedMinutes, totalStorageMinutesLimit: cf.limitMinutes, videoCount: cf.videos.size });
    if (p === '/stream' && method === 'POST' && !req.headers.get('tus-resumable')) {   // a plain upload, the whole file in one request
      if (cf.failStream) return bad(500, 10005, 'stream is down');
      const file = (await req.formData()).get('file'), uid = (++seq).toString(16).padStart(32, '0');
      assert.ok(file && file.size > 0, 'video file field');
      cf.videos.set(uid, { uid, loc: '', length: file.size, bytes: file.size, state: 'inprogress', duration: -1, name: file.name });
      return ok({ uid, readyToStream: false, status: { state: 'queued' }, duration: -1, preview: `${STREAM_HOST}/${uid}/watch` });
    }
    if (p === '/stream' && method === 'POST') {
      if (cf.failStream) return bad(500, 10005, 'stream is down');
      const uid = (++seq).toString(16).padStart(32, '0'), length = Number(req.headers.get('upload-length'));
      const loc = cf.uploadHost === 'https://api.cloudflare.com' ? `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/stream/${uid}` : `${cf.uploadHost}/tus/${uid}`;
      cf.videos.set(uid, { uid, loc, length, bytes: 0, state: 'inprogress', duration: -1, meta: req.headers.get('upload-metadata') });
      return new Response(null, { status: 201, headers: { location: loc, 'stream-media-id': uid, 'tus-resumable': '1.0.0' } });
    }
    const vid = cf.videos.get(p.replace('/stream/', ''));
    if (p.startsWith('/stream/') && method === 'GET') {
      if (!vid) return bad(404, 10003, 'not found');
      return ok({ uid: vid.uid, readyToStream: vid.state === 'ready', status: { state: vid.state }, duration: vid.duration,
        preview: `${STREAM_HOST}/${vid.uid}/watch`, thumbnail: `${STREAM_HOST}/${vid.uid}/thumbnails/thumbnail.jpg`, playback: { hls: `${STREAM_HOST}/${vid.uid}/manifest/video.m3u8` } });
    }
    if (p.startsWith('/stream/') && method === 'DELETE') { if (!vid) return bad(404, 10003, 'not found'); cf.videos.delete(vid.uid); return new Response(null, { status: 200 }); }
    return bad(404, 7003, 'no route for ' + method + ' ' + p);
  };
  return cf;
}

async function setup(t, { connected = true } = {}) {
  const worker = await loadWorker(), cf = fakeCloudflare(), realFetch = globalThis.fetch;
  globalThis.fetch = cf.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const DB = makeD1(), MEDIA = makeR2(), pending = [];
  const env = { DB, MEDIA, ADMIN_KEY: 'SuperSecretAdminKey123!', ASSETS: { fetch: () => new Response('ok') }, ...(connected ? { CF_ACCOUNT_ID: ACCOUNT, CF_MEDIA_TOKEN: TOKEN } : {}) };
  const ctx = { waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})); } };
  const req = (reqPath, { method = 'GET', token, json, body } = {}) => worker.fetch(new Request('https://example.test' + reqPath, {
    method, body: json ? JSON.stringify(json) : body,
    headers: { 'cf-connecting-ip': '10.0.0.1', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(json ? { 'content-type': 'application/json' } : {}) },
  }), env, ctx);
  const token = (await (await req('/api/login', { method: 'POST', json: { key: env.ADMIN_KEY, name: 'Admin' } })).json()).token;
  const put = async (name, bytes, extra = '') => {
    const r = await req(`/api/files?name=${name}&size=${bytes.byteLength}${extra}`, { method: 'POST', token, body: bytes });
    assert.equal(r.status, 200, name); return r.json();
  };
  const post = async (type, data) => { const r = await req('/api/items', { method: 'POST', token, json: { type, mob: 'ro', data } }); assert.equal(r.status, 200, type); return r.json(); };
  const file = key => DB._db.prepare('SELECT * FROM files WHERE key = ?').get(key);
  const mine = async () => (await req('/api/mine', { token })).json();
  return { worker, cf, env, DB, MEDIA, req, token, put, post, file, mine };
}
const bytes = (n, fill = 7) => new Uint8Array(n).fill(fill);

test('photos go to Cloudflare Images: one upload, two sizes, /media/* redirects, Trash still hides, delete removes it there', async t => {
  const { cf, MEDIA, req, token, put, post, file, mine } = await setup(t);
  const a = await put('beach.webp', bytes(5000));
  assert.equal(a.store, 'images');
  assert.equal(MEDIA._map.size, 0, 'nothing in R2');
  assert.equal(cf.images.size, 1);
  assert.deepEqual([...cf.variants].sort(), ['full', 'thumb']);
  assert.deepEqual(cf.variantOptions.thumb, { fit: 'scale-down', metadata: 'none', width: 640, height: 640 });
  assert.equal(cf.images.get('img-1').type, 'image/webp');
  assert.equal(cf.images.get('img-1').meta.key, a.key);
  assert.match(a.key, /^image\/\d{4}-\d{2}\/[a-f0-9]{24}\.webp$/, 'the key keeps its usual shape');

  // the two sizes are made once, not for every photo
  await put('second.jpg', bytes(3000));
  assert.equal(cf.calls.filter(c => c === 'POST /images/v1/variants').length, 2);

  const big = await req('/media/' + a.key), small = await req('/media/' + a.key + '?v=thumb');
  assert.equal(big.status, 302);
  assert.equal(big.headers.get('location'), 'https://imagedelivery.net/HASH123/img-1/full');
  assert.equal(small.headers.get('location'), 'https://imagedelivery.net/HASH123/img-1/thumb');
  assert.equal(big.headers.get('cache-control'), 'public, max-age=2592000');

  // a photo post needs no separate small photo any more
  const item = await post('media', { key: a.key, thumb: '', caption: 'Beach' });
  assert.equal(item.thumb, '');
  assert.equal((await req(`/api/items/${item.id}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await req('/media/' + a.key)).status, 404, 'in Trash: hidden');
  assert.equal(cf.images.size, 2, 'in Trash: still stored');
  assert.equal((await req(`/api/items/${item.id}/restore`, { method: 'POST', token })).status, 200);
  assert.equal((await req('/media/' + a.key)).status, 302);
  assert.equal((await req(`/api/items/${item.id}?permanent=1`, { method: 'DELETE', token })).status, 200);
  assert.ok(!cf.images.has('img-1'), 'deleted in Cloudflare Images');
  assert.equal(file(a.key), undefined);

  const status = (await mine()).cloud;
  assert.equal(status.on, true);
  assert.deepEqual(status.images, { count: 1, max: 100000 });
  assert.equal(status.error, null);
  assert.deepEqual(cf.strangers, []);
});

test('documents stay in R2; photos Images cannot take (too big, AVIF) stay in R2 too', async t => {
  const { cf, MEDIA, req, put, mine } = await setup(t);
  const pdf = await put('programme.pdf', new TextEncoder().encode('%PDF-1.7'));
  const avif = await put('odd.avif', bytes(100));
  const huge = await put('huge.png', bytes(10 * MB + 1));
  assert.deepEqual([pdf.store, avif.store, huge.store], ['r2', 'r2', 'r2']);
  assert.equal(cf.images.size, 0);
  assert.equal(MEDIA._map.size, 3);
  assert.equal((await req('/media/' + huge.key)).status, 200);
  assert.equal((await mine()).storage.usedBytes, 8 + 100 + 10 * MB + 1);
});

test('a small video goes to Cloudflare Stream and plays through its player', async t => {
  const { cf, MEDIA, req, put, post, file, mine } = await setup(t);
  const v = await put('trip.mp4', bytes(4000), '&dur=42.5');
  assert.equal(v.store, 'stream');
  assert.equal(MEDIA._map.size, 0);
  const [video] = cf.videos.values();
  assert.equal(video.bytes, 4000);
  assert.equal(video.name, 'trip.mp4');
  assert.ok(cf.calls.includes('POST /stream') && !cf.calls.some(c => c.startsWith('PATCH')), 'one plain request, no tus');
  assert.deepEqual({ store: file(v.key).store, ref: file(v.key).ref, dur: file(v.key).dur, ready: file(v.key).ready, url: file(v.key).url },
    { store: 'stream', ref: video.uid, dur: 42.5, ready: 0, url: `${STREAM_HOST}/${video.uid}` });

  const poster = await put('trip-poster.webp', bytes(900));
  const item = await post('media', { key: v.key, thumb: poster.key, w: 1920, h: 1080 });
  assert.equal(item.kind, 'video');
  const material = await post('material', { cat: 'a', title: 'Our film', key: (await put('film.mov', bytes(2000))).key });

  // the public list marks which videos live in Stream; photos and R2 files carry no mark
  const list = await (await req('/api/content')).json();
  assert.equal(list.find(x => x.id === item.id).sv, 1);
  assert.equal(list.find(x => x.id === material.id).sv, 1);

  const play = await req('/media/' + v.key), auto = await req('/media/' + v.key + '?autoplay=1'), pic = await req('/media/' + v.key + '?v=poster');
  const posterUrl = `${STREAM_HOST}/${video.uid}/thumbnails/thumbnail.jpg?time=1s&width=960&height=960&fit=clip`;
  assert.equal(play.status, 302);
  assert.equal(play.headers.get('location'), `${STREAM_HOST}/${video.uid}/iframe?poster=${encodeURIComponent(posterUrl)}`);
  assert.equal(auto.headers.get('location'), `${STREAM_HOST}/${video.uid}/iframe?poster=${encodeURIComponent(posterUrl)}&autoplay=true`);
  assert.equal(pic.headers.get('location'), posterUrl);

  // once Stream has finished the video, its real length replaces the one the browser reported
  let status = (await mine()).cloud.stream;
  assert.deepEqual({ videos: status.videos, pending: status.pending, failed: status.failed }, { videos: 2, pending: 2, failed: 0 });
  video.state = 'ready'; video.duration = 61.2; cf.usedMinutes = 1.02;
  status = (await mine()).cloud.stream;
  assert.equal(status.pending, 1);
  assert.equal(file(v.key).ready, 1);
  assert.equal(file(v.key).dur, 61.2);
  assert.equal(status.minutes, 1);
  assert.equal(status.max, 1000);
  assert.deepEqual(cf.strangers, []);
});

test('a large video reaches Stream in 20 MB parts, survives a lost answer, and must be complete before it can be published', async t => {
  const { cf, MEDIA, req, token, file } = await setup(t);
  const size = PART + 1234;
  const start = await (await req(`/api/files/parts?name=long.mov&size=${size}&dur=600`, { method: 'POST', token })).json();
  assert.equal(start.store, 'stream');
  assert.equal(start.partSize, PART);
  const [video] = cf.videos.values();
  assert.equal(video.length, size);
  assert.equal(video.meta, 'name ' + Buffer.from('long.mov').toString('base64'));
  const part = (n, data) => req(`/api/files/parts?key=${encodeURIComponent(start.key)}&n=${n}`, { method: 'PUT', token, body: data });

  assert.equal((await part(2, bytes(1234))).status, 502, 'part 2 before part 1 is refused by Stream');
  assert.match((await (await req('/api/mine', { token })).json()).cloud.error.msg, /^HTTP 409 at byte 20971520 of 1234 \(api\.cloudflare\.com, offset 0\)/, 'the error says what happened');
  assert.equal((await part(1, bytes(1000))).status, 400, 'a short first part is refused');
  assert.equal((await req(`/api/files/parts/done?key=${encodeURIComponent(start.key)}`, { method: 'POST', token, json: { parts: [] } })).status, 400, 'not complete yet');

  cf.dropAckOnce = true;   // Stream stored part 1 but its answer got lost: the server checks and carries on
  assert.equal((await part(1, bytes(PART))).status, 200);
  assert.equal(video.bytes, PART);
  assert.equal((await part(1, bytes(PART))).status, 200, 'the browser retrying the same part is harmless');
  assert.equal(video.bytes, PART);
  assert.equal((await part(2, bytes(1234))).status, 200);
  assert.equal(video.bytes, size);

  const done = await req(`/api/files/parts/done?key=${encodeURIComponent(start.key)}`, { method: 'POST', token, json: { parts: [{ partNumber: 1, etag: 'x' }] } });
  assert.equal(done.status, 200);
  assert.deepEqual(await done.json(), { key: start.key, size, store: 'stream' });
  assert.equal(file(start.key).upload_id, null);
  assert.equal(file(start.key).dur, 600);
  assert.equal(MEDIA._map.size, 0);
  assert.equal((await req('/api/items', { method: 'POST', token, json: { type: 'media', mob: 'ro', data: { key: start.key } } })).status, 200);

  // giving up half-way removes the video from Stream
  const second = await (await req(`/api/files/parts?name=x.mp4&size=${PART * 2}`, { method: 'POST', token })).json();
  assert.equal(cf.videos.size, 2);
  assert.equal((await req(`/api/files/parts?key=${encodeURIComponent(second.key)}`, { method: 'DELETE', token })).status, 200);
  assert.equal(cf.videos.size, 1);
  assert.equal(file(second.key), undefined);
  assert.deepEqual(cf.strangers, []);
});

test('the API token is never sent to an upload address outside api.cloudflare.com', async t => {
  const { cf, req, token } = await setup(t);
  cf.uploadHost = 'https://upload.cloudflarestream.com';
  const start = await (await req(`/api/files/parts?name=clip.mp4&size=3000`, { method: 'POST', token })).json();
  assert.equal(start.store, 'stream');
  assert.equal((await req(`/api/files/parts?key=${encodeURIComponent(start.key)}&n=1`, { method: 'PUT', token, body: bytes(3000) })).status, 200);
  assert.ok(cf.calls.includes('PATCH https://upload.cloudflarestream.com/tus/' + [...cf.videos.keys()][0]));
  assert.deepEqual(cf.strangers, []);

  // the page can ask for R2 when a try in Stream did not work: nothing is sent to Cloudflare then
  const before = cf.calls.length;
  assert.equal((await (await req(`/api/files/parts?name=again.mp4&size=3000&r2=1`, { method: 'POST', token })).json()).store, 'r2');
  assert.equal((await (await req(`/api/files?name=again2.mp4&size=4&r2=1`, { method: 'POST', token, body: bytes(4) })).json()).store, 'r2');
  assert.equal(cf.calls.length, before);
});

test('when Images or Stream fail, or Stream is full, the upload still works and lands in R2', async t => {
  const { cf, MEDIA, req, token, put, mine, file } = await setup(t);
  cf.failImages = true; cf.failStream = true;
  const photo = await put('a.jpg', bytes(2000)), clip = await put('a.mp4', bytes(3000));
  assert.deepEqual([photo.store, clip.store], ['r2', 'r2']);
  assert.equal(MEDIA._map.size, 2);
  assert.equal((await req('/media/' + photo.key + '?v=thumb')).status, 200, 'served from R2 as before');
  const big = await (await req(`/api/files/parts?name=b.mp4&size=${PART * 2}`, { method: 'POST', token })).json();
  assert.equal(big.store, 'r2');
  const err = (await mine()).cloud.error;
  assert.equal(err.where, 'stream upload');
  assert.match(err.msg, /HTTP 500/);

  // back to normal, but the 1,000 minutes are used up: videos go to R2, photos still go to Images
  cf.failImages = false; cf.failStream = false; cf.usedMinutes = 999.5;
  await mine();   // the admin panel asks Stream for the minutes again
  const full = await put('late.mp4', bytes(3000), '&dur=120');
  assert.equal(full.store, 'r2');
  assert.equal(cf.videos.size, 0);
  assert.equal((await put('fits.mp4', bytes(3000), '&dur=20')).store, 'stream');
  assert.equal((await put('ok.png', bytes(100))).store, 'images');
  assert.equal(file(full.key).store, 'r2');
});

test('a failed delete in Images / Stream is not forgotten: the file stays hidden and the hourly cleanup tries again', async t => {
  const { cf, req, token, put, post, file, DB, env } = await setup(t);
  const a = await put('a.webp', bytes(500));
  const item = await post('media', { key: a.key });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => (new Request(input, init).method === 'DELETE' ? new Response('{"success":false,"errors":[{"code":1,"message":"busy"}]}', { status: 503 }) : realFetch(input, init));
  assert.equal((await req(`/api/items/${item.id}?permanent=1`, { method: 'DELETE', token })).status, 200);
  globalThis.fetch = realFetch;
  assert.equal(cf.images.size, 1, 'still in Images');
  assert.deepEqual({ item_id: file(a.key).item_id, hidden: file(a.key).hidden }, { item_id: null, hidden: 1 });
  assert.equal((await req('/media/' + a.key)).status, 404);

  // the next cleanup (it runs at most once an hour, on a fresh server start here) finishes the job
  DB._db.prepare('UPDATE files SET created = ? WHERE key = ?').run(Date.now() - 25 * 3600 * 1000, a.key);
  const again = await loadWorker(), pending = [];
  await again.fetch(new Request('https://example.test/api/me', { headers: { authorization: 'Bearer ' + token } }), env, { waitUntil: p => pending.push(p) });
  await Promise.all(pending);
  assert.equal(cf.images.size, 0);
  assert.equal(file(a.key), undefined);
});

test('an unfinished Stream upload older than a day is removed from Stream', async t => {
  const { cf, req, token, file, DB, env } = await setup(t);
  const start = await (await req(`/api/files/parts?name=left.mp4&size=${PART * 3}`, { method: 'POST', token })).json();
  assert.equal(cf.videos.size, 1);
  DB._db.prepare('UPDATE files SET created = ? WHERE key = ?').run(Date.now() - 25 * 3600 * 1000, start.key);
  const again = await loadWorker(), pending = [];
  await again.fetch(new Request('https://example.test/api/me', { headers: { authorization: 'Bearer ' + token } }), env, { waitUntil: p => pending.push(p) });
  await Promise.all(pending);
  assert.equal(cf.videos.size, 0);
  assert.equal(file(start.key), undefined);
});

test('without CF_ACCOUNT_ID and CF_MEDIA_TOKEN nothing changes: everything is stored in R2 and Cloudflare is never called', async t => {
  const { cf, MEDIA, req, put, mine } = await setup(t, { connected: false });
  const photo = await put('a.webp', bytes(800)), clip = await put('a.mp4', bytes(900));
  assert.deepEqual([photo.store, clip.store], ['r2', 'r2']);
  assert.equal(MEDIA._map.size, 2);
  assert.equal((await req('/media/' + clip.key)).status, 200);
  assert.deepEqual((await mine()).cloud, { on: false });
  assert.deepEqual(cf.calls, []);
  const list = await (await req('/api/content')).json();
  assert.ok(list.every(x => !x.sv));
});

test('an older database gets the new columns and keeps serving its R2 files', async t => {
  const worker = await loadWorker(), cf = fakeCloudflare(), realFetch = globalThis.fetch;
  globalThis.fetch = cf.fetch; t.after(() => { globalThis.fetch = realFetch; });
  const DB = makeD1(), MEDIA = makeR2();
  DB._db.exec(`
    CREATE TABLE files (key TEXT PRIMARY KEY, device_id TEXT NOT NULL, size INTEGER NOT NULL, cls TEXT NOT NULL, name TEXT, upload_id TEXT, item_id TEXT, hidden INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
    INSERT INTO files (key, device_id, size, cls, name, created) VALUES ('image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp', 'd1', 3, 'image', 'old.webp', 1);
  `);
  await MEDIA.put('image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp', new Uint8Array([1, 2, 3]).buffer);
  const env = { DB, MEDIA, ADMIN_KEY: 'SuperSecretAdminKey123!', CF_ACCOUNT_ID: ACCOUNT, CF_MEDIA_TOKEN: TOKEN, ASSETS: { fetch: () => new Response('ok') } };
  const res = await worker.fetch(new Request('https://example.test/media/image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp?v=thumb'), env, { waitUntil() {} });
  assert.equal(res.status, 200);
  const cols = DB._db.prepare('PRAGMA table_info(files)').all().map(c => c.name);
  for (const col of ['store', 'ref', 'url', 'dur', 'sent', 'ready']) assert.ok(cols.includes(col), col);
  assert.equal(DB._db.prepare('SELECT store FROM files').get().store, 'r2');
});

test('pages: Stream videos open in the player with a poster, photos use the small size in lists', async () => {
  const vc = new VirtualConsole();
  const dom = new JSDOM('<!doctype html><body><main></main></body>', { url: 'https://example.test/gallery.html', runScripts: 'outside-only', virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.scrollTo = () => {};
  w.Element.prototype.getAnimations = () => [];
  const read = f => readFileSync(path.join(root, 'assets/js', f), 'utf8');
  w.eval(read('data.js'));
  const ro = w.SITE.mobilities[0], stop = ro.stops[0].id;
  w.CLOUD = [
    { id: '1', type: 'media', mob: ro.id, t: 1, kind: 'photo', key: 'image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp', thumb: '', caption: 'New photo', stop, gallery: true, map: true },
    { id: '2', type: 'media', mob: ro.id, t: 2, kind: 'photo', key: 'image/2026-11/bbbbbbbbbbbbbbbbbbbbbbbb.webp', thumb: 'image/2026-11/cccccccccccccccccccccccc.webp', caption: 'Old photo', stop: '', gallery: true, map: false },
    { id: '3', type: 'media', mob: ro.id, t: 3, kind: 'video', key: 'video/2026-11/dddddddddddddddddddddddd.mp4', thumb: 'image/2026-11/eeeeeeeeeeeeeeeeeeeeeeee.webp', caption: 'Stream video', stop: '', gallery: true, map: false, sv: 1 },
    { id: '4', type: 'media', mob: ro.id, t: 4, kind: 'video', key: 'video/2026-11/ffffffffffffffffffffffff.mov', thumb: '', caption: 'No poster', stop: '', gallery: true, map: false, sv: 1 },
    { id: '5', type: 'media', mob: ro.id, t: 5, kind: 'video', key: 'video/2026-11/000000000000000000000000.mp4', thumb: '', caption: 'R2 video', stop: '', gallery: true, map: false },
    { id: '6', type: 'material', mob: ro.id, t: 6, cat: 'a', slot: '', title: 'Film', by: '', key: 'video/2026-11/111111111111111111111111.mp4', sv: 1 },
  ];
  w.eval(read('cloud.js'));
  w.eval(read('layout.js'));
  const by = c => w.SITE.allMedia().find(m => m.caption === c);
  assert.equal(by('New photo').thumb, '/media/image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp?v=thumb');
  assert.equal(by('New photo').src, '/media/image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp');
  assert.equal(by('Old photo').thumb, '/media/image/2026-11/cccccccccccccccccccccccc.webp');
  assert.deepEqual({ src: by('Stream video').src, embed: by('Stream video').embed, thumb: by('Stream video').thumb },
    { src: '', embed: '/media/video/2026-11/dddddddddddddddddddddddd.mp4?autoplay=1', thumb: '/media/image/2026-11/eeeeeeeeeeeeeeeeeeeeeeee.webp' });
  assert.equal(by('No poster').thumb, '/media/video/2026-11/ffffffffffffffffffffffff.mov?v=poster');
  assert.deepEqual({ src: by('R2 video').src, embed: by('R2 video').embed }, { src: '/media/video/2026-11/000000000000000000000000.mp4', embed: '' });
  assert.equal(ro.materials.find(x => x.title === 'Film').stream, true);

  const tile = w.UI.tile;
  assert.match(tile(by('Stream video')), /<img src="\/media\/image\/2026-11\/e{24}\.webp"[^>]*><span class="play-badge">/);
  assert.match(tile(by('No poster')), /data-poster="\/media\/video\/2026-11\/f{24}\.mov\?v=poster"/);
  assert.match(tile(by('R2 video')), /<video src="\/media\/video\/2026-11\/0{24}\.mp4"/);
  assert.match(tile(by('New photo')), /<img src="\/media\/image\/2026-11\/a{24}\.webp\?v=thumb"/);
  w.close();
});

test('site files under /media/ (the background videos) are not swallowed by the upload server', async t => {
  for (const connected of [true, false]) {
    const { env, req } = await setup(t, { connected });
    env.ASSETS = { fetch: r => new Response('site file ' + new URL(r.url).pathname) };
    assert.equal(await (await req('/media/fundal-1.mp4')).text(), 'site file /media/fundal-1.mp4');
    assert.equal(await (await req('/media/%E0%A4%A')).text(), 'site file /media/%E0%A4%A');
    // an address shaped like an upload that does not exist is still a plain 404
    assert.equal((await req('/media/image/2026-11/aaaaaaaaaaaaaaaaaaaaaaaa.webp')).status, 404);
  }
});
