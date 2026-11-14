/* Continutul paginilor, construit din data.js */
window.PageControllers = window.PageControllers || {};
window.PageControllers.content = function (signal) {
const S = window.SITE, U = window.UI, { I, esc, tx, tile } = U;
const page = document.body.dataset.page;
const $ = id => document.getElementById(id);
const mobName = id => (S.mob(id) || {}).city || '';
// linkurile care deschid alt tab spun asta si cititoarelor de ecran
const newTab = '<span class="sr"> (opens in a new tab)</span>';

/* ---------- harta Europei: cele trei orase si drumul dintre ele ---------- */
U.europe = ({ active = '', interactive = false, slice = false, labels = true } = {}) => {
  const E = window.EUROPE; if (!E) return '';
  const C = E.cities, order = S.mobilities.map(m => m.id);   // ordinea mobilitatilor: Brasov, Orsay, Fjerritslev
  const arc = (a, b, bend) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    return `Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${b[0]} ${b[1]}`;
  };
  const route = `M${C.ro[0]} ${C.ro[1]} ${arc(C.ro, C.fr, 0.12)} ${arc(C.fr, C.dk, -0.22)}`;
  const lab = { fr: [-18, 0, 'end'], dk: [18, 0, 'start'], ro: [18, 0, 'start'] };
  const cities = order.map(id => {
    const m = S.mob(id), [x, y] = C[id], [dx, dy, anchor] = lab[id];
    const attrs = interactive ? ` tabindex="0" role="button" aria-label="${esc(m.city)}, ${esc(m.country)}" aria-pressed="${id === active}"` : '';
    return `<g class="city${id === active ? ' on' : ''}" data-mob="${id}"${attrs}>
      <circle class="halo" cx="${x}" cy="${y}" r="20"/><circle class="core" cx="${x}" cy="${y}" r="7.5" fill="#fff"/>
      ${labels ? `<text x="${x + dx}" y="${y + dy - 2}" text-anchor="${anchor}">${esc(m.city)}</text>
      <text class="sub" x="${x + dx}" y="${y + dy + 18}" text-anchor="${anchor}">${esc(m.country).toUpperCase()} · ${m.n}</text>` : ''}
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 ${E.W} ${E.H}" preserveAspectRatio="xMidYMid ${slice ? 'slice' : 'meet'}" aria-hidden="${interactive ? 'false' : 'true'}">
    <path d="${E.land}" fill="rgba(255,255,255,.045)" stroke="rgba(255,255,255,.16)" stroke-width="1" stroke-linejoin="round"/>
    ${order.map(id => `<path d="${E[id]}" fill="rgba(61,107,255,.24)" stroke="rgba(130,165,255,.65)" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}
    <path d="${route}" fill="none" stroke="rgba(255,204,0,.25)" stroke-width="9" style="filter:blur(5px)"/>
    <path d="${route}" fill="none" stroke="#FFCC00" stroke-width="2.2" stroke-dasharray="2 8" stroke-linecap="round"/>
    ${cities}
  </svg>`;
};

/* ---------- cardul unui articol din jurnal ---------- */
const entryCard = (e, i = 0) => `
  <a class="glass card entry" href="journal.html#${esc(e.id)}" data-reveal style="--d:${(i % 3) * 0.08}s">
    ${tile({ type: 'photo', caption: e.title, stop: e.id, place: mobName(e.mob), src: e.cover || '' })}
    <div class="entry-in">
      <div class="entry-meta"><span class="tag b">${tx(e.day)}</span><span>${tx(e.date)} · ${esc(mobName(e.mob))}</span></div>
      <h3>${tx(e.title)}</h3>
      <p>${tx(e.excerpt)}</p>
      <div class="byline">${e.author ? `By <b>${tx(e.author)}</b> · ` : ''}${tx(e.min)} min read</div>
    </div>
  </a>`;

/* ================= ABOUT ================= */
if (page === 'about') {
  const P = S.project;
  $('info').innerHTML = `<dl>${[
    ['Project name', P.name], ['Programme', P.programme], ['Project code', P.code],
    ['Schools', S.schools.map(s => s.city).join(' · ')],
  ].map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${tx(v)}</dd></div>`).join('')}</dl>`;
  $('team').innerHTML = S.team.map((t, i) => `
    <div class="glass card person" data-reveal style="--d:${i * 0.06}s">
      ${t.photo ? `<div class="media" style="aspect-ratio:1;border-radius:18px"><img src="${esc(t.photo)}" alt="${esc(t.name)}" loading="lazy"></div>` : tile({ type: 'photo', caption: t.name + i, stop: t.org, place: 'Portrait' })}
      <div class="who"><b>${tx(t.name)}</b><span>${esc(t.role)}</span><small>${esc(t.org)}</small></div>
    </div>`).join('');
}

/* ================= PARTNERS ================= */
if (page === 'partners') {
  $('schools').innerHTML = S.schools.map(s => `
    <article class="glass school" id="${s.id}" data-reveal>
      ${s.photo
        ? `<div class="school-media media"><img src="${esc(s.photo)}" alt="${esc(s.name)}" loading="lazy" decoding="async" style="position:absolute;inset:0"><span class="big-n" aria-hidden="true">${s.n}</span></div>`
        : `<div class="school-media ph" style="--px:${20 + U.hash(s.id) % 60}%">${I.photo}<span>Coming soon</span><span class="big-n" aria-hidden="true">${s.n}</span></div>`}
      <div class="school-txt">
        <div class="row"><span class="tag">${esc(s.country)}</span><span class="tag y">Mobility ${s.n} · ${tx(s.date)}</span></div>
        <h2 class="h2">${esc(s.name)}</h2>
        <p class="muted">${tx(s.text)}</p>
        <dl class="facts">
          <div><dt>Coordinating teacher</dt><dd>${tx(s.teacher)}</dd></div>
          <div><dt>Students</dt><dd>${tx(s.students)}</dd></div>
          <div><dt>City</dt><dd>${esc(s.city)}</dd></div>
        </dl>
        <div class="btn-row">
          <a class="btn btn--solid" href="journey.html#${s.id}">The trip to ${esc(s.city)} ${I.arrow}</a>
          ${s.url ? `<a class="btn glass" href="${esc(s.url)}" target="_blank" rel="noopener">School website${newTab} ${I.ext}</a>` : `<span class="btn glass" aria-disabled="true">School website · ${U.SOON}</span>`}
        </div>
      </div>
    </article>`).join('');
}

/* ================= JOURNAL ================= */
if (page === 'journal') {
  const root = $('journalRoot'), head = $('journalHead');
  const PAS = 6;
  let filtru = 'all', arata = PAS;
  const counts = id => S.journal.filter(e => id === 'all' || e.mob === id).length;
  function lista() {
    head.hidden = false;
    const list = S.journal.filter(e => filtru === 'all' || e.mob === filtru);
    // selectorul se construieste o singura data; la click se schimba doar lista de sub el
    if (!root.querySelector('.filters')) {
      const tabs = [['all', 'All'], ...S.mobilities.map(m => [m.id, m.city])];
      root.innerHTML = `
      <div class="filters" data-reveal>
        <div class="seg glass" role="group" aria-label="Filter by mobility">${tabs.map(([id, t]) => `<button type="button" data-f="${id}" aria-pressed="${id === filtru}">${t}<span class="n">${counts(id)}</span></button>`).join('')}</div>
      </div>
      <div id="journalList"></div>`;
      root.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { if (b.dataset.f === filtru) return; filtru = b.dataset.f; arata = PAS; lista(); }));
    }
    U.segSet(root.querySelector('.seg'), 'aria-pressed', b => b.dataset.f === filtru);
    $('journalList').innerHTML = `
      <div class="grid entries">${list.slice(0, arata).map(entryCard).join('') || '<p class="glass entries-empty">No entries yet. Check back soon.</p>'}</div>
      ${list.length > arata ? '<div class="more"><button class="btn glass" type="button" id="older">Load older entries</button></div>' : ''}`;
    const o = $('older'); if (o) o.addEventListener('click', () => { const n = arata; arata += PAS; lista(); root.querySelectorAll('.entry')[n]?.focus(); });
    U.reveal(root);
  }
  function articol(e) {
    head.hidden = true;
    const i = S.journal.indexOf(e), newer = S.journal[i - 1], older = S.journal[i + 1];
    document.title = `${e.title.replace(/[[\]]/g, '')} · Journal · Erasmus+`;
    root.innerHTML = `
      <article class="article">
        <a class="link-arrow back" href="journal.html">${I.back} All entries</a>
        <div class="entry-meta"><span class="tag b">${tx(e.day)}</span><span>${tx(e.date)} · ${esc(mobName(e.mob))}</span></div>
        <h1>${tx(e.title)}</h1>
        <div class="byline">${e.author ? `By <b>${tx(e.author)}</b> · ` : ''}${tx(e.min)} min read</div>
        ${tile({ type: 'photo', caption: e.title, stop: e.id, place: mobName(e.mob), src: e.coverFull || e.cover || '' }, 'cover')}
        <div class="glass article-body">${e.body.map(p => `<p>${tx(p)}</p>`).join('')}</div>
        ${e.photos?.length > 1 ? `<div class="article-photos">${e.photos.map((p, j) => `<button type="button" data-j="${j}" aria-label="Open ${esc(p.caption)}">${tile(p)}</button>`).join('')}</div>` : ''}
        <nav class="article-nav" aria-label="More entries">
          ${older ? `<a class="glass" href="#${esc(older.id)}"><span>Older</span><b>${tx(older.title)}</b></a>` : ''}
          ${newer ? `<a class="glass nx" href="#${esc(newer.id)}"><span>Newer</span><b>${tx(newer.title)}</b></a>` : ''}
        </nav>
      </article>`;
    root.querySelectorAll('.article-photos [data-j]').forEach(b => b.addEventListener('click', () => U.lightbox(e.photos, +b.dataset.j)));
  }
  function ruta() {
    let id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    const e = S.journal.find(x => x.id === id);
    if (e) { articol(e); scrollTo(0, 0); }
    else {
      if (S.mob(id)) filtru = id;
      document.title = 'Journal · Erasmus+';
      lista();
    }
  }
  addEventListener('hashchange', ruta, { signal });
  ruta();
}

/* ================= GALLERY ================= */
if (page === 'gallery') {
  const root = $('galRoot');
  const all = S.allMedia();
  const PAS = 16;
  let mob = 'all', tip = 'all', arata = PAS;
  const tabs = [['all', 'All'], ...S.mobilities.map(m => [m.id, m.city])];
  const tipuri = [['all', 'Photos + videos'], ['photo', 'Photos'], ['video', 'Videos']];
  // from = de la a cata poza incep cele noi (doar ele apar cu animatie)
  function deseneaza(from = 0) {
    const list = all.filter(m => (mob === 'all' || m.mob === mob) && (tip === 'all' || m.type === tip));
    let featDone = false;
    const items = list.slice(0, arata).map((m, i) => {
      let cls = '';
      if (!featDone && m.type === 'video') { cls = 'feat'; featDone = true; }
      else if (i % 7 === 3) cls = 'tall';
      else if (i % 11 === 8) cls = 'wide';
      return `<button type="button" class="${cls}${i >= from ? ' pop' : ''}" style="--i:${i - from}" data-i="${i}" aria-label="Open ${esc(m.caption)}">${tile(m)}</button>`;
    }).join('');
    // selectoarele se construiesc o singura data; la click se schimba doar pozele de sub ele
    if (!root.querySelector('.filters')) {
      root.innerHTML = `
      <div class="filters">
        <div class="seg glass" role="group" aria-label="Filter by mobility">${tabs.map(([id, t]) => `<button type="button" data-m="${id}" aria-pressed="${id === mob}">${t}</button>`).join('')}</div>
        <div class="seg glass" role="group" aria-label="Filter by type">${tipuri.map(([id, t]) => `<button type="button" data-t="${id}" aria-pressed="${id === tip}">${t}</button>`).join('')}</div>
      </div>
      <div id="galBody"></div>`;
      root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { if (b.dataset.m === mob) return; mob = b.dataset.m; arata = PAS; deseneaza(); }));
      root.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { if (b.dataset.t === tip) return; tip = b.dataset.t; arata = PAS; deseneaza(); }));
    }
    const [segM, segT] = root.querySelectorAll('.filters .seg');
    U.segSet(segM, 'aria-pressed', b => b.dataset.m === mob);
    U.segSet(segT, 'aria-pressed', b => b.dataset.t === tip);
    $('galBody').innerHTML = `
      <p class="gal-count" aria-live="polite">${list.length} ${list.length === 1 ? 'item' : 'items'}</p>
      <div class="gal" style="margin-top:14px">${items || '<p class="glass entries-empty" style="grid-column:1/-1">Nothing here yet.</p>'}</div>
      ${list.length > arata ? '<div class="more"><button class="btn glass" type="button" id="moreG">Load more</button></div>' : ''}`;
    root.querySelectorAll('.gal [data-i]').forEach(b => b.addEventListener('click', () => U.lightbox(list.slice(0, arata), +b.dataset.i)));
    const mo = $('moreG'); if (mo) mo.addEventListener('click', () => { const n = arata; arata += PAS; deseneaza(n); root.querySelector(`.gal [data-i="${n}"]`)?.focus(); });
  }
  const h = location.hash.slice(1); if (S.mob(h)) mob = h;
  deseneaza();
}

/* ================= CONTACT ================= */
if (page === 'contact') {
  const P = S.project;
  const mailOK = !/^\[/.test(P.email);
  $('write').innerHTML = `
    <div><span class="eyebrow">Write to us</span><p class="muted" style="margin-top:14px;max-width:460px">Questions about the project, the trips or this website? Send us an email. We usually answer in a few days.</p></div>
    ${mailOK ? `<a class="mail" href="mailto:${esc(P.email)}">${esc(P.email)}</a>` : `<span class="mail">${tx(P.email)}</span>`}
    <div class="btn-row">
      ${mailOK ? `<a class="btn btn--solid" href="mailto:${esc(P.email)}">${I.mail} Send an email</a>` : ''}
    </div>`;
  $('addrs').innerHTML = S.schools.map((s, i) => `
    <div class="glass card addr" data-reveal style="--d:${i * 0.06}s">
      <b>${esc(s.name)}</b><span>${esc(s.address)}</span>
      ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">School website${newTab} ${I.ext}</a>` : `<span>School website · ${U.SOON}</span>`}
    </div>`).join('');
}

/* ================= LEGAL ================= */
if (page === 'legal') {
  const P = S.project, mailOK = !/^\[/.test(P.email);
  document.querySelectorAll('[data-site-email]').forEach(el => {
    el.innerHTML = mailOK ? `<a href="mailto:${esc(P.email)}">${esc(P.email)}</a>` : tx(P.email);
  });
}

U.reveal();
};
