/* Cele opt fragmente video sunt folosite pe prima pagina si pe paginile din meniu. */
(() => {
const background = document.getElementById('bg') || document.querySelector('.fundal');
if (!background) return;
background.id = 'bg';
if (!background.querySelector('.img')) background.insertAdjacentHTML('afterbegin', '<div class="img"></div>');
if (!background.querySelector('#dim')) background.insertAdjacentHTML('beforeend', '<div class="shade"></div><div class="vig"></div><div class="dim" id="dim"></div>');
// Straturile de peste video (vezi site.css): cele doua "imbracaminti" ale fundalului, cea a primei pagini
// (umbra, vigneta, intunecare) si cea a paginilor din interior, care se topesc una in alta; deasupra, blurul de sub coloane.
if (!background.querySelector('.looks')) {
  const make = name => { const layer = document.createElement('div'); layer.className = name; return layer; };
  const looks = make('looks'), home = make('look-home');
  home.append(...['.shade', '.vig', '.dim'].map(selector => background.querySelector(selector)));
  looks.append(home, make('look-page'));
  background.append(looks, make('blur'));
}
background.classList.add('ready');
if (!document.getElementById('bgv0')) {
  background.insertAdjacentHTML('beforeend', `
    <video id="bgv0" class="bgv off" muted playsinline preload="metadata"></video>
    <video id="bgv1" class="bgv off" muted playsinline preload="none"></video>`);
}
const vids = [document.getElementById('bgv0'), document.getElementById('bgv1')];
if (!vids[0] || !vids[1]) return;

const storageKey = 'erasmus-background-video';
let resume;
try { resume = JSON.parse(sessionStorage.getItem(storageKey)); } catch (e) {}
const canResume = Number.isInteger(resume?.clip) && resume.clip >= 0 && resume.clip < 8 &&
  Number.isFinite(resume.time) && resume.time >= 0;
let base = 'media/';
const clipUrl = i => `${base}fundal-${(i % 8) + 1}.mp4`;
let active = 0, clip = canResume ? resume.clip : Math.floor(Math.random() * 8);
let playing = false, available = true, switching = false, prepared = false, startTime = 0;

function show(video) {
  background.classList.add('has-video');
  video.classList.remove('off');
}
const initial = vids[0];
initial.addEventListener('loadedmetadata', () => {
  const duration = initial.duration;
  if (!Number.isFinite(duration)) return;
  startTime = canResume ? Math.min(resume.time, Math.max(0, duration - 0.5)) : Math.random() * Math.max(0, duration - 10);
  initial.currentTime = startTime;
}, { once: true });
function showInitial() {
  if (initial.seeking || initial.currentTime < startTime - 0.5) return;
  show(initial);
  initial.removeEventListener('timeupdate', showInitial);
  initial.removeEventListener('seeked', showInitial);
}
initial.addEventListener('timeupdate', showInitial);
initial.addEventListener('seeked', showInitial);

function load(video, i) {
  video.dataset.clip = i;
  video.src = clipUrl(i);
  video.load();
}
function advance() {
  if (switching) return;
  switching = true;
  const current = vids[active], next = vids[1 - active];
  const swap = () => {
    next.style.zIndex = 2;
    current.style.zIndex = 1;
    show(next);
    active = 1 - active;
    clip = (clip + 1) % 8;
    setTimeout(() => {
      current.classList.add('off');
      current.pause();
      load(current, clip + 1);
      switching = false;
    }, 450);
  };
  next.currentTime = 0;
  if (playing) next.play().catch(() => {});
  if (next.readyState >= 3) swap();
  else next.addEventListener('canplay', swap, { once: true });
}
vids.forEach((video, index) => {
  video.addEventListener('timeupdate', () => {
    if (playing && index === active && video.duration && video.duration - video.currentTime < 0.45) advance();
  });
  video.addEventListener('ended', () => { if (playing && index === active) advance(); });
  video.addEventListener('error', () => {
    if (video.getAttribute('src')?.startsWith('media/')) {
      base = '../site/media/';
      load(video, Number(video.dataset.clip));
      if (playing && index === active) video.play().catch(() => {});
    } else if (index === active) available = false;
  });
});
initial.dataset.clip = clip;
initial.src = clipUrl(clip);

function play(on) {
  if (!available || on === playing) return;
  playing = on;
  const video = vids[active];
  if (!on) { video.pause(); return; }
  video.play().catch(() => {});
  if (!prepared) {
    prepared = true;
    vids[1].preload = 'auto';
    load(vids[1], clip + 1);
    setTimeout(() => {
      if (active === 0 && !initial.paused && initial.readyState >= 2 && !initial.seeking) show(initial);
    }, 2500);
  }
}
function remember() {
  const video = vids[active];
  if (video.readyState < 2 || video.seeking) return;
  try { sessionStorage.setItem(storageKey, JSON.stringify({clip, time: video.currentTime})); } catch (e) {}
}
addEventListener('pagehide', remember);
addEventListener('pageshow', event => {
  if (event.persisted && playing) vids[active].play().catch(() => {});
});
let fadingTimer = 0;
function setPage(page) {
  // Cele doua "imbracaminti" ale fundalului se amesteca doar cat dureaza trecerea dintre prima pagina si celelalte (.fading).
  // In rest ramane doar cea vizibila: amestecul lor peste video costa la fiecare cadru (vezi site.css).
  if (background.classList.contains(page === 'home' ? 'fundal' : 'bg')) {
    background.classList.add('fading');
    clearTimeout(fadingTimer); fadingTimer = setTimeout(() => background.classList.remove('fading'), 900);
  }
  background.classList.toggle('bg', page === 'home');
  background.classList.toggle('fundal', page !== 'home');
  if (page !== 'home') play(true);
}
window.backgroundVideo = { play, remember, setPage };
setPage(document.body.dataset.page);
})();
