const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');
const workerUrl = pathToFileURL(path.join(root, '_worker.js')).href;

globalThis.caches = globalThis.caches || {
  default: {
    async match() { return null; },
    async put() {},
    async delete() { return true; },
  },
};

let modSeq = 0;
async function loadWorker() {
  return (await import(`${workerUrl}?v=${++modSeq}`)).default;
}

function makeD1() {
  const db = new DatabaseSync(':memory:');
  const wrap = (sql, params = []) => ({
    bind(...args) { return wrap(sql, args); },
    async run() {
      const info = db.prepare(sql).run(...params);
      return { meta: { changes: Number(info.changes) } };
    },
    async first(col) {
      const row = db.prepare(sql).get(...params);
      if (!row) return null;
      return col ? row[col] : row;
    },
    async all() {
      return { results: db.prepare(sql).all(...params) };
    },
    _exec() {
      const info = db.prepare(sql).run(...params);
      return { meta: { changes: Number(info.changes) } };
    },
  });
  return {
    _db: db,
    prepare(sql) { return wrap(sql); },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(s._exec());
      return out;
    },
  };
}

function makeR2() {
  const map = new Map();
  let upSeq = 0;
  return {
    _map: map,
    async put(key, body, opts = {}) {
      const buf = body instanceof ArrayBuffer ? new Uint8Array(body) : new Uint8Array(await new Response(body).arrayBuffer());
      map.set(key, { bytes: buf, httpMetadata: opts.httpMetadata || {}, customMetadata: opts.customMetadata || {}, httpEtag: '"etag"' });
      return { key, size: buf.byteLength };
    },
    async createMultipartUpload(key, opts = {}) {
      const uploadId = 'up-' + (++upSeq);
      return {
        uploadId,
        async abort() {},
        async uploadPart(n, b) { return { partNumber: n, etag: 'e' + n }; },
        async complete() {
          map.set(key, { bytes: new Uint8Array([1, 2, 3]), httpMetadata: opts.httpMetadata || {}, customMetadata: opts.customMetadata || {}, httpEtag: '"mp"' });
          return { key, size: 100 };
        },
      };
    },
    resumeMultipartUpload(key, uploadId) {
      return {
        uploadId,
        async abort() {},
        async uploadPart(n) { return { partNumber: n, etag: 'e' + n }; },
        async complete() { return { key, size: 100 }; },
      };
    },
    async get(key) {
      const o = map.get(key);
      if (!o) return null;
      return {
        size: o.bytes.byteLength,
        httpEtag: o.httpEtag,
        customMetadata: o.customMetadata,
        body: new ReadableStream({ start(c) { c.enqueue(o.bytes); c.close(); } }),
        writeHttpMetadata(h) { if (o.httpMetadata.contentType) h.set('content-type', o.httpMetadata.contentType); },
      };
    },
    async delete(keys) {
      for (const k of Array.isArray(keys) ? keys : [keys]) map.delete(k);
    },
  };
}

function makeHarness(worker, envExtras = {}) {
  const DB = makeD1();
  const MEDIA = makeR2();
  const env = { DB, MEDIA, ADMIN_KEY: 'SuperSecretAdminKey123!', ASSETS: { fetch: () => new Response('ok') }, ...envExtras };
  const pending = [];
  const ctx = {
    waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})); },
    async flush() { await Promise.all(pending.splice(0)); },
  };
  const req = (reqPath, { method = 'GET', token, json, body, ip = '10.0.0.1' } = {}) => worker.fetch(
    new Request('https://example.test' + reqPath, {
      method,
      body: json ? JSON.stringify(json) : body,
      headers: {
        'cf-connecting-ip': ip,
        ...(token ? { authorization: 'Bearer ' + token } : {}),
        ...(json ? { 'content-type': 'application/json' } : {}),
      },
    }),
    env,
    ctx
  );
  return { DB, MEDIA, env, ctx, req };
}

test('schema migrates cleanly from older keys and files tables', async () => {
  const worker = await loadWorker();
  const DB = makeD1();
  DB._db.exec(`
    CREATE TABLE keys (id TEXT PRIMARY KEY, label TEXT NOT NULL, role TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
    CREATE TABLE files (key TEXT PRIMARY KEY, device_id TEXT NOT NULL, size INTEGER NOT NULL, cls TEXT NOT NULL, name TEXT, upload_id TEXT, created INTEGER NOT NULL);
  `);
  const env = { DB, MEDIA: makeR2(), ADMIN_KEY: 'SuperSecretAdminKey123!', ASSETS: { fetch: () => new Response('ok') } };
  const res = await worker.fetch(
    new Request('https://example.test/api/login', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '1.1.1.1', 'content-type': 'application/json' },
      body: JSON.stringify({ key: env.ADMIN_KEY, name: 'Cristi Admin' }),
    }),
    env,
    { waitUntil() {} }
  );
  assert.equal(res.status, 200);
  const keyCols = DB._db.prepare('PRAGMA table_info(keys)').all().map(c => c.name);
  const fileCols = DB._db.prepare('PRAGMA table_info(files)').all().map(c => c.name);
  for (const col of ['locked', 'max_devices', 'expires_at', 'quota_mb']) assert.ok(keyCols.includes(col));
  for (const col of ['hidden', 'item_id']) assert.ok(fileCols.includes(col));
});

test('school Wi-Fi per-IP rate limit allows 1000 tries and has no global lockout', async () => {
  const worker = await loadWorker();
  const { env, req } = makeHarness(worker);

  // 10 typos from shared school Wi-Fi IP still allow a legitimate login
  for (let i = 0; i < 10; i++) {
    const r = await req('/api/login', { method: 'POST', ip: '192.168.1.50', json: { key: 'typo-' + i, name: 'Elev' } });
    assert.equal(r.status, 401);
  }
  const okAfterTypos = await req('/api/login', { method: 'POST', ip: '192.168.1.50', json: { key: env.ADMIN_KEY, name: 'Admin' } });
  assert.equal(okAfterTypos.status, 200);

  // 1000 wrong tries on one attacker IP block that IP at the 1001st, while clean Admin IP is unaffected
  for (let i = 0; i < 1000; i++) {
    const r = await req('/api/login', { method: 'POST', ip: '9.9.9.9', json: { key: 'bad-' + i, name: 'Bot' } });
    assert.equal(r.status, 401);
  }
  const blocked = await req('/api/login', { method: 'POST', ip: '9.9.9.9', json: { key: env.ADMIN_KEY, name: 'Bot' } });
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error, 'too_many_tries');

  const cleanIp = await req('/api/login', { method: 'POST', ip: '2.2.2.2', json: { key: env.ADMIN_KEY, name: 'Real Admin' } });
  assert.equal(cleanIp.status, 200);
});

test('access keys: atomic max_devices, device kick + lockKey, key deletion', async () => {
  const worker = await loadWorker();
  const { env, req } = makeHarness(worker);
  const admTok = (await (await req('/api/login', { method: 'POST', json: { key: env.ADMIN_KEY, name: 'Admin' } })).json()).token;

  const createdKey = await (await req('/api/admin/keys', {
    method: 'POST',
    token: admTok,
    json: { label: '10A', role: 'student', key: 'ELEV-ATOM-9999', max_devices: 1 },
  })).json();

  const stu1Res = await req('/api/login', { method: 'POST', json: { key: 'ELEV-ATOM-9999', name: 'Elev 1' } });
  assert.equal(stu1Res.status, 200);
  const stu1 = await stu1Res.json();

  // Second device exceeds max_devices atomically
  const stu2Res = await req('/api/login', { method: 'POST', json: { key: 'ELEV-ATOM-9999', name: 'Elev 2' } });
  assert.equal(stu2Res.status, 403);
  assert.equal((await stu2Res.json()).error, 'device_limit');

  // Admin kicks student 1 and locks key for new logins
  const kickRes = await req(`/api/admin/devices/${stu1.me.id}/kick`, {
    method: 'POST',
    token: admTok,
    json: { lockKey: true, hideUploads: false },
  });
  assert.equal(kickRes.status, 200);
  assert.equal((await req('/api/me', { token: stu1.token })).status, 401);

  const lockedLogin = await req('/api/login', { method: 'POST', json: { key: 'ELEV-ATOM-9999', name: 'Elev Return' } });
  assert.equal(lockedLogin.status, 403);
  assert.equal((await lockedLogin.json()).error, 'key_locked');

  // Delete key completely
  assert.equal((await req(`/api/admin/keys/${createdKey.id}`, { method: 'DELETE', token: admTok })).status, 200);
  const { keys } = await (await req('/api/admin/keys', { token: admTok })).json();
  assert.equal(keys.length, 0);
});

test('file types by extension, PDF viewer headers, /media/* caching, Trash 404 blocking, and no cap on unfinished multipart uploads', async () => {
  const worker = await loadWorker();
  const { env, MEDIA, req } = makeHarness(worker);
  const admTok = (await (await req('/api/login', { method: 'POST', json: { key: env.ADMIN_KEY, name: 'Admin' } })).json()).token;

  // SVG is still refused (not on the extension list); the first bytes of a file are no longer inspected,
  // so a clip whose header looks unusual is not rejected any more
  assert.equal((await req('/api/files?name=x.svg&size=6', { method: 'POST', token: admTok, body: new TextEncoder().encode('<svg/>') })).status, 400);
  const oddMp4 = new Uint8Array([0x66, 0x74, 0x79, 0x70, 0x00, 0x00, 0x00, 0x00, 0x6D, 0x70, 0x34, 0x32]);
  assert.equal((await req('/api/files?name=odd.mp4&size=' + oddMp4.length, { method: 'POST', token: admTok, body: oddMp4 })).status, 200);

  // Upload valid PNG + valid PDF + valid DOCX
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  const pdfBytes = new TextEncoder().encode('%PDF-1.7\n...');
  const docxBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
  const pngKey = (await (await req('/api/files?name=a.png&size=' + pngBytes.length, { method: 'POST', token: admTok, body: pngBytes })).json()).key;
  const pdfKey = (await (await req('/api/files?name=prog.pdf&size=' + pdfBytes.length, { method: 'POST', token: admTok, body: pdfBytes })).json()).key;
  const docxKey = (await (await req('/api/files?name=doc.docx&size=' + docxBytes.length, { method: 'POST', token: admTok, body: docxBytes })).json()).key;

  // PNG and DOCX get sandbox CSP; PDF does NOT get sandbox so Chrome's PDF viewer works inline
  const pngRes = await req('/media/' + pngKey);
  assert.equal(pngRes.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.equal(pngRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(pngRes.headers.get('content-type'), 'image/png');
  assert.equal(pngRes.headers.get('cache-control'), 'public, max-age=2592000');   // no revalidation on every visit

  const docxRes = await req('/media/' + docxKey);
  assert.equal(docxRes.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.match(docxRes.headers.get('content-disposition'), /^attachment;/);

  const pdfRes = await req('/media/' + pdfKey);
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers.get('content-security-policy'), null);
  assert.equal(pdfRes.headers.get('x-content-type-options'), 'nosniff');
  assert.match(pdfRes.headers.get('content-disposition'), /^inline;/);

  // Publish media item, soft-delete -> /media/* becomes 404 while staying in R2 -> restore -> 200 again
  const item = await (await req('/api/items', { method: 'POST', token: admTok, json: { type: 'media', mob: 'ro', data: { key: pngKey } } })).json();
  assert.equal((await req('/media/' + pngKey)).status, 200);
  assert.equal((await req(`/api/items/${item.id}`, { method: 'DELETE', token: admTok })).status, 200);
  assert.ok(MEDIA._map.has(pngKey));
  assert.equal((await req('/media/' + pngKey)).status, 404);
  assert.equal((await req(`/api/items/${item.id}/restore`, { method: 'POST', token: admTok })).status, 200);
  assert.equal((await req('/media/' + pngKey)).status, 200);

  // More file types: spreadsheets, text, zip, sound and GIF are accepted; a material or a result can be any allowed file
  const up = async name => { const r = await req(`/api/files?name=${name}&size=4`, { method: 'POST', token: admTok, body: new Uint8Array([1, 2, 3, 4]) }); assert.equal(r.status, 200, name); return (await r.json()).key; };
  for (const name of ['t.xlsx', 't.xls', 't.ppsx', 't.odt', 't.ods', 't.odp', 't.rtf', 't.csv', 't.zip', 't.gif', 't.avif', 't.m4a', 't.wav', 't.ogg']) await up(name);
  for (const name of ['x.html', 'x.js', 'x.exe', 'x.svg']) assert.equal((await req(`/api/files?name=${name}&size=4`, { method: 'POST', token: admTok, body: new Uint8Array([1, 2, 3, 4]) })).status, 400, name);
  const xlsxRes = await req('/media/' + await up('table.xlsx'));
  assert.match(xlsxRes.headers.get('content-disposition'), /^attachment; filename="table.xlsx"/);
  const mp3Res = await req('/media/' + await up('song.mp3'));
  assert.equal(mp3Res.headers.get('content-type'), 'audio/mpeg');
  assert.match(mp3Res.headers.get('content-disposition'), /^inline;/);
  const txtRes = await req('/media/' + await up('notes.txt'));
  assert.equal(txtRes.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(txtRes.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  for (const name of ['clip.mp4', 'poster.webp', 'song2.mp3']) {
    const r = await req('/api/items', { method: 'POST', token: admTok, json: { type: 'material', mob: 'ro', data: { cat: 'a', title: name, key: await up(name) } } });
    assert.equal(r.status, 200, name);
  }
  assert.equal((await req('/api/items', { method: 'POST', token: admTok, json: { type: 'result', mob: 'ro', data: { sec: 0, text: 'Chart', key: await up('chart.png') } } })).status, 200);

  // No cap on unfinished multipart uploads: a dropped connection never locks the device out
  for (let i = 0; i < 6; i++) {
    assert.equal((await req(`/api/files/parts?name=big${i}.mp4&size=1024`, { method: 'POST', token: admTok })).status, 200);
  }
});

test('student and teacher sessions do not expire, admin ones do, and there is no daily upload limit', async () => {
  const worker = await loadWorker();
  const { DB, env, req } = makeHarness(worker);
  const admTok = (await (await req('/api/login', { method: 'POST', json: { key: env.ADMIN_KEY, name: 'Admin' } })).json()).token;
  const made = await (await req('/api/admin/keys', { method: 'POST', token: admTok, json: { label: 'Class', role: 'student' } })).json();
  const stuTok = (await (await req('/api/login', { method: 'POST', json: { key: made.key, name: 'Student' } })).json()).token;

  // Both sessions were created and last seen a year ago: the student is still signed in, the admin is not
  const yearAgo = Date.now() - 365 * 24 * 3600 * 1000;
  DB._db.prepare('UPDATE devices SET created = ?, seen = ?').run(yearAgo, yearAgo);
  assert.equal((await req('/api/mine', { token: stuTok })).status, 200);
  assert.equal((await req('/api/mine', { token: admTok })).status, 401);
  const admTok2 = (await (await req('/api/login', { method: 'POST', json: { key: env.ADMIN_KEY, name: 'Admin' } })).json()).token;

  // The student already uploaded 5 GB today: the next file still goes through
  const stuDev = DB._db.prepare("SELECT id FROM devices WHERE role != 'admin'").get().id;
  DB._db.prepare('INSERT INTO files (key, device_id, size, cls, created) VALUES (?, ?, ?, ?, ?)').run(`video/2026-11/${'b'.repeat(24)}.mp4`, stuDev, 5 * 1024 * 1024 * 1024, 'video', Date.now());
  const jpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
  assert.equal((await req('/api/files?name=a.jpg&size=4', { method: 'POST', token: stuTok, body: jpg })).status, 200);

  // A key turned off by the admin still signs its devices out
  assert.equal((await req(`/api/admin/keys/${made.id}`, { method: 'PUT', token: admTok2, json: { active: 0 } })).status, 200);
  assert.equal((await req('/api/mine', { token: stuTok })).status, 401);
});

test('orphan cleanup deletes >24h unlinked files even after >100 published files exist', async () => {
  const worker = await loadWorker();
  const { DB, MEDIA, env, ctx, req } = makeHarness(worker);

  // Force schema creation cleanly via public endpoint first (no login yet so lastCleanup stays 0)
  assert.equal((await req('/api/content')).status, 200);

  const oldTs = Date.now() - 48 * 3600 * 1000;
  // Seed 110 old published files that belong to an existing item (item_id set)
  for (let i = 0; i < 110; i++) {
    const k = `image/2026-10/${String(i).padStart(24, 'a')}.jpg`;
    await MEDIA.put(k, new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]));
    DB._db.prepare('INSERT INTO files (key, device_id, size, cls, item_id, created) VALUES (?, ?, ?, ?, ?, ?)').run(k, 'dev0', 100, 'image', 'item000000000001', oldTs);
  }
  // Seed an orphan file older than 24h with item_id = NULL after the 110 files
  const orphanKey = `image/2026-10/${'f'.repeat(24)}.jpg`;
  await MEDIA.put(orphanKey, new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]));
  DB._db.prepare('INSERT INTO files (key, device_id, size, cls, item_id, created) VALUES (?, ?, ?, ?, NULL, ?)').run(orphanKey, 'dev0', 100, 'image', oldTs);

  // Trigger maybeCleanup on first login
  const loginRes = await req('/api/login', { method: 'POST', json: { key: env.ADMIN_KEY, name: 'Admin' } });
  assert.equal(loginRes.status, 200);
  await ctx.flush();

  assert.ok(!MEDIA._map.has(orphanKey), 'Orphan file beyond 100 published files must be deleted');
  assert.equal(MEDIA._map.size, 110, 'Published files remain untouched');
});

test('upload.js renders student titles, key labels and device names without XSS execution', async () => {
  const html = readFileSync(path.join(root, 'upload.html'), 'utf8');
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'https://example.test/upload.html', runScripts: 'outside-only', virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.scrollTo = () => {};
  w.Element.prototype.getAnimations = () => [];
  const ctrl = new w.AbortController();
  for (const f of ['data.js', 'layout.js', 'upload.js']) w.eval(readFileSync(path.join(root, 'assets/js', f), 'utf8'));

  w.localStorage.setItem('erasmus-upload', JSON.stringify({
    token: 'a'.repeat(64),
    me: { id: 'admin1', role: 'admin', name: '<b>Admin</b>', label: 'Admin' },
  }));
  w.fetch = async (url) => {
    if (url === '/api/me') return new Response(JSON.stringify({ me: { id: 'admin1', role: 'admin', name: '<b>Admin</b>', label: 'Admin' } }), { status: 200 });
    if (url === '/api/mine') return new Response(JSON.stringify({
      items: [{ id: '0123456789abcdef', type: 'story', mob: 'ro', t: Date.now(), title: '<img src=x onerror=alert(1)>', uploader: '<svg onload=alert(2)>', own: false }],
      trash: [{ id: 'fedcba9876543210', type: 'media', mob: 'dk', t: Date.now(), deletedAt: Date.now(), kind: 'photo', caption: '<script>alert(3)</script>', uploader: 'Evil', own: false }],
      storage: { usedBytes: 12345678, maxBytes: 8500 * 1024 * 1024 },
    }), { status: 200 });
    if (url === '/api/admin/keys') return new Response(JSON.stringify({
      keys: [{
        id: '0123456789ab', label: '<img src=x onerror=alert(4)>', role: 'student', active: 1, locked: 1, max_devices: 5, expires_at: Date.now() + 86400000, quota_mb: 200,
        devices: 1, used_bytes: 5000000,
        deviceList: [{ id: '0011223344556677', name: '<script>xss</script>', created: Date.now(), seen: Date.now(), online: true, uploads: 1 }],
      }],
    }), { status: 200 });
    return new Response('{}', { status: 404 });
  };

  w.PageControllers.upload(ctrl.signal);
  await new Promise(r => setTimeout(r, 80));

  const aside = d.querySelector('.up-aside');
  assert.ok(aside);
  assert.equal(aside.querySelectorAll('img, svg[onload], script').length, 0);
  assert.ok(aside.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.ok(aside.textContent.includes('<img src=x onerror=alert(4)>'));
  assert.ok(aside.textContent.includes('<script>xss</script>'));
  assert.ok(aside.textContent.includes('Disconnect'));
  assert.ok(aside.textContent.includes('Trash (1)'));

  ctrl.abort();
  w.close();
});
