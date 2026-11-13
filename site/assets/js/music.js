/* Muzica de la intro (assets/audio/music.mp3). Canta o singura data: de la logo pana se termina textul care se scrie.
   Fisierul e deja mixat: incepe incet si "de dupa perete", creste 3 secunde si la secunda 3.05 intra tare.
   Porneste in timpul sunetului de la logo, astfel incat intrarea tare cade exact cand se termina logoul.
   Cand apar coloanele (intro-ul s-a terminat sau a fost sarit), muzica se stinge lin.
   Butonul de sunet din stanga jos (gestionat de sfx.js) ramane pe tot site-ul si controleaza si muzica si SFX-urile. */
(() => {
// Muzica de intro exista doar o data pe sesiune, pe prima pagina.
if (document.body.dataset.page !== 'home' || window.ERASMUS_SKIP_INTRO) return;

const FILE = 'assets/audio/music.mp3';
const LOGO_AT = 2.30;    // secunda din animatia logoului la care porneste muzica (logoul tine 5.35 s; 2.30 + 3.05 = 5.35)
const VOLUME = 1;        // 1 = cum e in fisier (cam cat sunetul logoului); 0.5 = la jumatate. Pe iPhone volumul nu se poate schimba de aici.
const FADE_OUT = 3500;   // in cate milisecunde se stinge cand apar coloanele (pe iPhone se opreste la final, fara stingere)

const sound = window.SiteSound;
let off = sound ? sound.muted() : false;
try { if (!sound) off = localStorage.getItem('erasmus-music-off') === '1'; } catch (e) {}

const audio = new Audio();
audio.preload = off ? 'none' : 'auto'; audio.volume = VOLUME; audio.src = FILE;

let wanted = false;     // a venit momentul in care muzica porneste
let unlocked = false;   // browserul a lasat deja acest sunet sa porneasca
let leaving = false;    // se stinge
let done = false;       // s-a terminat: nu mai porneste

function syncBars() {
  if (!sound) return;
  const la = window.logoAnim;
  const logoOn = !!(la && la.snd && !la.snd.paused && !la.snd.muted && !la.snd.ended && la.clock && la.clock.playing && !off);
  const musicOn = !done && !off && !audio.paused && !audio.muted && audio.volume > 0.01;
  sound.setActive('logo', logoOn);
  sound.setActive('music', musicOn);
}
audio.addEventListener('play', syncBars);
audio.addEventListener('pause', syncBars);

function tryPlay() {
  if (!wanted || off || done || leaving || document.hidden || !audio.paused) return;
  // browserele nu lasa sunetul sa porneasca singur: daca e blocat, porneste la primul click / prima tasta
  const p = audio.play();
  if (p && p.catch) p.catch(() => {});
}
function start() { wanted = true; tryPlay(); }
function finish() {
  if (done) return;
  done = true; audio.pause(); audio.removeAttribute('src');
  if (sound) { sound.setActive('music', false); sound.setActive('logo', false); }
}
function fadeOut() {
  if (done || leaving) return;
  leaving = true;
  if (sound) sound.setActive('logo', false);
  if (audio.paused) { setTimeout(finish, 400); return; }
  const v0 = audio.volume, t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / FADE_OUT);
    audio.volume = v0 * (1 - k) * (1 - k);
    syncBars();
    if (k < 1) requestAnimationFrame(step); else finish();
  };
  requestAnimationFrame(step);
  setTimeout(finish, FADE_OUT + 800);   // si daca tab-ul e ascuns si animatia nu mai ruleaza
}
audio.addEventListener('ended', finish);

// La primul click, sunetul e "deblocat" pe mut, ca sa poata porni mai tarziu exact la momentul lui.
function unlock() {
  if (unlocked || off || done) return;
  unlocked = true; audio.muted = true;
  const ready = () => {
    if (!wanted && !done) { audio.pause(); try { audio.currentTime = 0; } catch (e) {} }
    audio.muted = false; syncBars();
  };
  const p = audio.play();
  if (p && p.then) p.then(ready, () => { audio.muted = false; unlocked = false; }); else ready();
}
['pointerup', 'click', 'keydown'].forEach(type => addEventListener(type, e => {
  if (done || (e.target instanceof Element && e.target.closest('#music'))) return;
  if (wanted) tryPlay(); else unlock();
}, true));

if (sound) {
  sound.intercept(() => {
    if (done || leaving || off || !wanted || !audio.paused) return false;
    tryPlay();
    return true;
  });
  sound.onChange(muted => {
    off = muted;
    const la = window.logoAnim;
    if (la && la.snd) la.snd.muted = off;
    if (off) audio.pause();
    else if (!done && !leaving) {
      if (wanted) tryPlay(); else unlock();
    }
    syncBars();
  });
}

// cand pleci din tab, muzica face pauza; cand te intorci, continua
document.addEventListener('visibilitychange', () => { if (done) return; if (document.hidden) audio.pause(); else tryPlay(); });

// Urmareste intro-ul: porneste cand logoul ajunge la LOGO_AT (sau cand e sarit), schimba stilul cand dispare fundalul crem si se stinge cand apar coloanele.
const watch = () => {
  if (done) return;
  const la = window.logoAnim, hero = document.getElementById('hero');
  const state = hero ? hero.className : '';
  if (sound) sound.syncTheme();
  if (la && la.snd && la.snd.muted !== off) la.snd.muted = off;
  if (/\bis-cols\b/.test(state) || document.body.dataset.page !== 'home') { fadeOut(); return; }
  if (!wanted && ((la && la.ready && la.ready() && la.clock && la.clock.t >= LOGO_AT) || /\bis-(hero|seq)\b/.test(state))) start();
  syncBars();
  requestAnimationFrame(watch);
};
requestAnimationFrame(watch);
})();
