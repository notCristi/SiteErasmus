// Porneste site-ul pe calculatorul tau ca pe un site adevarat, la http://localhost:8080/site-v2/
// (dublu click pe porneste-site.bat). E nevoie de el doar ca sa vezi imaginile hartii din Journey:
// OpenStreetMap nu le da unei pagini deschise direct din fisier. Nu se copiaza pe site-ul live.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const PORT = 8080;
const ROOT = path.join(__dirname, '..', '..');   // folderul SiteErasmus (ca sa mearga si ../site/media)
const START = '/site-v2/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.pdf': 'application/pdf', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) { res.writeHead(400).end('Bad request'); return; }
  if (url === '/') { res.writeHead(302, { Location: START }).end(); return; }
  let file = path.join(ROOT, url);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!url.endsWith('/')) { res.writeHead(302, { Location: url + '/' }).end(); return; }
      file = path.join(file, 'index.html');
      return fs.stat(file, (e2, s2) => send(e2, s2));
    }
    send(err, st);
  });
  function send(err, st) {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found: ' + url); return; }
    const head = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    // video-urile si muzica au nevoie de bucati din fisier (Range), altfel nu pot sari la alt moment
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let a = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
      return;
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log(`\n  Portul ${PORT} e deja folosit. Probabil site-ul e deja pornit: deschide http://localhost:${PORT}${START}\n`);
  else console.log('\n  Eroare: ' + e.message + '\n');
  process.exitCode = 1;
});
server.listen(PORT, '127.0.0.1', () => {
  const adresa = `http://localhost:${PORT}${START}`;
  console.log(`\n  Site-ul merge la ${adresa}\n  Lasa fereastra asta deschisa cat lucrezi. Ca sa il opresti: inchide fereastra (sau Ctrl+C).\n`);
  if (!process.argv.includes('--no-open')) exec(process.platform === 'win32' ? `start "" "${adresa}"` : process.platform === 'darwin' ? `open "${adresa}"` : `xdg-open "${adresa}"`, () => {});
});
