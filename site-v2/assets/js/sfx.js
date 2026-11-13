/* Sunete mici la click (SFX) si butonul comun de sunet din coltul stanga jos.
   Nu sunt fisiere audio: fiecare sunet e facut pe loc de browser (Web Audio), un ton scurt si moale.
   Butonul ramane pe tot site-ul: opreste/porneste atat muzica de la intro, cat si sunetele de click,
   iar cele 3 bare se misca doar cand chiar se aude un sunet. */
(() => {
const VOLUME = 0.7;   // cat de tare sunt toate sunetele: 0 = deloc, 1.4 = dublu fata de acum
// f0 -> f1 = de la ce nota la ce nota aluneca (Hz), dur = cat tine (secunde), gain = taria lui
const SOUNDS = {
  tap:    { f0: 420, f1: 270, dur: 0.07, gain: 0.10 },   // click obisnuit: un "toc" moale
  select: { f0: 660, f1: 540, dur: 0.06, gain: 0.07 },   // o optiune dintr-un selector, un tab, un pin de pe harta
  go:     { f0: 330, f1: 520, dur: 0.13, gain: 0.07 },   // deschizi o pagina: urca usor
  open:   { f0: 392, f1: 587, dur: 0.15, gain: 0.07 },   // deschizi o poza
  close:  { f0: 520, f1: 300, dur: 0.12, gain: 0.07 },   // inchizi ceva: coboara
};
const KEY_OFF = 'erasmus-music-off';
let off = false;
try { off = localStorage.getItem(KEY_OFF) === '1'; } catch (e) {}

/* ---------- butonul din colt (ramane pe toate paginile) ---------- */
let btn = document.getElementById('music');
if (!btn) {
  document.body.insertAdjacentHTML('beforeend',
    '<button class="music" id="music" type="button" aria-label="Sound" title="Sound on / off"><i></i><i></i><i></i></button>');
  btn = document.getElementById('music');
}
const active = new Set(), listeners = new Set();
let interceptor = null, pulseTimer = 0;

function syncTheme() {
  const html = document.documentElement, cream = document.getElementById('cream');
  const creamOn = document.body.dataset.page === 'home' && !html.classList.contains('skip-intro') && cream && cream.style.display !== 'none';
  btn.classList.toggle('dark', !creamOn);
}
function syncBars() {
  const on = !off && active.size > 0;
  btn.classList.toggle('on', on);
  if (on) { btn.classList.remove('pulse'); clearTimeout(pulseTimer); }
  btn.setAttribute('aria-pressed', !off);
}
function setActive(key, on) {
  const had = active.has(key);
  if (on && !had) active.add(key);
  else if (!on && had) active.delete(key);
  else return;
  syncBars();
}
function pulse(ms = 380) {
  if (off || document.hidden || btn.classList.contains('on')) return;
  btn.classList.remove('pulse');
  void btn.offsetWidth;
  btn.classList.add('pulse');
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => btn.classList.remove('pulse'), ms);
}
function toggle() {
  off = !off;
  try { if (off) localStorage.setItem(KEY_OFF, '1'); else localStorage.removeItem(KEY_OFF); } catch (e) {}
  if (off) { active.clear(); btn.classList.remove('pulse'); clearTimeout(pulseTimer); }
  syncBars();
  listeners.forEach(fn => fn(off));
}

btn.addEventListener('click', () => {
  if (interceptor && interceptor()) return;
  toggle();
});

syncTheme();
syncBars();

if ('MutationObserver' in window) {
  const mo = new MutationObserver(syncTheme);
  mo.observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const cream = document.getElementById('cream');
  if (cream) mo.observe(cream, { attributes: true, attributeFilter: ['style'] });
}

window.SiteSound = {
  btn,
  muted: () => off,
  setActive,
  pulse,
  syncTheme,
  onChange: fn => listeners.add(fn),
  intercept: fn => { interceptor = fn; },
};

/* ---------- sunetele de click (Web Audio) ---------- */
const Ctx = window.AudioContext || window.webkitAudioContext;
if (!Ctx) return;
let ctx = null, master = null;

function play(name) {
  const s = SOUNDS[name];
  if (!s || off || document.hidden) return;
  if (!ctx) {
    ctx = new Ctx();
    // un filtru taie partea ascutita, ca sunetul sa ramana rotund
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2400;
    master = ctx.createGain(); master.gain.value = VOLUME;
    master.connect(soft); soft.connect(ctx.destination);
  }
  const emit = () => {
    const t = ctx.currentTime + 0.005, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(s.f0, t);
    osc.frequency.exponentialRampToValueAtTime(s.f1, t + s.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(s.gain, t + 0.008);          // porneste lin, fara pocnet
    g.gain.exponentialRampToValueAtTime(0.0001, t + s.dur + 0.03);   // si se stinge lin
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + s.dur + 0.05);
    pulse(Math.max(360, Math.round((s.dur + 0.08) * 1000) + 120));
  };
  // 'suspended' = inca nepornit; pe iPhone, dupa ce iesi din browser si te intorci, starea e 'interrupted'.
  // In ambele cazuri sunetul trebuie repornit, altfel click-urile raman mute pana la reincarcarea paginii.
  if (ctx.state !== 'running') ctx.resume().then(emit, () => {});
  else emit();
}

// ce sunet are fiecare lucru pe care dai click
function pick(target) {
  const lb = target.closest('#lb');
  const el = target.closest('a[href],button,[role="button"],[role="tab"]');
  if (!el) return lb && (target === lb || target.id === 'lbStage') ? 'close' : null;   // click pe langa poza o inchide
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return null;
  if (el.id === 'music' || el.id === 'start') return null;           // acolo porneste / se opreste chiar sunetul
  if (el.matches('#lb .x,.sheet .close')) return 'close';
  if (el.closest('.seg') || el.matches('.pin,.mpin-wrap,.city,.ecity-wrap,.mob-item')) return 'select';
  if (el.matches('.gal button,.stop-media button')) return 'open';
  if (lb) return 'select';                                           // sagetile din vizualizatorul de poze
  if (el.matches('a[href]')) {
    const href = el.getAttribute('href');
    if (href.startsWith('#') || href.startsWith('mailto:') || el.target === '_blank') return 'tap';
    return 'go';
  }
  return 'tap';
}
document.addEventListener('click', e => {
  if (!(e.target instanceof Element)) return;
  const name = pick(e.target);
  if (name) play(name);
}, true);
// Escape inchide vizualizatorul de poze sau meniul: acelasi sunet ca butonul de inchidere
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.querySelector('#lb.open,#sheet.open')) play('close');
}, true);
window.SFX = { play };
})();
