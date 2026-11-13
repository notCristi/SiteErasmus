/* =========================================================
   TOT CONTINUTUL SITE-ULUI E AICI.
   Schimbi textul aici si se schimba pe toate paginile.
   Ce e intre [ ] trebuie completat.
   ========================================================= */
window.SITE = {

  project: {
    name: 'United in Diversity, Stronger Through Participation',
    programme: 'Erasmus+',
    code: '2026-1-RO01-KA121-SCH-000448210',
    duration: '[START] to [END]',
    students: '[NR]',          // cati elevi participa in total
    days: '[NR]',              // cate zile am petrecut impreuna
    email: '[email@example.com]',
    instagram: '[@instagram]',
    instagramUrl: '',          // link-ul complet catre Instagram
    // autoritatea care da banii (agentia nationala). In disclaimerul UE apare numele ei.
    grantAuthority: '[the granting authority]',
  },

  // citatul de pe prima pagina
  quote: {
    text: '[A short quote from a student about the project. One or two sentences.]',
    name: '[Name]',
    school: 'Colegiul Național „Johannes Honterus”',
  },

  // cele trei scoli (ordinea = ordinea mobilitatilor)
  schools: [
    {
      id: 'fr', n: '01', name: 'Cours Secondaire d\'Orsay', city: 'Orsay', country: 'France',
      url: '',   // site-ul scolii
      address: '11 rue de Courtaboeuf, 91400 Orsay, France',
      text: 'A school in Orsay, a small town south of Paris. It has a primary school, a middle school and a high school in one place.',
      teacher: '[Name]', students: '[NR]', date: '[DATE]',
    },
    {
      id: 'dk', n: '02', name: 'Fjerritslev Gymnasium', city: 'Fjerritslev', country: 'Denmark',
      url: 'https://www.fjerritslev-gym.dk/english/',
      address: 'Skovbrynet 9, 9690 Fjerritslev, Denmark',
      text: 'An upper secondary school with around 300 students. It is in the north of Denmark, between the North Sea and the Limfjord.',
      teacher: '[Name]', students: '[NR]', date: '[DATE]',
    },
    {
      id: 'ro', n: '03', name: 'Colegiul Național „Johannes Honterus”', city: 'Brașov', country: 'Romania',
      url: '',   // site-ul scolii
      address: 'Curtea Honterus 3, 500025 Brașov, Romania',
      text: 'One of the oldest schools in Romania. Johannes Honterus started it in 1541, in the old town of Brașov.',
      teacher: '[Name]', students: '[NR]', date: '15 Nov 2026',
    },
  ],

  // oamenii din spatele proiectului (pagina About)
  team: [
    { name: '[Name]', role: 'Coordinating teacher', org: 'Cours Secondaire d\'Orsay' },
    { name: '[Name]', role: 'Coordinating teacher', org: 'Fjerritslev Gymnasium' },
    { name: '[Name]', role: 'Coordinating teacher', org: 'Colegiul Național „Johannes Honterus”' },
    { name: 'Website team', role: 'Design and code', org: 'Students of Colegiul Național „Johannes Honterus”' },
  ],

  /* -------------------------------------------------------
     MOBILITATILE + LOCURILE DE PE HARTA
     lat / lon = coordonatele locului (din Google Maps: click dreapta pe loc)
     media = pozele si video-urile de la locul respectiv:
       { type: 'photo', src: 'media/poze/prejmer-1.jpg', caption: '...' }
       { type: 'video', src: 'media/video/prejmer.mp4', poster: 'media/poze/prejmer.jpg', caption: '...' }
       { type: 'video', embed: 'https://drive.google.com/file/d/ID/preview', caption: '...' }   (Google Drive / YouTube)
     Cat timp src e gol, apare un loc gol frumos in locul pozei.
     ------------------------------------------------------- */
  mobilities: [
    {
      id: 'fr', n: '01', city: 'Orsay', country: 'France', date: '[DATE]',
      labels: [{ t: 'Orsay', lat: 48.70, lon: 2.20 }, { t: 'Paris', lat: 48.862, lon: 2.36 }],
      stops: [
        { id: 'fr-school', title: 'Cours Secondaire d\'Orsay', when: 'Day 1 · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 48.6958, lon: 2.1905, media: 'pppvpp' },
        { id: 'fr-2', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 48.8566, lon: 2.3522, media: 'ppvpp' },
        { id: 'fr-3', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 48.8049, lon: 2.1204, media: 'pppp' },
      ],
    },
    {
      id: 'dk', n: '02', city: 'Fjerritslev', country: 'Denmark', date: '[DATE]',
      labels: [{ t: 'Fjerritslev', lat: 57.075, lon: 9.30 }, { t: 'North Sea coast', lat: 57.18, lon: 9.12 }, { t: 'Limfjord', lat: 56.99, lon: 9.30 }],
      stops: [
        { id: 'dk-school', title: 'Fjerritslev Gymnasium', when: 'Day 1 · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 57.0849, lon: 9.2655, media: 'ppvppp' },
        { id: 'dk-2', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 57.1390, lon: 9.2200, media: 'pvpp' },
        { id: 'dk-3', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 57.0460, lon: 9.4300, media: 'ppp' },
      ],
    },
    {
      id: 'ro', n: '03', city: 'Brașov', country: 'Romania', date: '15 Nov 2026',
      labels: [{ t: 'Brașov', lat: 45.655, lon: 25.60 }, { t: 'Tâmpa', lat: 45.627, lon: 25.602 }, { t: 'Prejmer', lat: 45.728, lon: 25.776 }],
      stops: [
        { id: 'ro-school', title: 'Colegiul Național „Johannes Honterus”', when: 'Monday · Welcome protocol', text: '[What we did here, in one or two sentences.]', lat: 45.6406, lon: 25.5878, media: 'pppvppp' },
        { id: 'ro-old-town', title: 'Old town', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 45.6426, lon: 25.5886, media: 'ppvpp' },
        { id: 'ro-prejmer', title: 'Prejmer fortified church', when: 'Guided tour in English', text: '[What we did here, in one or two sentences.]', lat: 45.7224, lon: 25.7718, media: 'pppvp' },
        { id: 'ro-4', title: '[Place]', when: 'Day [N] · [DATE]', text: '[What we did here, in one or two sentences.]', lat: 45.6356, lon: 25.5960, media: 'pppp' },
      ],
    },
  ],

  /* -------------------------------------------------------
     JURNALUL: cel mai nou primul
     body = paragrafele articolului
     ------------------------------------------------------- */
  journal: [
    { id: 'prejmer-in-english', mob: 'ro', day: 'Day [N]', date: '[DATE]', title: 'Prejmer, in English',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]', '[Second paragraph.]', '[Third paragraph.]'] },
    { id: 'welcome-to-honterus', mob: 'ro', day: 'Day 1', date: '[DATE]', title: 'Welcome to Honterus',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]', '[Second paragraph.]', '[Third paragraph.]'] },
    { id: 'dk-entry-2', mob: 'dk', day: 'Day [N]', date: '[DATE]', title: '[Title of the entry]',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]', '[Second paragraph.]'] },
    { id: 'dk-entry-1', mob: 'dk', day: 'Day 1', date: '[DATE]', title: '[Title of the entry]',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]', '[Second paragraph.]'] },
    { id: 'fr-entry-2', mob: 'fr', day: 'Day [N]', date: '[DATE]', title: '[Title of the entry]',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]', '[Second paragraph.]'] },
    { id: 'fr-entry-1', mob: 'fr', day: 'Day 1', date: '[DATE]', title: '[Title of the entry]',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]', '[Second paragraph.]'] },
    { id: 'fr-entry-0', mob: 'fr', day: 'Before the trip', date: '[DATE]', title: '[Title of the entry]',
      excerpt: '[Two lines about the day. What we saw, what we learned, how it felt.]', author: '[Name]', min: '[NR]',
      body: ['[First paragraph of the story.]'] },
  ],
};

/* ---------- de aici in jos nu trebuie schimbat nimic ---------- */
(() => {
  const S = window.SITE;
  // media scrise scurt ('ppvp' = poza, poza, video, poza) devin locuri goale pentru poze
  for (const m of S.mobilities) {
    for (const st of m.stops) {
      if (typeof st.media === 'string') {
        st.media = [...st.media].map((c, i) => ({ type: c === 'v' ? 'video' : 'photo', src: '', caption: `${c === 'v' ? 'Video' : 'Photo'} ${i + 1} · ${st.title}` }));
      }
      st.media.forEach(md => { md.mob = m.id; md.stop = st.id; md.place = st.title; md.city = m.city; });
    }
  }
  S.mob = id => S.mobilities.find(m => m.id === id);
  S.school = id => S.schools.find(s => s.id === id);
  S.allMedia = () => S.mobilities.flatMap(m => m.stops.flatMap(st => st.media));
})();
